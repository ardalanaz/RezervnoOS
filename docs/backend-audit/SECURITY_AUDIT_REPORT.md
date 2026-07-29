# SECURITY_AUDIT_REPORT — رزرونو

> ممیزیِ امنیتیِ سطح-enterprise. مبتنی بر خواندنِ واقعیِ کدِ امنیتی + جاروبِ الگویی روی کلِ بک‌اند.
> تاریخ: ۲۰۲۶-۰۷-۲۹. حوزه: فقط ممیزی — هیچ کدی تغییر نکرد.

---

## ۰) خلاصه‌ی مدیریتی

وضعیتِ امنیتی **قوی** است و شواهدِ رعایتِ عمده‌ی OWASP Top 10 در کد دیده می‌شود. هیچ آسیب‌پذیریِ
**بحرانیِ** آشکاری در این جاروب یافت نشد. یافته‌ها عمدتاً در سطحِ «سخت‌سازیِ بیشتر» و «تأییدِ runtime»اند.

**نمره‌ی امنیت: ۸.۸ / ۱۰**

## ۱) احراز هویت و مجوز
- **JWT سخت‌شده** (`lib/jwt.ts`): HS256 صریح (ضدِ `alg:none`/confusion)، `iss/aud` الزامی، secret جدا
  برای access/refresh، حداقل‌طولِ ۳۲ کاراکترِ secret (fail-fast)، `jti` برای revocation، ۱۵m/۳۰d. ✅
- **RBAC** (`lib/permissions.ts`): SAFE_DEFAULTS برای staff، رفعِ privilege-escalation مستند. ✅
- **Guard مشترک** روی routeهای staff/admin. ✅

## ۲) کنترلِ دسترسی و مسیرهای عمومی
جاروب: **۵۸ / ۸۲** route از wrapperهای auth استفاده می‌کنند. ۲۱ روتِ «بدونِ auth آشکار» **همه به‌طور
عمدی عمومی یا با اعتبارِ جایگزین محافظت‌شده‌اند** (تأییدشده با خواندنِ فایل):
- `auth/*` (عمومی بالضروره)، `restaurants` و `restaurants/[slug]/availability` (کشفِ عمومی)،
  `events` (فقط `isPublished && آینده`)، `checkin` (اعتبار = دارابودنِ QR)، `payments/callback`
  (تطبیقِ authority+code+amount + `verifyPayment` زرین‌پال)، `maintenance/*` (guardMaintenance:
  `x-maintenance-key` با **timingSafeEqual** یا Cron Bearer)، `health`/`metrics` (ops؛ metrics با METRICS_TOKEN اختیاری).
- **نتیجه:** موردِ Broken-Access-Control یافت نشد.

## ۳) تزریق (Injection)
- **SQL/NoSQL Injection**: **۴۹** استفاده‌ی raw SQL، **۰ مورد** `Unsafe` (همه `$queryRaw`/`$executeRaw`
  با تمپلیتِ پارامتری، مثلِ `${id}::uuid` و `Prisma.join`). سطحِ ریسک **پایین**. ✅
- **Command Injection / Path Traversal**: مسیرِ اجرای شل/فایلِ کاربرمحور در بک‌اند دیده نشد. ✅

