# CUSTOMER_UI_REDESIGN_REPORT — اپ مشتریِ رزرونو

> گزارشِ نهاییِ بازطراحیِ **فقط اپ مشتری** (`apps/customer`). پنل‌های
> business/company عمداً **دست‌نخورده** ماندند و API/DB/دمومود بدونِ تغییر است.
> این سند نتیجهٔ برنامهٔ تدریجیِ فازهای **C0 تا C12** است — هر فاز یک PRِ کوچک،
> merge-on-green، با حفظِ سازگاریِ رو به عقب و بدونِ دادهٔ جعلی.

تاریخ: ۲۰۲۶-۰۷-۲۹ · وضعیت: **تکمیل‌شده** · دامنه: `apps/customer` بس

---

## ۰) خلاصهٔ مدیریتی

اپ مشتری از قبل «نسل‌Z-محور» بود (bottom-nav، bottom-sheet، Food-DNA، dark-mode،
PWA، پایهٔ a11y، دیزاین‌سیستمِ توکن‌محور). بنابراین این برنامه **پولیش و
بهینه‌سازیِ تعامل** بود، نه بازنویسی. طیِ ۱۳ فاز:

- **باگِ ساختاریِ index.html** رفع شد (بلوکِ chips تکراری + تگ‌های بی‌جفت).
- **دادهٔ جعلیِ hard-coded** حذف/جایگزینِ حالت‌های واقعی یا مشتق‌شده شد.
- زیرساختِ **Undo**، **Skeleton یکدست**، **Command Palette**، **Notification
  Center**، **Onboarding**، **Timeline رزرو**، و **بهبودهای WCAG 2.2 AA** اضافه شد.
- **میکرو-اینترکشن‌ها** و در نهایت **اتصالِ یادآورها به رزروهای واقعی** انجام شد.

همه‌چیز **demo-safe** ماند: بدونِ بک‌اند، اپ با کدِ `1234` و دادهٔ نمونهٔ محلی کار
می‌کند و هیچ عددِ جعلی نمایش نمی‌دهد.

---

## ۱) جدولِ فازها (قبل → بعد)

| فاز | عنوان | قبل | بعد | فایل‌های کلیدی |
|----|-------|-----|-----|----------------|
| **C0** | اسناد پایه (audit/plan/library/a11y/ux) | نبود | ۵ سندِ مرجع | `docs/CUSTOMER_*` |
| **C1** | رفعِ باگِ مارک‌آپِ صفحهٔ اصلی | بلوکِ `chips` تکراری + `</div>`/`</style>` بی‌جفت | مارک‌آپِ تمیز و معتبر | `index.html` |
| **C2** | Skeleton یکدست | متنِ خالیِ «در حال بارگذاری» | کارت‌های `.sk-trip` + `aria-busy` (کاهشِ CLS) | `reservation.js`, `app.css` |
| **C3** | سیستمِ Undo | لغو/حذف بدونِ بازگشت | snackbar + شمارشِ معکوس + commit با تأخیر | `auth.js`, `trips.js`, `discover.js` |
| **C4** | حذفِ دادهٔ جعلی | «۲۴۷ رستوران»، امتیازِ ثابت | اعداد از حالتِ واقعیِ کلاینت/حالتِ خالی | `index.html`, `discover.js` |
| **C5** | Timeline رزرو | فقط برچسبِ وضعیت | `<ol class="tl">` مراحلِ ثبت→تأیید→حضور→تکمیل | `reservation.js`, `app.css` |
| **C6** | Command Palette + جست‌وجوی سراسری | نبود | `⌘K`/دکمهٔ موبایل، جست‌وجوی آنی، recents | `features/palette.js`, `app.css` |
| **C7** | Notification Center | نبود | دسته/اولویت/خوانده‌نشده/اکشن + badge | `features/notifications.js` |
| **C8** | Quick-book + focus-trap کاملِ sheet | sheet بدونِ تلهٔ فوکوس | Tab-cycle، Esc، بازگردانیِ فوکوس | `auth.js` |
| **C9** | Onboarding wizard | نبود | ۳ اسلایدِ بارِ اول (localStorage) | `features/onboarding.js` |
| **C10** | میکرو-اینترکشن‌ها | بدونِ بازخوردِ لمسی | `like-pop` + `:active` scale (سبک) | `discover.js`, `app.css` |
| **C11** | بستنِ شکاف‌های WCAG 2.2 AA | divهای کلیک‌پذیرِ غیرِقابل‌کیبورد | `role=button`+`tabindex`+Enter/Space، `:focus-visible` | `features/a11y.js`, `app.css` |
| **C12** | اتصالِ یادآورها به رزروهای واقعی | یادآور فقط از seedِ محلی | `/me/reservations` برای کاربرِ واردشده | `features/notifications.js` |

