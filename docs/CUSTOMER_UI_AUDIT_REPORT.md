# CUSTOMER_UI_AUDIT_REPORT — اپ مشتریِ رزرونو

> ممیزیِ کاملِ UI/UX **فقط اپ مشتری** (`apps/customer`). پنل‌های business/company
> عمداً لمس نمی‌شوند. این سند **قبل از هر تغییری** نوشته شده؛ پیاده‌سازی بعد از آن،
> **تدریجی** و سازگارِ رو به عقب انجام می‌شود (بدونِ شکستنِ API/DB/دمومود).
> روش: بازخوانیِ مستقیمِ کد (index.html، ۸ صفحه‌ی SPA، ماژول‌های ES، CSSِ توکن‌محور).

تاریخ: ۲۰۲۶-۰۷-۲۹ · وضعیت: ممیزی (بدونِ تغییرِ کد)

---

## ۰) خلاصه‌ی مدیریتی

اپ مشتری از قبل «نسل‌Z-محور» است: bottom-nav، bottom-sheet برای رزرو، Food-DNA به
سبکِ Spotify Wrapped، dark-mode پیش‌فرض، PWA (نصب/آفلاین/sw)، پایه‌ی a11y
(skip-link, aria-live, role=dialog)، و دیزاین‌سیستمِ توکن‌محور (`tokens/foundation/
theme/ds-bridge`). پس این **پولیش و بهینه‌سازیِ تعامل** است، نه بازنویسی.

**۵ یافته‌ی سیستمیِ پرتأثیر:**
1. **باگِ مارک‌آپ در صفحه‌ی اصلی:** بلوکِ فیلترِ `chips` **دوبار تکرار** شده + یک
   `</div>` اضافه + یک `</style>`ِ بی‌جفت (خط ۳۸). → رندرِ تکراری/شکننده.
2. **دادهٔ جعلیِ hard-coded در HTML:** «۲۴۷ رستوران فعال»، «۱۲ رستوران در حال پر
   شدن»، امتیازِ `۳۴۰`، متنِ AI-strip. → نقضِ «no fake data»؛ باید از API/خالی‌حالت بیاید.
3. **ناسازگاریِ ناوبری:** top-nav ۵ مقصد (+پیام‌ها)، bottom-nav ۴ مقصد. جست‌وجوی
   سراسری/Command-Palette/اعلان‌ها غایب‌اند.
4. **بارِ استایلِ inline (~۱۰۷ مورد):** گرادیان‌ها و چیدمان‌ها inline‌اند؛ باید به
   توکن/کلاس منتقل شوند (سازگاری + dark-mode + کش).
5. **حالت‌های Loading/Error ناقص:** بعضی صفحات skeleton ندارند (پرش/جامپ)، و
   خطاها اغلب فقط toast‌اند بدونِ Retry/شناسه.

هیچ‌کدام نیازمندِ بازنویسی نیست؛ همه با ریفکتورِ افزایشیِ کوچک حل می‌شوند.

---

## ۱) روش امتیازدهی

هر صفحه در سه بُعد، ۰–۱۰ (بالاتر = بهتر):
- **UX** (اصطکاک، تعدادِ تعامل، شفافیت)
- **A11y** (WCAG 2.2 AA: کیبورد، فوکوس، ARIA، کنتراست، reduced-motion)
- **Perf** (رندر، skeleton، lazy، پرش/CLS)

Severity مشکلات: 🔴 بحرانی · 🟠 مهم · 🟡 جزئی.

---

## ۲) امتیازِ کلیِ صفحات

