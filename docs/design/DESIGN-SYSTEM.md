# رزرونو — سیستم طراحی (Design System)
### نسخه‌ی تولیدی ۱.۰ · ۲۰۲۶-۰۷-۲۲

منبعِ واحدِ حقیقت برای طراحیِ بصریِ هر سه اپ (customer / business / company).
همه‌ی توکن‌ها و کامپوننت‌ها در `shared/css/` و `shared/js/` تعریف و در هر اپ توزیع شده‌اند.

**فایل‌های سیستم:**
- `shared/css/tokens.css` — توکن‌های primitive + semantic
- `shared/css/foundation.css` — کامپوننت‌ها و کلاس‌های چیدمان
- `shared/js/icons.js` — سیستمِ آیکونِ SVG

**قانونِ طلایی:** هرگز مقدارِ خام ننویس (نه `14px`، نه `#4F46E5`). همیشه از توکن استفاده کن.

---

## ۱. توکن‌ها (Tokens)

معماریِ دولایه:
- **Primitive** — مقادیرِ خام (مقیاس، رنگِ برند). مستقیم استفاده نکن.
- **Semantic** — نقش‌ها (`--surface`, `--text-1`, `--danger`). فقط این‌ها را در UI استفاده کن.

هر اپ لایه‌ی Semantic را در «پلِ تم» به تمِ خودش نگاشت می‌کند (customer دارک، پنل‌ها لایت).
یعنی یک کامپوننت در هر سه اپ درست کار می‌کند، فقط رنگش با تم عوض می‌شود.

**دسته‌های توکن:** تایپوگرافی، spacing، شعاع، حرکت، رنگ، elevation، grid، breakpoint، z-index،
touch-target، focus-ring.

---

## ۲. تایپوگرافی (Typography)

فونت: **Vazirmatn** (وزن‌های ۳۰۰–۹۰۰). مقیاسِ ۹ پله‌ای با پرش‌های واضح:

| توکن | اندازه | کاربرد |
|---|---|---|
| `--fs-2xs` | 11px | برچسب‌های ریز، badge |
| `--fs-xs` | 12px | متنِ کمکی، caption |
| `--fs-sm` | 13px | متنِ ثانویه، label |
| `--fs-md` | 14px | **بدنه‌ی پیش‌فرض** |
| `--fs-lg` | 16px | عنوانِ کارت |
| `--fs-xl` | 20px | عنوانِ بخش |
| `--fs-2xl` | 24px | عنوانِ صفحه |
| `--fs-3xl` | 32px | تیترِ بزرگ |
| `--fs-4xl` | 40px | hero |

**وزن:** `--fw-normal(400)` بدنه · `--fw-semibold(600)` label/دکمه · `--fw-bold(700)` عنوان · `--fw-extra(800)` تیتر.
**line-height:** `--lh-tight(1.2)` عنوان · `--lh-normal(1.6)` بدنه · `--lh-relaxed(1.8)` متنِ طولانی.
**letter-spacing:** `--ls-tight(-0.02em)` روی تیترهای بزرگ (به سبک Linear).

**قانون:** روی هر صفحه، کنتراستِ اندازه بینِ عنوان و بدنه حداقل دو پله باشد (مثلاً 20↔14).

---

## ۳. سیستم رنگ (Color System)

**برند:** `--brand-500` (اصلی)، `--brand-600` (hover)، `--brand-400` (روشن).

**Semantic (حالت‌ها)** — هرکدام سه مشتق: پایه / `-soft` (پس‌زمینه) / `-ink` (متن):
| نقش | کاربرد |
|---|---|
| `--success` / `-soft` / `-ink` | موفقیت، تأیید |
| `--warning` / `-soft` / `-ink` | هشدار |
| `--danger` / `-soft` / `-ink` | خطا، حذف |
| `--info` / `-soft` / `-ink` | اطلاع |

**سطوح (از پلِ تم):** `--surface` (کارت)، `--surface-2` (ورودی)، `--surface-hover`.
**متن:** `--text-1` (اصلی)، `--text-2` (ثانویه)، `--text-3` (کم‌رنگ — حداقل کنتراست ۴.۵:۱ رعایت شود).

**قانون:** رنگِ semantic فقط برای معنایش استفاده شود (قرمز = خطر، نه تزئین).

---

## ۴. آیکون‌نگاری (Iconography)

سیستمِ SVG یکدست در `shared/js/icons.js` — **جایگزینِ کاملِ emoji**.
مشخصات: `viewBox 24×24`، `stroke-width 1.5`، `currentColor`، `stroke-linecap/join: round`.

