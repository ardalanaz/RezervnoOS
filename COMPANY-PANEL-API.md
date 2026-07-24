# API پنل شرکت (Company Panel) — endpointهای جدید

پنل company حالا با همه‌ی فیچرهای جدید همخوان شد. این endpointها داده‌ی
سطح-پلتفرم (همه‌ی رستوران‌ها) را برای CEO/تیم جمع می‌کنند. همه نیاز به
احراز هویت admin دارند (`adminAuthFromRequest` + role='owner').

## دیدن (Read)

### `GET /api/v1/admin/overview` (ارتقایافته)
داشبورد اصلی. حالا علاوه بر شمارش پایه، KPIهای جدید:
- `platform_clv_toman` — CLV کل همه‌ی مهمانان (از GuestProfile سراسری)
- `total_vips`, `total_guests` — تعداد VIP و کل مهمانان پلتفرم
- `active_restaurants` — رستوران‌های فعال
- `system_health` — healthy/warning/critical (بر اساس صف Job)

### `GET /api/v1/admin/system-health` (جدید)
سلامت زیرساخت: وضعیت صف Job (pending/processing/failed/dead)، webhookهای
فعال، اقدامات ناموفق ۲۴ساعت، تشخیص گیرکردن صف، و لیست jobهای dead.

### `GET /api/v1/admin/business-intelligence` (جدید)
هوش تجاری سطح پلتفرم: CLV/VIP کل، توزیع سگمنت RFM، سگمنت‌های رفتاری،
و رستوران‌های برتر بر اساس ارزش مشتریانشان (CLV).

### `GET /api/v1/admin/security` (جدید)
سیگنال‌های امنیتی سطح پلتفرم: fraud (چند حساب از یک IP)، مشتریان پرریسک
no-show، اقدامات ناموفق اخیر، و رویدادهای حساس audit — همه بین رستوران‌ها.

## کنترل (Write)

### `PATCH /api/v1/admin/restaurants/[id]/control` (جدید)
کنترل رستوران توسط پلتفرم:
- `{ action: 'activate' }` — فعال کردن رستوران
- `{ action: 'deactivate' }` — غیرفعال کردن (is_open=false)
- `{ action: 'set_plan', plan: 'free'|'pro'|'enterprise' }` — تغییر پلن tenant

همه‌ی عملیات کنترلی در audit_logs ثبت می‌شوند (actor، target، detail، IP)
— برای انطباق و ردیابی.

---

## تست‌شده روی PostgreSQL واقعی
- کوئری‌های همه‌ی endpointها روی Supabase اجرا و تأیید شدند
- منطق کنترل (فعال/غیرفعال + تغییر پلن + audit) با ROLLBACK تست شد
- همه type-check تمیز

## باقی‌مانده (فرانت‌اند)
این لایه‌ی بک‌اند است. اتصال به فرانت `apps/company/index.html` (افزودن
نماهای system-health، BI، security، و دکمه‌های کنترل) قدم بعدی است.
