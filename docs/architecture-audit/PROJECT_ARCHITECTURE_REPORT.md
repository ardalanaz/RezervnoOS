# PROJECT_ARCHITECTURE_REPORT — رزرونو

> ممیزیِ معماریِ کلِ پروژه از اصولِ اول. مبتنی بر خواندنِ واقعیِ ساختار + جاروبِ الگویی.
> تاریخ: ۲۰۲۶-۰۷-۳۰. **حوزه: ممیزی/مستندسازی — بدونِ refactorِ کور.**

---

## ۰) خلاصه

مونو-ریپو با **چهار deploy-unit**: سه فرانتِ استاتیکِ Vanilla-JS (`apps/customer`, `apps/business`,
`apps/company`) و یک بک‌اندِ Next.js 14 (`api/`). جداسازیِ deploy تمیز است؛ بک‌اند لایه‌بندیِ
Controller→Service→Data دارد. **دو ضعفِ ساختاریِ واقعی**: (۱) تکرارِ کدِ مشترک بینِ سه فرانت
(`analytics.js` و API client — توجه: `icons.js` و CSS از قبل از طریقِ `sync-design-system.sh`
تک‌منبع‌اند) به‌خاطرِ نبودِ build/bundler، (۲) ناهمگونیِ الگوی ماژول (ES-module در
customer، global-script در business/company).

**نمره‌ی ساختارِ پروژه: ۷.۵ / ۱۰**

## ۱) ساختارِ ریشه
```
apps/customer   ← اپ مشتری (ES Modules، entry: js/main.js) — Vercel: rezervno-deploy
apps/business   ← پنل کسب‌وکار (global <script>) — Vercel: rezervno-os-h245
apps/company    ← پنل شرکت (global <script>) — Vercel: rezervno-os-23pl
api/            ← بک‌اند Next.js 14 + Prisma + Redis (Root Directory=api) — پروژه‌ی جدا
shared/css/     ← منبعِ واحدِ توکن‌های دیزاین (tokens/foundation/ds-bridge)
tools/          ← sync-design-system.sh (همگام‌سازیِ shared→apps + drift-check CI)
e2e/            ← تست‌های Playwright (فقط اپ مشتری)
docs/           ← مستندات (شاملِ backend-audit/ و این پوشه)
infra/          ← زیرساخت (docker/nginx/monitoring)
.vercelignore   ← ریشه: api و infra را ignore می‌کند (الزامِ Vercel)
```

## ۲) جداسازیِ دامنه (Domain Separation)
دامنه‌های کسب‌وکار در بک‌اند در `api/src/lib/*` به‌خوبی تفکیک‌شده‌اند و هر route نازک است:
- **Reservation** (`reservations`, `availability`, `reservation-*`), **Waitlist**, **Restaurant/Tables/Hours**,
  **Customer/CRM** (`guest-profile`, `rfm`, `customer-insights`), **Loyalty/Coupons/GiftCard**,
  **Pricing**, **Marketing/Automation**, **Payment** (`zarinpal`, `subscription`, `sms-balance`),
  **Auth/RBAC** (`jwt`, `permissions`, `admin-auth`, `maintenance-auth`), **Notification** (`notify`, `sms`),
  **AI/Analytics** (`customer-insights`, `fraud`, heuristic).
- **ارزیابی:** دامنه‌ها از طریقِ importِ توابعِ صریح ارتباط می‌گیرند (نه از طریقِ رویداد/باس).
  در این مقیاس قابل‌قبول است؛ برای مقیاسِ میکروسرویس باید به interface/event مهاجرت کند (به
  ARCHITECTURE_AUDIT_FINAL بخشِ roadmap).

## ۳) مرزهای ماژول و جهتِ وابستگی
- **بک‌اند:** جهت درست است — `route.ts` (کنترلر) → `lib/*` (سرویس/دامنه) → `db`/`redis` (زیرساخت).
  کنترلرها نازک‌اند؛ منطقِ کسب‌وکار در `lib`. wrapperهای `withRestaurantAuth`/`withStaffAuth`
  cross-cutting concerns را متمرکز کرده‌اند (نه تکرار در هر route).
- **فرانت‌ها:** customer گرافِ ES-module صریح دارد (`main.js` تنها entry). business/company با
  ترتیبِ `<script>` سراسری کار می‌کنند (وابستگیِ ضمنیِ ترتیب — شکننده‌تر).

## ۴) تکرارِ کد (یافته‌ی کلیدی — شواهد)
| فایل | customer | business | company | وضعیت |
|------|----------|----------|---------|-------|
| `icons.js` | ۹۷ خط | ۹۷ خط | ۹۷ خط | ✅ **از قبل single-source** (`shared/js/icons.js` + sync + drift-check) — نه تکرار |
| `analytics.js` | ۷۷ خط (ES) | ۷۰ خط | ۷۰ خط | **duplicateِ واقعیِ پارامتریک** (خارج از sync؛ ثابت‌های per-app + فرمِ ES/IIFE) |
| API client | `api.js` | داخلِ `data.js` | `api.js` | **۳ پیاده‌سازیِ جدا** |
| `overview.js`/`waitlist.js`/`loyalty.js`/`chat.js` | — | ✓ | ✓/جزئی | همپوشانیِ منطق بینِ پنل‌ها |

- **علتِ ریشه‌ای:** نبودِ build/bundler + مرزِ ES-module (customer) در برابر global-script
  (business/company) → نمی‌توان یک ماژولِ مشترک را به‌سادگی در هر سه import کرد.
- **آن‌چه از قبل حل شده:** توکن‌های دیزاین (CSS) از طریقِ `tools/sync-design-system.sh` **تک‌منبع**اند
  (drift-check در CI). پس تکرارِ CSSِ پایه وجود ندارد.
- **توصیه:** به ARCHITECTURE_CONSOLIDATION_REPORT (برنامه‌ی ادغامِ ایمن و تدریجی) رجوع شود.
  **بدونِ build، ادغامِ JS بینِ سه اپ یک تغییرِ متوسط-تا-بزرگ است، نه merge سریع — کور انجام نشد.**

## ۵) نام‌گذاری و پیکربندی
- نام‌گذاری یکدست و توصیفی (فارسیِ کامنت‌محور). نسخه‌بندیِ API صریح (`/api/v1`).
- پیکربندی: `.env.example` کامل (۳۹ متغیرِ مستند)؛ `vercel.json` (crons/regions)؛ `.vercelignore` ریشه.

## ۶) نمره‌ها (زیرمجموعه)
| بعد | نمره | دلیل |
|-----|------|------|
| جداسازیِ دامنه (بک‌اند) | ۹.۰ | lib تفکیک‌شده، کنترلرِ نازک |
| جهتِ وابستگی | ۹.۰ | route→lib→infra، بدونِ چرخه‌ی مشکل‌ساز |
| مرزِ ماژولِ فرانت | ۶.۵ | customer عالی؛ business/company global-script |
| نبودِ تکرار | ۶.۰ | تکرارِ icons/analytics/api-client بینِ اپ‌ها |
| پیکربندی/نام‌گذاری | ۸.۵ | مستند و یکدست |