| # | صفحه | فایل | UX | A11y | Perf | اولویت |
|---|---|---|---|---|---|---|
| 1 | Discover (خانه/فید) | `index.html` + `data/discover.js` | 7 | 6 | 6 | 🔴 بالا |
| 2 | Restaurant Detail | `data/detail.js` | 8 | 7 | 7 | 🟠 متوسط |
| 3 | Booking Sheet (جریانِ رزرو) | `data/booking.js` | 7 | 6 | 7 | 🔴 بالا |
| 4 | Waitlist (لیست انتظار) | `waitlist.js` | 7 | 6 | 7 | 🟠 متوسط |
| 5 | Trips (رزروهای من) | `reservation.js` | 7 | 7 | 6 | 🟠 متوسط |
| 6 | Favorites | `reservation.js` | 8 | 7 | 7 | 🟡 پایین |
| 7 | Loyalty (باشگاه) | `features/loyalty.js` | 7 | 7 | 7 | 🟡 پایین |
| 8 | Profile | `user-profile.js` | 7 | 6 | 7 | 🟠 متوسط |
| 9 | Chats / Chat | `features/chat.js` | 6 | 6 | 6 | 🟠 متوسط |
| 10 | Food-DNA (Wrapped) | `features/food-dna.js` | 9 | 6 | 7 | 🟡 پایین |
| — | Auth/Login (OTP) | `auth.js` | 7 | 6 | 8 | 🟠 متوسط |

**میانگین:** UX ۷.۲ · A11y ۶.۴ · Perf ۶.۸ → نقطه‌ی ضعفِ اصلی **A11y** و **Perf(loading)**.

---

## ۳) ممیزیِ صفحه‌به‌صفحه

### ۱) Discover (خانه/فید) — UX 7 · A11y 6 · Perf 6
- **هدف:** پاسخ به «کجا غذا بخورم؟» + کشف + شروعِ رزرو.
- **مشکلات UI:** 🔴 بلوکِ `chips` دوبار تکرار شده (خطوط ۱۱۹–۱۳۴) + `</div>` اضافه؛
  🔴 `</style>`ِ بی‌جفت (۳۸)؛ 🟠 گرادیان occ-cardها inline.
- **مشکلات UX:** 🟠 چهار ردیفِ افقی (occasion, chips, nearby, trending) + hero +
  ai-strip + live-strip → بارِ شناختیِ بالا در تاشو؛ 🟠 search سه فیلدِ جدا
  (کجا/کِی/چند) که در موبایل عمودی می‌شود؛ 🟠 «Continue reservation» و «Recently
  visited» (خواسته‌ی brief) وجود ندارد.
- **دادهٔ جعلی:** 🔴 اعداد و متنِ AI ثابت در HTML.
- **A11y:** فوکوسِ chips فعال، ولی occ-cardها `role/aria-pressed` ندارند؛ کنتراستِ
  متنِ روی گرادیان باید سنجیده شود.
- **Perf:** فید بدونِ skeleton رندر می‌شود (پرش)؛ `hscroll`ها lazy نیستند.
- **توصیه:** حذفِ بلوکِ تکراری؛ اعداد از API/حالت‌خالی؛ skeleton برای فید؛ فشرده‌سازیِ
  hero در موبایل؛ افزودنِ «ادامه‌ی رزرو/اخیراً دیده‌شده».
- **بهبودِ موردانتظار:** کاهشِ CLS، کاهشِ بارِ شناختی، صداقتِ داده.

### ۲) Restaurant Detail — UX 8 · A11y 7 · Perf 7
- **هدف:** متقاعدسازی + شروعِ رزرو (سبکِ Airbnb).
- **قوت:** hero، social-proof، منو، خلاصه‌ی هوشمندِ نظرات، bookbar چسبان.
- **مشکلات:** 🟠 نوارِ رزرو همیشه پایین است ولی CTA اصلی می‌تواند sticky-محورتر شود؛
  🟡 بارگذاریِ تصاویر بدونِ placeholder؛ 🟡 دکمه‌ی اشتراک فقط toast می‌زند (بدونِ
  Web Share API).
- **توصیه:** Web Share API، lazy-image با blur-up، بازگشتِ ژست‌محور (swipe-back).