## ۴) CSRF / CORS / هدرهای امنیتی (middleware.ts)
- CSRF: چکِ `Origin` روی POST/PATCH/PUT/DELETE در برابرِ `ALLOWED_ORIGINS` + auth مبتنی بر Bearer (نه کوکی) → ذاتاً مقاوم. ✅
- CORS: allowlist صریح، preflight، `Vary: Origin`. ✅
- هدرها: `CSP: default-src 'none'`, `HSTS preload`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store`. ✅
- **fail-fast**: در production بدونِ `ALLOWED_ORIGINS` نخستین درخواست رد می‌شود. ✅

## ۵) Rate-limit / Brute-force
- OTP: per-phone (۳/۱۰m)، per-ip (۱۵/۱۰m)، verify (۸/۱۰m) → ضدِ brute-forceِ کدِ OTP. ✅
- سراسری (۱۲۰/۱m) + ban IP + fallback in-memory هنگام قطعِ Redis. ✅

## ۶) رازها و داده‌ی حساس
- secretها از env (بدونِ hard-code)؛ `.env.example` فقط placeholder دارد (تأییدشده). ✅
- constant-time compare برای maintenance-key. ✅
- **توصیه:** چرخشِ منظمِ JWT secret و مدیریتِ راز با vault در production (فرآیندی، نه کدی).

## ۷) Multi-tenant Isolation
- کوئری‌های staff از طریقِ `resolveStaffRestaurant`/`tenantId` scope می‌شوند + **RLS در DB** (`023-rls`).
- **یافته‌ی سطح-متوسط (تأییدِ لازم):** پوششِ RLS باید روی **همه‌ی** جداولِ چندمستأجری تأیید شود
  (مهاجرت `023` «new tables» است — باید مطمئن شد جدولِ قدیمی‌تری بدونِ RLS نمانده). این تأیید نیازمندِ
  اجرای کوئریِ `pg_policies` روی DB واقعی است (در این ممیزیِ استاتیک انجام نشد).

## ۸) پرداخت (Zarinpal)
- `payments/callback` طبقِ مستنداتِ زرین‌پال: اگر کاربر انصراف داد verify صدا زده نمی‌شود؛ تطبیقِ
  authority+amount قبل از verify؛ idempotency روی پرداخت. ✅
- **توصیه:** لاگِ حسابرسیِ کاملِ تراکنش‌های پرداخت (مبلغ/authority/نتیجه) برای مغایرت‌گیری.

## ۹) OWASP Top 10 (خلاصه‌ی وضعیت)
| ریسک | وضعیت |
|------|-------|
| A01 Broken Access Control | کنترل‌شده (guard+RBAC+RLS) — تأییدِ پوششِ RLS توصیه‌شده |
| A02 Cryptographic Failures | خوب (HS256 سخت، HSTS، secret از env) |
| A03 Injection | خوب (۰ raw ناایمن) |
| A04 Insecure Design | خوب (دفاعِ چندلایه، fail-safe) |
| A05 Security Misconfiguration | خوب (fail-fast origins، هدرها) |
| A06 Vulnerable Components | `npm audit` در CI (اسکریپت `audit`) — پایشِ مداوم توصیه |
| A07 Auth Failures | خوب (rate-limit OTP، jti، constant-time) |
| A08 Data Integrity | خوب (idempotency، exclusion/serializable) |
| A09 Logging/Monitoring | خوب (logger/metrics/trace/audit) — alerting توصیه |
| A10 SSRF | `ALLOW_PRIVATE_WEBHOOKS` نشان‌دهنده‌ی گاردِ SSRF روی webhookهاست — تأییدِ منطقِ آن توصیه |

## ۱۰) یافته‌های اولویت‌دار
| # | یافته | شدت | اقدام |
|---|-------|-----|-------|
| S1 | تأییدِ پوششِ RLS روی همه‌ی جداولِ tenant (runtime) | متوسط | کوئریِ `pg_policies` روی DB |
| S2 | تأییدِ منطقِ ضدِ SSRF در ارسالِ webhook | متوسط | مرورِ `notify`/webhook + `ALLOW_PRIVATE_WEBHOOKS` |
| S3 | alerting روی متریک‌های امنیتی (نرخِ ۴۰۳/۴۲۹/۵۰۳) | متوسط | قاعده در Grafana/Sentry |
| S4 | چرخشِ راز + audit-log کاملِ پرداخت | پایین | فرآیندی |

**هیچ یافته‌ی بحرانی/Highِ کدمحور در این جاروب نبود؛ S1/S2 نیازمندِ تأییدِ runtime‌اند نه نقصِ آشکار.**