```js
// ESM (customer):   import { icon } from './icons.js';
// classic (پنل‌ها): window.icon موجود است
el.innerHTML = icon('calendar');
icon('search', { size: 20 });
icon('bell', { label: 'اعلان‌ها' });   // aria-label برای دکمه‌ی آیکونی
```

**۳۹ آیکونِ استاندارد** در دسته‌های: ناوبری (home, search, filter, menu, close, chevron…)،
رستوران/رزرو (calendar, clock, users, mapPin, utensils, star, heart)، ارتباط (message, bell, phone)،
مالی (wallet, chart, trending, creditCard)، سیستم (settings, user, logout, shield, store…).

**قانون:** آیکونِ تزئینی `aria-hidden`؛ آیکونِ معنادار (دکمه) حتماً `label`. اندازه‌ی پیش‌فرض ۲۴px،
داخلِ دکمه ۲۰px، در nav 22px.

---

## ۵. حرکت (Motion)

سیستمِ زمانیِ واحد:
| توکن | مقدار | کاربرد |
|---|---|---|
| `--motion-fast` | 130ms | hover، فشارِ دکمه، تغییرِ رنگ |
| `--motion-base` | 200ms | ظاهر/محوِ عنصر، modal |
| `--motion-slow` | 320ms | sheet، انتقالِ صفحه |

**منحنی‌ها:** `--ease-out` (استاندارد)، `--ease-spring` (ورودِ modal/sheet، حسِ زنده).
**قانونِ الزامی:** `prefers-reduced-motion` سراسری رعایت می‌شود (در tokens.css) — همه‌ی انیمیشن‌ها
برای کاربرانِ حساس خاموش می‌شوند. هرگز این را دور نزن.

---

## ۶. کامپوننت‌ها (Components)

همه در `foundation.css`. کلاس‌محور، بدونِ وابستگیِ JS (مگر رفتار).

| کامپوننت | کلاس‌ها | حالت‌ها |
|---|---|---|
| **دکمه** | `.btn` + `.btn-primary/ghost/danger` + `.btn-sm/lg` | hover, active(scale .98), disabled, `[data-loading]` |
| **کارت** | `.card`, `.card-interactive` | hover (بالا آمدن + سایه) |
| **فرم** | `.field`, `.field-label/input/error/help` | focus-ring, `[aria-invalid]` |
| **Badge** | `.badge` + `-neutral/brand/success/warning/danger/info`, `.badge-count` | — |
| **Chip** | `.chip` | hover, `[aria-pressed=true]` |
| **Avatar** | `.avatar` + `-sm/lg` | fallbackِ حرف + عکس |
| **Switch** | `.switch` + `-track/thumb` | checked, focus |
| **Tabs** | `.tabs`, `.tab` | `[aria-selected]` با نشانگر |
| **Tooltip** | `.tooltip[data-tip]` | hover/focus |
| **Modal** | `.overlay`, `.modal` | ورودِ spring |
| **Sheet** | `.sheet`, `.sheet-handle` | ورود از پایین |
| **Skeleton** | `.skeleton`, `-text/card/avatar` | shimmer |
| **Empty** | `.empty-state` + `-icon/title/desc` | — |
| **Error** | `.error-state` + `-icon` | — |

**قانون:** کامپوننتِ جدید اول اینجا اضافه شود، بعد استفاده — نه کدِ تکراری در صفحات.

---

### ۶.۵ ماتریسِ حالت‌های کامپوننت (Component States)

هر کامپوننتِ تعاملی باید **هر ۸ حالت** را پوشش دهد. پیاده‌سازیِ فعلی در `foundation.css`:

| کامپوننت | Default | Hover | Active | Focus | Disabled | Loading | Error | Success |
|---|---|---|---|---|---|---|---|---|
| **دکمه** (`.btn`) | رنگِ نوع | تیره‌تر (`--brand-600`) | `scale(.98)` | `--focus-ring` | `opacity .5` + `not-allowed` | `[data-loading]` اسپینر | `.btn-danger` | (سبز از semantic) |
| **input** (`.field-input`) | border خنثی | — | — | border برند + halo | `opacity` + خاموش | — | `[aria-invalid]` border قرمز + `.field-error` | border سبز (`--success`) |
| **chip** (`.chip`) | خاکستری | `--surface-hover` | (فشار) | `--focus-ring` | `opacity .5` | — | — | `[aria-pressed]` برند |
| **switch** (`.switch`) | track خاکستری | — | — | halo روی track | `opacity` | — | — | checked → track برند |
| **tab** (`.tab`) | متنِ ثانویه | متنِ اصلی | — | `--focus-ring` | `opacity` | — | — | `[aria-selected]` + نشانگر |
| **کارت** (`.card-interactive`) | elevation-1 | بالا آمدن + `--sh-lg` | — | `--focus-ring` | — | `.skeleton` | `.error-state` | — |