---

## ۲) دسترس‌پذیری (a11y)

- تلهٔ فوکوسِ کاملِ bottom-sheet (Tab، Esc، بازگردانیِ فوکوس) — C8.
- عناصرِ کلیک‌پذیرِ غیرِدکمه‌ای (کارت‌های مناسبت، ناحیه‌های تپِ Food-DNA) با
  `role=button`+`tabindex` و Enter/Space عملیاتی شدند — C11.
- حلقهٔ فوکوسِ عمومیِ `:focus-visible` — C11.
- `role=dialog`/`aria-modal`/`aria-label` روی Palette، Notification، Onboarding.
- `aria-busy` روی لیست‌های در حالِ بارگذاری — C2.
- احترام به `prefers-reduced-motion` در تمام انیمیشن‌های افزوده‌شده.

## ۳) کارایی و CLS

- Skeletonهای هم‌ابعاد با محتوا → کاهشِ پرش/CLS هنگامِ بارگذاری (C2, C5).
- انیمیشن‌ها فقط `transform`/`opacity` (بدونِ layout-thrash)؛ زیرِ
  `prefers-reduced-motion` خاموش.
- هیچ کتابخانهٔ جدیدی اضافه نشد؛ اپ همچنان **بدونِ build** و Vanilla ES-modules است.
- `CACHE_VERSION` در `sw.js` هر فاز bump شد تا کاربران نسخهٔ کش‌شدهٔ قدیمی را نبینند.

## ۴) اجزای اضافه‌شده به کتابخانه

Command Palette (`.cmdk*`)، Notification Center (`.notif*`)، Undo snackbar
(`.undo-snack*`)، Reservation Timeline (`.tl*`)، Onboarding (`.onb*`)، آیکنِ‌های
نوارِ بالا (`.nav-icn`) و badge (`.notif-badge`)، میکرو-اینترکشن‌ها
(`like-pop`/`.liked-pop`).

## ۵) بدهیِ فنیِ رفع‌شده

- بلوکِ `chips` تکراری و تگ‌های بی‌جفتِ `</div>`/`</style>` در `index.html` (C1).
- اعدادِ جعلیِ hard-coded در HTML (C4).
- الگوهای لغو/حذفِ بدونِ بازگشت → زیرساختِ Undoِ مشترک (C3).

## ۶) محدودیت‌های شناخته‌شده (بدونِ جعل، مستند)

- **live-strip / AI-strip**: نمایشِ «رستوران‌های در حالِ پر شدن» به یک endpointِ
  آمارِ زنده (مثلاً `/live-stats`) نیاز دارد که هنوز در بک‌اند نیست؛ به‌جای جعل،
  به حالتِ واقعیِ کلاینت/خالی تکیه شد.
- **ورودِ میان‌نشست برای badgeِ اعلان**: badge پس از ورود تا بازکردنِ پنل (یا رفرشِ
  صفحه) به‌روز نمی‌شود، چون برای سرجیکال‌ماندنِ diff به `onLogin` هوک نزدیم.
- **pull-to-refresh / swipe-actions**: عمداً از C10 کنار گذاشته شد تا گیتِ e2e و
  رفتارِ اسکرول تهدید نشود؛ قابلِ افزودن در فازِ جدا با تأییدِ کاربر.

## ۷) تضمین‌ها

- **business/company**: هیچ فایلی لمس نشد.
- **API/DB**: بدونِ تغییر؛ فقط endpointِ موجودِ `/me/reservations` مصرف شد.
- **دمومود**: کدِ `1234` + دادهٔ نمونهٔ محلی همچنان کار می‌کند؛ هیچ عددِ جعلی نمایش
  داده نمی‌شود.
- **اعتبارسنجی هر فاز**: `node --check` + auditِ resolveِ importها + `design-system
  --check` + گیتِ رفتاریِ **e2e** (Playwright، فقط customer) در CI. حفظِ EOL.

---

_این سند پایانِ برنامهٔ بازطراحیِ اپ مشتری (C0–C12) را ثبت می‌کند._
