# CUSTOMER_UX_IMPROVEMENTS — بک‌لاگِ اولویت‌بندی‌شده (اپ مشتری)

> فهرستِ اقدام‌های مشخص، مرتب بر اساسِ نسبتِ **ارزش/ریسک**. هر مورد به فازِ
> `CUSTOMER_UI_REDESIGN_PLAN.md` نگاشت شده. رقابتی‌ها: OpenTable/Resy/TheFork/…

## P0 — سریع، کم‌ریسک، پرارزش
1. **رفعِ باگِ مارک‌آپِ خانه** — حذفِ بلوکِ `chips` تکراری + تگ‌های بی‌جفت (`</div>`, `</style>`). [C1]
   - ضدالگوی رقبا که اجتناب می‌کنیم: صفحه‌ی خانه‌ی شلوغ و کند.
2. **Skeletonِ یکدست** به‌جای صفحه‌ی خالی/پرش هنگام بارگذاری. [C2]
3. **Undo روی لغوِ رزرو و حذفِ علاقه** (snackbar + ۵ثانیه شمارشِ معکوس). [C3]

## P1 — اصطکاک‌زدایی از سفرِ اصلی
4. **حذفِ دادهٔ جعلیِ hard-coded** → اعداد فید/امتیاز/AI از API یا حالتِ‌خالیِ صادق. [C4]
5. **Quick-book تک‌ضربه** برای اسلاتِ پیشنهادیِ رستوران (هدف: رزرو در «چند ثانیه»). [C8]
6. **Activity Timeline** روی هر رزرو (created→confirmed→arrived→completed/cancelled) از رویدادهای موجودِ بک‌اند. [C5]
7. **حالت‌های خطای انسانی** با Retry + شناسه + پیشنهادِ بازیابی (به‌جای toastِ خشک). [C2/C4]

## P2 — قابلیت‌های نسل‌Z و کشف
8. **Universal Search + Command Palette** (`⌘K`/دکمه‌ی موبایل، recent/trending/instant، typo-tolerance سمتِ کلاینت). [C6]
9. **Notification Center** (دسته/اولویت/خوانده‌نشده/اکشن؛ یادآورِ رزرو، آپدیتِ waitlist). [C7]
10. **Onboarding wizardِ مینیمالِ تعامل‌محور** (نه فرمِ طولانی). [C9]
11. **میکرو-اینترکشن:** pull-to-refresh، swipe-actions روی کارت‌ها، like-animation، haptics (در دسترس بودن). [C10]

## P3 — پولیشِ حرفه‌ای
12. **Web Share API** برای اشتراکِ رستوران (به‌جای toastِ ساختگی). [C10]
13. **lazy-image با blur-up** + کاهشِ CLS در فید/detail. [C2/C10]
14. **بستنِ شکاف‌های WCAG 2.2 AA** طبقِ `CUSTOMER_ACCESSIBILITY_REPORT.md` + افزودنِ `axe-core` به e2e. [C11]
15. **progressive disclosure** در خانه: فشرده‌سازیِ hero/stripها در تاشوی موبایل. [C6]

## معیارهای موفقیتِ قابلِ‌سنجش
- زمانِ «کشف تا تأییدِ رزرو»: کاهش (هدفِ brief: چند ثانیه با Quick-book).
- CLS نزدیک صفر در خانه/detail (Skeleton + lazy-image).
- e2e سبز + `axe-core` بدونِ نقضِ AA در صفحاتِ کلیدی.
- صفر دادهٔ جعلیِ hard-code در مسیرِ اصلی.
- بدونِ رگرسیونِ رفتاری؛ دمومود (۱۲۳۴) دست‌نخورده.

## بدهیِ فنیِ حذف‌شدنی
- `apps/business/src-v2/RestaurantIntelligenceDashboard.jsx` (فایلِ JSXِ یتیم، خارج از
  معماریِ no-build) — خارج از دامنه‌ی این کار (business)، فقط برای ثبت. حذفش نیازمندِ
  تأییدِ جداست چون در پوشه‌ی business است.
