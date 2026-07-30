# BROKEN_CONNECTIONS — رزرونو

> تشخیصِ اتصالِ شکسته (فرانت↔بک‌اند، import، ناوبری، mapping…). تاریخ: ۲۰۲۶-۰۷-۳۰.

## نتیجه‌ی کلی
**هیچ اتصالِ شکسته‌ی مسدودکننده یافت نشد.** موارد زیر یا «طبقِ طراحی» (fallback دمو) یا «فلگ برای بهبود»اند.

| بررسی | نتیجه |
|-------|-------|
| فراخوانِ فرانت به endpointِ ناموجود | ❌ یافت نشد — همه‌ی مسیرهای فراخوانی‌شده در backend وجود دارند |
| endpointِ بدونِ فراخوان | ۳ orphan-candidate (به UNUSED_BACKEND) — نه «شکسته» |
| importهای شکسته (customer) | ❌ صفر — auditِ resolveِ importها سبز |
| routeها/ناوبری | ✅ همه‌ی `go()/nav()`ها به view موجود می‌روند |
| mapping/parsingِ پاسخ | ✅ `mapApiTrip`/`mapTripStatus` سازگار با enum بک‌اند؛ envelope یکدست |
| permission/auth | ✅ guardهای backend + refreshِ ۴۰۱ در client — به AUTHORIZATION |
| pagination/filter/sort | ✅ cursor در /restaurants و /restaurant/reservations؛ فیلترِ vibe/date |
| search | ✅ کلاینتی (palette/doSearch) — به‌درستی کار می‌کند |
| notifications | ✅ مرکزِ اعلان از /me/reservations (C12) + fallbackِ محلی |
| file upload/download | 🔶 `restaurant/photos` (آپلودِ عکس) — منطقِ backend هست؛ صحتِ آپلودِ فایل در e2e پوشش داده نشده (Needs-Verification) |

## نکاتِ «طبقِ طراحی» (نه باگ)
- **base=''(same-origin) در production:** فرانت‌ها بدونِ تنظیمِ `rz-api-base` در حالتِ **دمو** کار می‌کنند
  (fallbackِ عمدیِ `API.offline`). این «اتصالِ شکسته» نیست؛ نقطه‌ی تنظیمِ `rz-api-base` اضافه شده.
- **Location/Map:** «نزدیک تو» در فرانت heuristic/محلی است؛ سرویسِ نقشه/ژئو backend ندارد → به FEATURE_COVERAGE
  به‌عنوانِ «Partial/Missing» (نه شکسته).

## AI / Location / Notification (خلاصه‌ی سلامت)
- **AI:** توصیه‌ی AI-strip در اپ مشتری متنِ نمونه‌ی hard-coded است (بدونِ endpointِ توصیه‌ی شخصی) → **Orphan-UI/Partial**.
  سمتِ بک‌اند، `customer-insights`/`fraud` heuristic فعال‌اند و در پنل مصرف می‌شوند.
- **Location:** بدونِ نقشه‌ی واقعی؛ **Missing** (نه شکسته).
- **Notification:** سالم (client center + push-subscribe؛ ارسالِ push واقعی منوط به FCM env).

## جمع‌بندی
اتصالِ end-to-end **سالم** است. کارهای باقی‌مانده «تکمیلِ قابلیت» (AI-strip، Location، Orphan-UIها) و
«تأییدِ e2e» (آپلودِ عکس) هستند — نه رفعِ اتصالِ شکسته.
