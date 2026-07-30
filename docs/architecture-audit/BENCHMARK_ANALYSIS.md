# BENCHMARK_ANALYSIS — رزرونو

> مقایسه‌ی صادقانه‌ی معماری/تجربه با استانداردهای صنعت. تاریخ: ۲۰۲۶-۰۷-۳۰.
> **هشدارِ صداقت:** این تحلیلِ کیفیِ مبتنی بر معماریِ عمومیِ رقباست، نه بنچمارکِ عددیِ اجراشده.
> ادعای «از همه بهتریم» نمی‌کنیم؛ نقاطِ برتری و عقب‌ماندگیِ واقعی را نشان می‌دهیم.

---

## ۱) دامنه‌ی رقبا
- **رزرو/میهمان‌داری:** OpenTable, Resy, SevenRooms, TheFork, Quandoo, Eat App
- **POS/عملیاتِ رستوران:** Toast, Square, Lightspeed, Oracle Simphony, TouchBistro
- **کیفیتِ محصول/زیرساخت (الگو):** Linear, Notion, Stripe, Shopify

## ۲) جایی که رزرونو قوی است ✅
| حوزه | رزرونو | مبنا |
|------|--------|------|
| ضدِ double-booking | **لایه‌ی DBِ چندگانه** (EXCLUDE + Serializable + retry + Redis lock) | قوی‌تر از رزروِ صرفاً app-level که بعضی رقبای کوچک دارند |
| Multi-tenant isolation | RLS در سطحِ DB + tenant-scoped queries | سطحِ enterprise |
| اپ مشتریِ موبایل | PWA، ES-modules، bottom-sheet، pull-to-refresh/swipe، Food-DNA، a11y AA | حس-و-حالِ مدرن نزدیک به بهترین‌ها |
| دیزاین‌سیستمِ تک‌منبع | tokens/foundation + icons + analytics-پنل با drift-check | نظم بالا بدونِ bundler |
| هزینه/سادگیِ استقرار | static + serverless (Vercel) بدونِ build سنگین | چابک برای تیمِ کوچک |

## ۳) جایی که رزرونو عقب است ⚠️ (شکاف‌های واقعی)
| حوزه | رقبا دارند | رزرونو | شدت |
|------|-----------|--------|-----|
| POS / صورت‌حساب / آشپزخانه (KDS) | Toast/Square/Lightspeed | ندارد | بالا (اگر «OS رستوران» هدف است) |
| Inventory / انبار | Toast/Lightspeed | ندارد | بالا |
| نقشه/جست‌وجوی مکانی واقعی | OpenTable/Resy | heuristic محلی، بدونِ نقشه | متوسط |
| AI/ML واقعی (توصیه/پیش‌بینی) | SevenRooms (CDP/ML) | heuristic (به AI_PLATFORM_AUDIT) | متوسط |
| i18n / multi-currency / multi-country | همه‌ی جهانی‌ها | ثابت fa/IRR | بالا (برای «global») |
| مقیاسِ صف/رویداد | Stripe/Shopify (broker) | صفِ Postgres | متوسط (>۱۰۰k) |
| Observability بالغ (SLO/alerting/tracing کامل) | Stripe/Linear | متریک/trace هست، alerting/DR ناقص | متوسط |
| بنچمارکِ عددیِ کارایی | — | اجرا نشده (فقط ساختاری) | متوسط |
| Build/bundler فرانت | صنعت | عمداً ندارد (static) | پایین (تصمیمِ آگاهانه) |

## ۴) جمع‌بندیِ رقابتی
- **به‌عنوان یک platformِ رزروِ چابک و امن با اپ مشتریِ مدرن:** رزرونو در سطحِ خوب و در برخی جنبه‌ها
  (موتورِ ضدِ تداخل، RLS، تجربه‌ی PWA) رقابتی است.
- **به‌عنوان یک «Hospitality Operating System» کامل (POS/inventory/kitchen/global):** هنوز فاصله‌ی
  ساختاریِ واقعی دارد — این‌ها ماژول‌های بزرگِ غایب‌اند، نه بهبودهای جزئی.
- **ادعای «از Toast/OpenTable فراتریم» امروز مبتنی بر شواهد نیست.** مسیرِ رسیدن به آن نیازمندِ افزودنِ
  دامنه‌های غایب + AI واقعی + i18n است (نه refactorِ کدِ موجود).

## ۵) توصیه‌ی اولویت‌دار برای برتریِ واقعی
1. تثبیتِ هسته‌ی فعلی (رزرو/CRM/باشگاه) + عملیات (DR/alerting/load-test).
2. انتخابِ **یک تمایزِ برنده** (مثلاً تجربه‌ی مشتریِ Gen-Z + باشگاهِ کش‌بک) و عمیق‌کردنِ آن، به‌جای رقابتِ
   عرضی با POSهای بالغ.
3. افزودنِ دامنه‌های غایب فقط اگر مدلِ کسب‌وکار آن‌ها را می‌طلبد (POS/inventory سرمایه‌گذاریِ بزرگ‌اند).
