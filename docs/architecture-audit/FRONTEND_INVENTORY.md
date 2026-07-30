# FRONTEND_INVENTORY — رزرونو

> موجودیِ سه فرانت. مبتنی بر استخراجِ واقعی. تاریخ: ۲۰۲۶-۰۷-۳۰.

## اپ مشتری (`apps/customer`) — SPA، ES Modules، entry: `js/main.js`
- **صفحات (SPA views در index.html):** discover، rest(detail)، favorites، trips، loyalty، profile، chats، chat + overlayها: sheet(رزرو)، dnaOverlay.
- **ناوبری:** top-nav (`.nav`) + bottom-nav (`.botnav`) + FAB تم.
- **ماژول‌ها (۲۸):** main، api، auth، init، store، actions، reservation، waitlist، user-profile، theme-pwa، icons، analytics، `data/{seed,discover,detail,booking}`، `features/{trips,loyalty,rewards,food-dna,chat,palette,notifications,a11y,onboarding,pull-refresh,swipe-actions,live-strip}`.
- **کامپوننت‌ها (HTML-string factory):** cardHTML, hCardHTML, tripTimeline, cmdk(palette), notif center, undo-snack, onboarding، sheetها.
- **API client:** `api.js` (base قابل‌تنظیم، timeout، refreshِ ۴۰۱، envelope).
- **State:** `store.js` + متغیرهای ماژولی (USER, favs, R, TRIPS…) — بدونِ framework store.
- **Theme/Tokens:** `css/{tokens,foundation,theme,app,ds-bridge}.css` (tokens/foundation/ds-bridge از `shared/` sync).
- **PWA:** `sw.js` (cache-versioned)، `manifest.webmanifest`.
- **Loading/Error:** skeletonها (`.sk*`)، toast(aria-live)، empty-stateها، `API.offline` fallback.

## پنل کسب‌وکار (`apps/business`) — global `<script>`
- **Views:** overview، reservations، waitlist، floor(plan سالن)، profile، customers، loyalty، marketing، analytics، cashback، pricing، staff، chat.
- **ماژول‌ها (۱۲):** data(+API client)، routing، overview، reservations، waitlist، crm، loyalty، marketing، staff-system، chat، analytics، icons.
- **UI:** sidebar، topbar، modal(`#modalBg`)، toast، notif-pop، popup-card.

## پنل شرکت (`apps/company`) — global `<script>`
- **Views:** overview، restaurants، detail، analytics، customers، billing، systemhealth، security، support.
- **ماژول‌ها (۷):** api، data، overview، restaurant، intelligence، analytics، icons.
- **UI:** sidebar، topbar(search)، offlineBanner، modal، toast.

## مشترک / تکراری (به CONSOLIDATION)
- `icons.js` (هر ۳ اپ، ۹۷ خط)، `analytics.js` (هر ۳)، API client (۳ نسخه)، `overview/waitlist/loyalty/chat` همپوشان.
- توکن‌های CSS از قبل تک‌منبع (`shared/css` + sync).

## غایب (framework-محور، طبقِ طراحیِ Vanilla)
Hooks/Contexts/Stores به‌سبکِ React وجود ندارند (Vanilla JS)؛ Localization به‌صورتِ متنِ فارسیِ inline (بدونِ i18n framework — به SCALABILITY).