**حالت‌های سراسری (روی هر عنصرِ تعامل):**
- **Default:** حالتِ پایه از توکن.
- **Hover:** فقط دسکتاپ (`@media (hover:hover)`)؛ تغییرِ ظریفِ رنگ/elevation در `--motion-fast`.
- **Active:** فشارِ فیزیکی `transform: scale(.98)`.
- **Focus:** `:focus-visible` → `--focus-ring` یکدست (هرگز `outline:none` بدونِ جایگزین).
- **Disabled:** `opacity: .5` + `cursor: not-allowed` + `pointer-events` خاموش + `aria-disabled`.
- **Loading:** اسپینرِ درون‌عنصری (`[data-loading]`) یا skeleton؛ تعامل قفل.
- **Error:** مرزِ `--danger` + پیامِ `.field-error` کنارِ عنصر (نه toast)؛ ورودی حفظ می‌شود.
- **Success:** بازخوردِ `--success` (مرز/آیکونِ check)؛ برای عملِ کلیدی، لحظه‌ی خاص.

**قانون:** هیچ کامپوننتِ تعاملی بدونِ هر ۸ حالت مستقر نشود. حالتِ focus و disabled اجباری‌اند (a11y).

---

## ۷. Elevation (سایه‌ها)

۵ سطحِ لایه‌ای + نام‌های معنایی:
| توکن | کاربرد |
|---|---|
| `--elevation-0` | تخت (بدونِ سایه) |
| `--elevation-1` / `--sh-sm` | کارتِ ظریف، switch |
| `--elevation-2` | کارتِ معمولی |
| `--elevation-3` / `--sh-md` | کارتِ برجسته، hover |
| `--elevation-4` / `--sh-lg` | dropdown, popover |
| `--elevation-5` / `--sh-xl` | modal, sheet |

**قانون:** ارتفاع = اهمیت + نزدیکی به کاربر. modal بالاترین، کارتِ زمینه پایین‌ترین.
از بیش از ۳ سطحِ همزمان در یک نما پرهیز کن.

---

---

## ۷.۵ شعاع لبه (Border Radius)

مقیاسِ شعاع، از ریز تا کامل:
| توکن | مقدار | کاربرد |
|---|---|---|
| `--radius-xs` | 8px | input، chipِ کوچک، badge |
| `--radius-sm` | 10px | دکمه‌ی کوچک، فیلدِ فرم |
| `--radius-md` | 12px | دکمه، کارتِ کوچک |
| `--radius-lg` | 16px | کارتِ استاندارد |
| `--radius-xl` | 20px | modal، کارتِ بزرگ |
| `--radius-2xl` | 28px | bottom-sheet (بالا)، hero |
| `--radius-full` | 9999px | avatar، switch، chip، badge دایره‌ای |

**قانون:** شعاع با اندازه‌ی عنصر متناسب باشد — عنصرِ بزرگ‌تر، شعاعِ بزرگ‌تر. عناصرِ تودرتو،
شعاعِ داخلی کوچک‌تر از خارجی. هرگز مقدارِ خام (`border-radius: 14px`) ننویس.

## ۸. گرید (Grid)

گریدِ ۱۲ستونی با gutterِ `--sp-6`. container با `max-width: 1280px`.
```html
<div class="container">
  <div class="grid grid-3"> … </div>   <!-- ۳ ستونِ مساوی -->
  <div class="grid grid-12"> … </div>  <!-- گریدِ کاملِ ۱۲ -->
</div>
```
کلاس‌های چیدمان: `.stack` (عمودی)، `.row` (افقی)، `.spacer`، `.divider`، `.divider-v`.
با پسوندِ فاصله: `.stack-4`, `.row-2` و… (از توکنِ spacing).

**قانون:** به‌جای marginِ دلبخواه، از `.stack`/`.row` با gap استفاده کن — تراز خودکار می‌شود.

---

## ۹. قوانین Responsive (Responsive Rules)

Breakpointها: `--bp-sm 640` · `--bp-md 768` · `--bp-lg 1024` · `--bp-xl 1280`.

رفتارِ پیش‌فرضِ گرید:
- **≤1024px:** `grid-4→2`، `grid-3→2`
- **≤640px:** همه‌ی گریدها → تک‌ستون
- کلاس‌های کمکی: `.hide-mobile`, `.only-mobile`