### ۳) Booking Sheet (جریانِ رزرو) — UX 7 · A11y 6 · Perf 7
- **هدف:** رزرو با کمترین تعامل. الان چندمرحله‌ای در bottom-sheet:
  `openBookSheet → refreshSlots → startBook → bookStep2 → bookStep3 → confirmBook`.
- **مشکلات:** 🔴 «one-tap reservation» (خواسته‌ی brief) نیست — چند step دارد؛
  🟠 focus-trap در sheet تأیید نشده (کیبورد می‌تواند بیرون بپرد)؛ 🟠 بدونِ optimistic
  update بینِ stepها؛ 🟡 undo برای «لغو» وجود ندارد.
- **توصیه:** «Quick book» تک‌ضربه برای اسلاتِ پیشنهادی؛ focus-trap کامل؛ progress
  بالای sheet؛ Undo روی لغو (snackbar با شمارش معکوس).
- **بهبود:** کاهشِ زمانِ رزرو به «چند ثانیه» (هدفِ brief).

### ۴) Waitlist — UX 7 · A11y 6 · Perf 7
- **هدف:** پیوستن/وضعیت/تایمرِ لیستِ انتظار (سبکِ OpenTable).
- **مشکلات:** 🟠 تایمر بدونِ `aria-live` برای اسکرین‌ریدر؛ 🟡 حالتِ آفلاین/خطا مبهم.
- **توصیه:** live-region برای تغییرِ وضعیت؛ retry شفاف.

### ۵) Trips (رزروهای من) — UX 7 · A11y 7 · Perf 6
- **قوت:** خلاصه‌ی دستاورد (کل/پیش‌رو/تجربه‌شده)، QR/تقویم/کیف‌پول/لغو.
- **مشکلات:** 🔴 **Activity Timeline** (خواسته‌ی brief) نیست؛ 🟠 بدونِ skeleton هنگام
  بارگذاریِ `/me/reservations`؛ 🟠 «لغو» بدونِ Undo.
- **توصیه:** timeline رویداد به‌ازای هر رزرو (از داده‌ی موجودِ بک‌اند: reservation
  events)؛ skeleton؛ Undo.

### ۶) Favorites — UX 8 · A11y 7 · Perf 7
- **قوت:** حالتِ خالیِ خوب (emoji + عنوان + متن + CTA).
- **مشکلات:** 🟡 حذف از علاقه بدونِ Undo؛ 🟡 grid بدونِ skeleton.
- **توصیه:** Undo روی حذف؛ انیمیشنِ ملایمِ افزودن/حذف.

### ۷) Loyalty (باشگاه) — UX 7 · A11y 7 · Perf 7
- **مشکلات:** 🟡 اعداد ممکن است دمو باشند؛ 🟡 سلسله‌مراتبِ امتیاز/سطح می‌تواند
  واضح‌تر شود.
- **توصیه:** اتصالِ کامل به `/me/points`؛ progress-ring برای سطح بعدی.

### ۸) Profile — UX 7 · A11y 6 · Perf 7
- **مشکلات:** 🟠 فرم‌ها بدونِ inline-validation/autosave؛ 🟠 برچسب‌های فرم باید
  `label for`/`aria` کامل شوند.
- **توصیه:** inline-edit، autosave، برچسبِ دسترس‌پذیر، مدیریتِ consent بازاریابی.

### ۹) Chats / Chat — UX 6 · A11y 6 · Perf 6
- **مشکلات:** 🟠 لیست/تِرد بدونِ skeleton؛ 🟠 ورودیِ پیام focus-management ضعیف؛
  🟡 بدونِ نشانگرِ «در حال تایپ/تحویل».
- **توصیه:** skeletonِ حباب، اسکرول‌به‌پایینِ خودکارِ امن، وضعیتِ تحویل.

