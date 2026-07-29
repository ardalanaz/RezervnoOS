# CUSTOMER_COMPONENT_LIBRARY — سیستمِ کامپوننتِ اپ مشتری

> هدف: **یک سیستمِ واحد**، بدونِ کامپوننتِ تکراری، بدونِ استایلِ inline. مبنا =
> دیزاین‌سیستمِ موجود (`shared/css/tokens.css`, `foundation.css`, `ds-bridge.css` +
> `apps/customer/css/{theme,app}.css`). این سند موجود را فهرست و شکاف‌ها را تعریف می‌کند.

## ۱) توکن‌ها (موجود — منبع: `shared/css/tokens.css`)
- **رنگ/معنایی:** `--blue-*`, `--teal-*`, `--t1/t2/t3` (متن)، `--s-100…`، سطوحِ dark.
- **تم:** `data-theme="dark|light"` + `prefers-color-scheme` (پیش‌فرض dark).
- **شعاع/سایه/فاصله:** `--r`, elevationها. → **باید کامل به مقیاسِ ۸px مستند شوند**.
- **تایپوگرافی:** Vazirmatn (۳۰۰–۹۰۰).
- **حرکت:** `--spring` و انیمیشن‌های `pop`/`reveal` (در app.css). → توکنِ motion رسمی شود.

## ۲) کامپوننت‌های موجود (استخراج‌شده از کد)
| کامپوننت | کلاس/محل | وضعیت |
|---|---|---|
| Button | `.btn .btn-primary/.btn-ghost/.btn-sm/.btn-lg/.btn-block` | ✅ کامل |
| Card (رستوران) | `.rc` (`cardHTML`) | ✅ |
| Chips (فیلتر) | `.chip` | ⚠️ در HTML **تکراری** (رفع در C1) |
| Bottom Sheet | `.sheet-overlay/.sheet/.sheet-handle` | ✅ (رزرو) |
| Toast/Snackbar | `.toast` (`role=status`) | ⚠️ بدونِ اکشن/Undo |
| Bottom Nav | `.botnav/.botnav-item` | ✅ |
| Top Nav | `.nav/.nav-link` | ✅ |
| Empty State | `.empty/.empty-emoji/.empty-title` | ✅ (favorites) |
| Hero/Search | `.hero/.searchbar/.search-field` | ✅ |
| Live/AI strip | `.live-strip/.ai-strip` | ⚠️ دادهٔ ثابت |
| Icon system | `icons.js` (`icon(name,opts)`) | ✅ یکدست |
| Story overlay | `.dna-*` (Food-DNA) | ✅ |
| Trip card | `.trip-card` | ✅ |
| Rating/Review | `.rb-*/.review/.ai-review` | ✅ |

## ۳) کامپوننت‌های موردنیاز (شکاف — از دیزاین‌سیستم ساخته شوند)
| کامپوننت | کاربرد | فاز |
|---|---|---|
| **Skeleton** (`.skeleton`, shimmer) | فید/trips/favorites/chats | C2 |
| **Snackbar با Undo** (اکشن + شمارش معکوس) | لغو/حذف | C3 |
| **Command Palette** (`.cmdk` overlay + لیستِ نتیجه) | جست‌وجوی سراسری | C6 |
| **Search sheet** (recent/trending/instant) | جست‌وجو | C6 |
| **Notification Center** (`.notif-*` لیست/دسته/badge) | اعلان‌ها | C7 |
| **Timeline** (`.timeline/.tl-node`) | رویدادِ رزرو | C5 |
| **Progress/Stepper** (بالای sheet) | جریانِ رزرو | C8 |
| **Onboarding slides** | معرفی | C9 |
| **Segmented control / Tabs** | فیلترها | C6 |

## ۴) قواعدِ ثابت
- **هیچ استایلِ inline جدید** — همه از کلاس/توکن. گرادیان‌های occasion به کلاس منتقل شوند.
- **هر کامپوننتِ جدید** اول در `shared/css` (اگر بین‌اپی) یا `apps/customer/css/app.css`
  (اگر مختصِ کاستومر) تعریف، سپس استفاده.
- **dark + light** هر دو پوشش داده شوند (تستِ کنتراست).
- **آیکون فقط از `icons.js`** (نه SVGِ inlineِ پراکنده؛ الان چند SVG در index.html hard-code شده → تدریجاً به `icon()` منتقل شود).
