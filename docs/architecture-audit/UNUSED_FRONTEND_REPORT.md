# UNUSED_FRONTEND_REPORT — رزرونو

> تشخیصِ فرانتِ بلااستفاده. مبتنی بر گرافِ import (customer) و ارجاعِ `<script>` (business/company). تاریخ: ۲۰۲۶-۰۷-۳۰.

## ماژول‌های JS
- **اپ مشتری:** تنها فایلِ «unreferenced-by-import» خودِ `main.js` است — که **entry point** است (انتظار می‌رود).
  هر ۲۷ ماژولِ دیگر از گرافِ `main.js` قابل‌دسترس‌اند. → **بدونِ ماژولِ بلااستفاده.** (auditِ resolveِ importها سبز.)
- **پنل کسب‌وکار:** هر ۱۲ فایلِ `js/*.js` در `<script>`های `index.html` ارجاع دارند. → **بدونِ بلااستفاده.**
- **پنل شرکت:** هر ۷ فایلِ `js/*.js` در `index.html` ارجاع دارند. → **بدونِ بلااستفاده.**

## صفحات / کامپوننت‌ها / ناوبری
- همه‌ی `page-*`/`view-*`ها از ناوبری (`go()`/`nav()`) قابل‌دسترس‌اند. صفحه‌ی orphan یافت نشد.
- **Orphan-UI (نه unused، بلکه بدونِ منطقِ واقعی):** «کیف پول کش‌بک» و «پشتیبانی» در پروفایلِ اپ مشتری
  فقط `toast(...)` placeholder‌اند — به FULLSTACK_INTEGRATION_AUDIT §۸.

## CSS / Styles
- CSSهای پایه (`tokens/foundation/ds-bridge`) از `shared/` sync و drift-check می‌شوند → بدونِ تکرار.
- **بلااستفاده‌ی احتمالی:** یک ممیزیِ دقیقِ «CSS selector بلااستفاده» (PurgeCSS-style) در این جاروب اجرا نشد؛
  به‌عنوانِ Needs-Investigation علامت می‌خورد (کم‌اولویت — CSS دستی و کوچک است).

## Assets / Images / Fonts / Icons
- **تصویر/فونتِ محلی:** پوشه‌ی img/asset/font یافت نشد → آیکن‌ها **inline SVG** و فونت **Vazirmatn از CDN**.
  → بدونِ imageِ/فونتِ بلااستفاده.
- **آیکن‌ها:** `icons.js` در هر سه اپ (۹۷ خط) — **از قبل single-source** (`shared/js/icons.js` + sync + drift-check)، نه تکرارِ واقعی. duplicateِ باقی‌مانده = `analytics.js`.

## Routes
- فرانت‌ها SPAِ client-side‌اند (بدونِ routerِ سروری)؛ همه‌ی مقصدها از nav فعال‌اند. routeِ بلااستفاده یافت نشد.

## جمع‌بندی
**بدونِ ماژول/صفحه/asset بلااستفاده‌ی قطعی.** تنها موارد: (۱) Orphan-UIهای placeholder (نیازِ flow)، (۲) تکرارِ
`analytics.js` + API client (نیازِ ادغام، نه حذف؛ `icons.js`/CSS از قبل تک‌منبع‌اند)، (۳) ممیزیِ CSS-purge به‌عنوانِ کارِ کم‌اولویتِ آینده.
