# ADR 0001 — مدلِ رندرِ صفحاتِ عمومیِ SEO

- **وضعیت:** پذیرفته‌شده (۲۰۲۶-۰۷-۳۰)
- **تصمیم‌گیرنده:** صاحبِ محصول (تأییدِ صریح) + معماری
- **زمینه:** پیش از لانچ؛ فرصت داریم پایه را درست بسازیم. مکملِ `SEO_AUDIT_REPORT.md`.

## زمینه و مسئله
اپ‌های فعلیِ فرانت (`apps/customer`, `apps/business`, `apps/company`) **استاتیک،
بدونِ build، و SPA تک‌URL با رندرِ سمتِ کلاینت‌اند.** برای SEOِ یک marketplaceِ
کشف/رزرو (رقابت با OpenTable/Resy/TheFork)، به موارد زیر نیاز داریم که در معماریِ
فعلی ممکن نیست:
- URLهای مجزا و crawlable برای هر رستوران/شهر/آشپزی (`/r/{slug}`, `/city/{c}`, `/cuisine/{c}`)
- HTMLِ **سمتِ سرور** با محتوای واقعی (خزنده و AI-search محتوا را ببینند)
- Restaurant/LocalBusiness/AggregateRating/Breadcrumb schema از دادهٔ واقعی
- sitemap پویا و مقیاس‌پذیر

## تصمیم
یک اپِ **جداگانه‌ی Next.js** (App Router، **SSR + ISR**) به‌نامِ **`apps/seo`** ساخته
می‌شود که فقط **صفحاتِ عمومی/SEO** را سرو می‌کند. یک **پروژه‌ی Vercelِ مستقل**
(Root Directory = `apps/seo`) است و دادهٔ خود را از همان `api/` می‌گیرد.

- اپ‌های `customer/business/company` **بدونِ تغییر** می‌مانند (همان static/no-build).
  اپِ رزرو/حسابِ کاربری همان SPA است؛ صفحاتِ SEO فقط «ویترینِ» ایندکس‌پذیرند که
  با CTA به مسیرِ رزروِ SPA لینک می‌دهند.
- **ISR** انتخاب شد (نه صرفاً SSG) تا صفحات با revalidate دوره‌ای تازه بمانند بدونِ
  rebuildِ کامل — مناسبِ کاتالوگِ بزرگ و داده‌ی نیمه‌پویا.
- مسیردهی: صفحاتِ SEO روی **همان دامنه‌ی اصلی** (path-based، برای link-equity) از طریقِ
  Vercel rewrites؛ جزئیاتِ نهاییِ routing در فازِ پیاده‌سازی قطعی می‌شود.

## چرا این گزینه (و نه دو گزینه‌ی دیگر)
- **بی‌آسیب/ایزوله:** پروژه‌ی مستقل؛ خرابی‌اش به اپ‌های زنده سرایت نمی‌کند. اصلِ «به پروژه آسیب نزن».
- **قوی‌ترین و استانداردِ صنعت:** همان مدلِ OpenTable/Resy؛ تنها راهِ رقابتِ واقعی در SEO/AI-search.
- گزینه‌ی «SSG در همان معماری» build step را به اپ‌های استاتیکِ فعلی تحمیل می‌کرد و برای دادهٔ پویا ضعیف بود.
- گزینه‌ی «prerender فقط برای بات‌ها» شکننده و از نظرِ کیفیت پایین‌تر بود.

## پیش‌نیازها (وابستگی‌های سخت — قبل از محتوای واقعی)
1. **دادهٔ مکانی در DB:** افزودنِ `address, latitude, longitude, city, district,
   priceRange, amenities[]` به مدلِ `Restaurant` (migration = high-risk → PR جدا + تأیید).
2. **در دسترس بودنِ API:** رفعِ ۴۰۴ی Vercel (تنظیمِ داشبورد — `docs/DEPLOY_API_VERCEL.md`).
3. دادهٔ واقعیِ رستوران (فعلاً فقط دمو).

## نقشه‌ی راهِ پیاده‌سازی (تدریجی، تست‌محور، merge-on-green)
- **P1 (همین ADR):** ثبتِ تصمیم + به‌روزرسانیِ CLAUDE.md.
- **P2:** migration دادهٔ مکانیِ `Restaurant` + ویرایشِ پنلِ شرکت برای واردکردنشان (high-risk → PR + تأیید).
- **P3:** اسکلتِ `apps/seo` (Next.js، لینت/تایپ‌چک/CI، یک صفحه‌ی health).
- **P4:** صفحه‌ی `/r/{slug}` با SSR/ISR + Restaurant/LocalBusiness/AggregateRating/Breadcrumb schema از API.
- **P5:** صفحاتِ `/city/{c}` و `/cuisine/{c}` با گاردِ کیفیت (حداقل تعداد، محتوای یکتا) تا thin/spam نشود.
- **P6:** sitemap پویا از DB + internal linking داده‌محور + FAQ/AI-search.
- **P7:** i18n/hreflang + پایشِ خودکار (index/schema/CWV).

## پیامدها
- یک پروژه‌ی Vercelِ جدید + یک build step (فقط برای `apps/seo`؛ بقیه همچنان no-build).
- CI باید jobهای lint/typecheck/build را برای `apps/seo` هم اجرا کند.
- «تک‌منبعِ حقیقت» همچنان `shared/` برای دارایی‌های مشترک؛ اپِ SEO می‌تواند توکن‌های CSS را از همان‌جا بگیرد.
