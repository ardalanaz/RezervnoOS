# CUSTOMER_UI_REDESIGN_PLAN — نقشه‌ی بازطراحیِ تدریجیِ اپ مشتری

> فقط `apps/customer`. business/company دست‌نخورده. هر فاز = یک PRِ کوچک، سازگارِ
> رو به عقب، بدونِ شکستنِ API/DB/دمومود، با گیتِ e2e (تنها اپِ دارای تستِ runtime).
> هر تغییرِ js/css → bump `CACHE_VERSION` در `sw.js`.

## اصولِ اجرایی
- **افزایشی، نه بازنویسی:** رفتار و UXِ قابل‌تشخیص حفظ می‌شود؛ فقط اصطکاک کم می‌شود.
- **از دیزاین‌سیستم:** هر کلاس/توکنِ جدید در `shared/css` تعریف و sync می‌شود (نه inline).
- **اتصالِ واقعی:** هیچ دادهٔ جعلیِ جدید؛ هر عدد از API یا حالتِ‌خالیِ صادق.

## فازها

| فاز | محتوا | ریسک | گیت |
|---|---|---|---|
| **C0** | همین اسناد (audit + plan + library + a11y + improvements) | صفر | review |
| **C1** | **رفعِ باگِ مارک‌آپِ index.html** (بلوکِ chips تکراری + `</div>`/`</style>` بی‌جفت) — تمیزکاریِ خالص | پایین | e2e |
| **C2** | **Skeleton یکدست** (فید، trips، favorites، chats) + کاهشِ CLS | پایین | e2e |
| **C3** | **Undo system** (لغوِ رزرو، حذفِ علاقه) با snackbar + شمارشِ معکوس | پایین | e2e |
| **C4** | **حذفِ دادهٔ جعلیِ hard-coded** → اتصال به API/حالتِ‌خالی (اعداد فید، امتیاز، AI-strip) | متوسط | e2e |
| **C5** | **Activity Timeline** روی هر رزرو (از رویدادهای موجودِ بک‌اند) | متوسط | e2e |
| **C6** | **Universal Search + Command Palette** (اسلاید سراسری، recent/trending، کیبورد `⌘K`/دکمه‌ی موبایل) | متوسط | e2e |
| **C7** | **Notification Center** (دسته/اولویت/خوانده‌نشده/اکشن) | متوسط | e2e |
| **C8** | **Quick-book تک‌ضربه** + focus-trap کاملِ sheet + progress | متوسط | e2e + QA |
| **C9** | **Onboarding wizard** چندمرحله‌ایِ مینیمال (تعامل‌محور) | متوسط | e2e |
| **C10** | **پولیشِ میکرو-اینترکشن** (pull-to-refresh، swipe-actions، like-anim، haptics در دسترس) | متوسط | e2e + QA |
| **C11** | **بستنِ شکاف‌های WCAG 2.2 AA** (طبق a11y report) | پایین | e2e + axe |

هر فاز مستقل، قابلِ عقب‌گرد، و مستقل ارزش می‌دهد. C1 پیشنهادِ شروع است (کم‌ریسک‌ترین،
بایت‌به‌بایت قابلِ‌تأیید).

## اعتبارسنجیِ هر فاز (الگوی ثابتِ این اپ)
`node --check` + import-resolution audit + طراحی‌سیستم `--check` + گیتِ **e2e** در CI
(تنها گیتِ runtimeِ کاستومر) + bump `CACHE_VERSION`.
