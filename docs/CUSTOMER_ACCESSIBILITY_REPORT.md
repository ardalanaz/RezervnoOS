# CUSTOMER_ACCESSIBILITY_REPORT — WCAG 2.2 AA (اپ مشتری)

> ارزیابیِ ایستا از کد. هدف: WCAG 2.2 AA. ✅ رعایت‌شده · ⚠️ ناقص · ❌ غایب.

## ۱) پایه‌ی موجود (خوب)
- `lang="fa" dir="rtl"` ✅ · skip-link `#app-main` ✅ · `#a11y-live aria-live=polite` ✅
- Toast `role="status"` ✅ · Sheet/DNA `role="dialog" aria-modal` ✅
- bottom-nav/nav دکمه‌ها `aria-label` دارند ✅ · `viewport-fit=cover` (safe-area) ✅

## ۲) ماتریسِ معیارها
| معیار WCAG | وضعیت | یادداشت |
|---|---|---|
| 1.1.1 متنِ جایگزین | ⚠️ | بیشترِ آیکون‌ها `aria-hidden`/label دارند؛ بعضی emojiها بدونِ متن |
| 1.3.1 ساختار/ARIA | ⚠️ | occ-cardها/تپ‌های DNA بدونِ `role`/نقشِ دکمه |
| 1.4.3 کنتراست (AA) | ⚠️ | متنِ روی گرادیان‌ها (occ-cards, hero) باید سنجیده/اصلاح شود |
| 1.4.11 کنتراستِ غیرمتنی | ⚠️ | مرزِ فوکوس/کنترل‌ها روی سطوحِ dark |
| 2.1.1 کیبورد | ⚠️ | ناوبریِ `onclick` روی `div` (occ-card, DNA tap) با کیبورد کار نمی‌کند |
| 2.4.3 ترتیبِ فوکوس | ⚠️ | focus-trap در sheet/DNA تأیید نشده |
| 2.4.7 نمایانیِ فوکوس | ⚠️ | حلقه‌ی فوکوسِ یکدست لازم است (`:focus-visible`) |
| 2.5.8 اندازه‌ی هدف (2.2) | ⚠️ | بعضی chip/iconها < ۲۴px؛ باید ≥ ۲۴×۲۴ |
| 3.3.1/3.3.2 خطا/برچسب فرم | ⚠️ | فرم‌های profile/OTP برچسب/`for`/inline-validation کامل ندارند |
| 3.3.7 ورودِ تکراری (2.2) | ⚠️ | autofill/one-time-code برای OTP |
| 2.3.3 حرکت (reduced-motion) | ⚠️ | باید همه‌ی انیمیشن‌ها زیرِ `prefers-reduced-motion` خاموش شوند |
| 4.1.2 نام/نقش/مقدار | ⚠️ | کنترل‌های سفارشی (tap-zones) نقشِ صریح ندارند |
| 4.1.3 پیام‌های وضعیت | ✅/⚠️ | toast دارد؛ ولی تایمرِ waitlist/تغییرِ وضعیت live-region ندارد |

## ۳) اقدام‌های کلیدی (به فازها وصل)
1. **کیبورد:** `div`های کلیک‌پذیر → `<button>` یا `role=button` + `tabindex=0` +
   هندلرِ Enter/Space (occ-cards، DNA tap). [C11 / همراهِ هر فاز]
2. **focus-visible سراسری** + focus-trap در sheet/DNA/palette. [C8/C11]
3. **کنتراست:** بازبینیِ متنِ روی گرادیان؛ افزودنِ overlay/سایه‌ی متن یا توکنِ امن. [C11]
4. **اهداف لمسی ≥ ۲۴px** (WCAG 2.2 جدید). [C10/C11]
5. **reduced-motion:** پوششِ همه‌ی کیفراف‌ها (`pop`, `reveal`, DNA slides). [C11]
6. **فرم‌ها:** `label for`, `aria-invalid`, پیام خطای متنی، `inputmode`/`autocomplete=one-time-code`. [C8]
7. **live-region** برای تایمر/وضعیتِ waitlist و بارگذاری. [C2/C4]

## ۴) ابزارِ سنجش (پیشنهاد برای CI)
افزودنِ `axe-core` به تستِ e2e (Playwright) روی صفحاتِ کلیدی → گیتِ خودکارِ A11y.