**قوانینِ الگو (برای فازِ پیاده‌سازی):**
- موبایل: ناوبری = bottom-nav (حداکثر ۵)، جدول → کارت، sidebar → drawer.
- تبلت (768–1024): sidebarِ آیکونی (جمع‌شده).
- دسکتاپ: گریدِ کامل، sidebarِ باز.
- هدفِ لمسی: همه‌جا ≥ `--touch-min (44px)`.

---

## ۱۰. قوانین دسترسی‌پذیری (Accessibility Rules) — WCAG 2.2 AA

پیاده‌شده در سیستم:
- **skip-link** (`.skip-link`) در هر اپ → پرش به `#main`.
- **live-region** (`#a11y-live`) → toastها برای screen-reader اعلام می‌شوند.
- **focus-ring** یکدست روی همه‌ی عناصرِ تعاملی (`:focus-visible` → `--focus-ring`).
- **`.sr-only`** برای متنِ فقط-screen-reader.

قوانینِ الزامی هنگامِ ساخت:
- هر دکمه‌ی آیکونی → `aria-label` (یا `icon(name,{label})`).
- کنتراستِ متن ≥ 4.5:1 (متنِ بزرگ ≥ 3:1).
- هدفِ لمسی ≥ 44×44px (WCAG 2.5.8 → حداقل ۲۴).
- modal/sheet → focus-trap + `aria-modal` + بازگشتِ focus + Esc (رفتار در helperِ فاز بعد).
- هر تصویرِ معنادار → `alt`؛ تزئینی → `alt=""`.
- ترتیبِ tab منطقی؛ `aria-current="page"` روی nav فعال.

---

## ۱۱. قوانین تعامل (Interaction Rules)

- **بازخوردِ فوری:** هر کلیک باید ظرفِ <100ms بازخوردِ بصری بدهد (فشارِ دکمه، ripple، یا loading).
- **حالتِ loading:** دکمه‌ی در حالِ ارسال → `[data-loading]` (اسپینر، غیرفعال). صفحه → skeleton، نه متنِ خالی.
- **خطا:** کنارِ فیلد (`.field-error`)، نه toastِ محوشونده؛ ورودیِ کاربر حفظ شود؛ راهِ retry بده.
- **موفقیت:** `toast` برای عملِ معمولی؛ لحظه‌ی خاص برای عملِ کلیدی (رزروِ اول).
- **تأیید برای عملِ مخرب:** حذف/لغو → مودالِ تأیید، نه اجرای مستقیم.
- **optimistic UI:** جایی که امن است (چت)، عمل را فوری نشان بده، بعد با سرور هماهنگ کن.
- **بدونِ بن‌بست:** هر empty-state یک CTA به قدمِ بعد دارد.

---

## ۱۲. قوانین چیدمان (Layout Rules)

- **فضای سفید:** فاصله‌ی بخش‌ها ≥ `--sp-8 (32px)`؛ فضای سفید ادراکِ «پریمیوم» می‌سازد.
- **یک کانون در هر صفحه:** یک `.btn-primary`، بقیه `.btn-ghost`. یک «عددِ قهرمان» در داشبورد.
- **ریتمِ عمودی:** همه‌چیز مضربِ ۴px (از توکنِ spacing) → تراز خودکار.
- **گروه‌بندیِ منطقی:** آیتم‌های ناوبری در بخش‌های عنوان‌دار (نه لیستِ صافِ ۱۳‌تایی).
- **RTL-first:** از ویژگی‌های منطقی (`margin-inline`, `inset-inline-start`) استفاده کن، نه `left/right`.
- **تراکمِ یکدست:** یک تراکمِ پیش‌فرض در کلِ محصول (نه پنلِ متراکم + مشتریِ راحت).

---

## چک‌لیستِ استفاده (برای هر کامپوننت/صفحه‌ی جدید)
- [ ] فقط از توکن استفاده شده (نه مقدارِ خام)
- [ ] آیکون از `icon()` (نه emoji)
- [ ] دکمه‌ی آیکونی `aria-label` دارد
- [ ] حالت‌های loading/empty/error پوشش داده شده
- [ ] هدفِ لمسی ≥ 44px
- [ ] کنتراست ≥ 4.5:1
- [ ] فقط یک primary CTA
- [ ] فاصله‌ها از `.stack`/`.row`/توکن
- [ ] RTL با ویژگی‌های منطقی
- [ ] `prefers-reduced-motion` رعایت شده (خودکار از سیستم)

---

**وضعیت:** سیستمِ طراحیِ تولیدی کامل شد — ۱۲ بخش، توکن‌ها + کامپوننت‌ها + آیکون‌ها ساخته و در
هر سه اپ توزیع شد. آماده برای فازِ پیاده‌سازیِ صفحه‌به‌صفحه.