### ۱۰) Food-DNA (Wrapped) — UX 9 · A11y 6 · Perf 7
- **قوت:** تجربه‌ی داستانیِ تمام‌قد، تپ چپ/راست — دقیقاً حسِ نسل‌Z.
- **مشکلات:** 🟠 ناوبریِ تپ بدونِ معادلِ کیبورد/aria؛ 🟠 reduced-motion برای
  انیمیشن‌های اسلاید تأیید نشده.
- **توصیه:** کنترلِ کیبورد + aria-label برای پیشرفت؛ احترام به reduced-motion.

### Auth/Login (OTP) — UX 7 · A11y 6 · Perf 8
- **قوت:** دمومود (کد ۱۲۳۴) — نباید بشکند.
- **مشکلات:** 🟠 فیلدِ OTP بدونِ `inputmode=numeric`/`autocomplete=one-time-code`؛
  🟡 خطاها بدونِ پیامِ بازیابی.
- **توصیه:** OTP خودکار (WebOTP)، پیامِ خطای انسانی.

---

## ۴) یافته‌های میان‌صفحه‌ای (سیستمی)

| موضوع | یافته | Severity |
|---|---|---|
| مارک‌آپ | بلوکِ chips تکراری + تگ‌های بی‌جفت در index.html | 🔴 |
| دادهٔ جعلی | اعداد/متنِ ثابت در HTML به‌جای API/حالت‌خالی | 🔴 |
| ناوبری | نبودِ جست‌وجوی سراسری، Command-Palette، مرکزِ اعلان | 🟠 |
| Loading | نبودِ skeleton یکدست؛ CLS در فید | 🟠 |
| Error | خطاها اغلب toast بدونِ Retry/شناسه/بازیابی | 🟠 |
| Undo | نبودِ Undo روی لغو/حذفِ علاقه | 🟠 |
| Timeline | نبودِ تایم‌لاینِ رویدادِ رزرو | 🟠 |
| Inline style | ~۱۰۷ مورد استایلِ inline | 🟠 |
| A11y | occ-cardها/تپ‌ها بدونِ role/aria؛ focus-trap sheet نامطمئن | 🟠 |
| tech-debt | `apps/business/src-v2/RestaurantIntelligenceDashboard.jsx` فایلِ JSXِ یتیم (خارج از معماریِ no-build) | 🟡 |

---

## ۵) نگاشتِ خواسته‌های brief → وضعِ موجود

| خواسته | وضعیت |
|---|---|
| Bottom nav / thumb-first | ✅ موجود |
| Bottom sheet رزرو | ✅ موجود |
| Dark mode | ✅ موجود (پیش‌فرض) |
| PWA / آفلاین | ✅ موجود |
| Food-DNA داستانی | ✅ موجود |
| One-tap reservation | ⚠️ چندمرحله‌ای است |
| Universal search / instant | ❌ غایب |
| Command palette | ❌ غایب |
| Notification center | ❌ غایب |
| Undo system | ❌ غایب |
| Activity timeline | ❌ غایب |
| Onboarding wizard | ❌ غایب |
| Skeleton/optimistic | ⚠️ جزئی |
| Pull-to-refresh / swipe actions | ❌ غایب |
| WCAG 2.2 AA کامل | ⚠️ پایه هست، شکاف دارد |

---

## ۶) توصیه‌ی توالی (به `CUSTOMER_UI_REDESIGN_PLAN.md` وصل است)

**قدمِ اول (کم‌ریسک، بایت‌قابل‌تأیید، همین حالا):** رفعِ باگ‌های مارک‌آپِ index.html
(بلوکِ chips تکراری + تگ‌های بی‌جفت) — تمیزکاریِ خالص بدونِ تغییرِ رفتار، با گیتِ e2e.
سپس skeleton/Undo/timeline/search به‌ترتیبِ ارزش.

> این ممیزی عمداً هیچ کدی تغییر نداد. پیاده‌سازی بعد از تأییدِ توالی، در PRهای کوچک.
