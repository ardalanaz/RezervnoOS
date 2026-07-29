# DATABASE_AUDIT — رزرونو

> ممیزیِ لایه‌ی داده: `prisma/schema.prisma` (۳۸ مدل، ۱۰۱۴ خط) + ۲۹ مهاجرتِ SQL. تاریخ: ۲۰۲۶-۰۷-۲۹.

---

## ۰) خلاصه

مدلِ داده **بالغ و نرمال‌شده** است با پوششِ خوبِ index/FK/constraint و مکانیزم‌های سطح-enterprise
(RLS، exclusion-constraint ضدِ double-booking، partitioning، تراکنش‌های serializable).

**نمره‌ی دیتابیس: ۹.۰ / ۱۰**

## ۱) اندازه و پوشش
- **۳۸ مدل**، شامل: Tenant، User، Staff، Restaurant، Table، MenuItem، Reservation(+Item،Event)،
  WaitlistEntry، PointsLedger، Referral، GiftCard، Coupon(+Redemption)، MarketingAutomation،
  StaffPermission، AuditLog، Job، IdempotencyKey، Webhook، GuestProfile، SmsTransaction، Review،
  RestaurantPhoto، StaffNote، CampaignLog، RestaurantClosure، Payment، PlatformSettings،
  ChatThread(+Message)، CustomerInsight، ClubMember، PlatformEvent …
- **۵۳** `@@index`، **۱۵** `@unique/@@unique`، **۴۳** رابطه (`@relation`)، **۱۱** قانونِ `onDelete`،
  **۴۱** فیلدِ `createdAt/updatedAt`.

## ۲) یکپارچگی و قیود (شواهد از مهاجرت‌ها)
- **ضدِ double-booking** (crown jewel): `016-exclude-constraint-active-statuses.sql` +
  `026-consolidate-exclusion-constraint.sql` → EXCLUDE constraint روی بازه‌ی زمانیِ `[slot_start, block_end)`
  (شاملِ بافر/نظافت). این **لایه‌ی حقیقتِ** ضدِ تداخل است؛ حتی اگر منطقِ اپ خطا کند، DB تداخل را رد می‌کند.
- **پول/همزمانی**: `013-money-concurrency-fixes.sql`؛ کارتِ هدیه/کوپن با `SELECT … FOR UPDATE` و
  تراکنشِ **Serializable** (`lib/loyalty.ts`, `coupons.ts`) → ضدِ double-spend.
- **صف**: `009-jobs-queue.sql` + `FOR UPDATE SKIP LOCKED` → workerهای موازی بدونِ کارِ تکراری.
- **RLS**: `023-rls-new-tables.sql` → Row-Level Security برای جداسازیِ tenant در سطحِ DB (دفاعِ عمقیِ multi-tenant).
- **partitioning**: `011-reservations-partitioning.sql` + `ensure-partitions` cron → مقیاسِ جدولِ رزرو.

## ۳) index و کاراییِ کوئری
- مهاجرتِ `001-performance-indexes.sql` + ۵۳ `@@index` در schema.
- **N+1**: کدِ permissions به‌صراحت الگوی pass-through (`effectivePermissionsFrom`) دارد تا از N+1 پرهیز کند؛
  استفاده از `select` صریح در کوئری‌ها رایج است (نشتِ ستون کم).
- **پیشنهاد (متوسط):** یک ممیزیِ `EXPLAIN ANALYZE` روی سنگین‌ترین کوئری‌های داشبورد/گزارش با داده‌ی
  واقعیِ حجیم اجرا شود تا index-coverage تجربی تأیید شود (این ممیزی استاتیک است، اجرای runtime نشده).

## ۴) نرمال‌سازی و فیلدهای حسابرسی
- نرمال‌سازیِ خوب؛ جداسازیِ Reservation/ReservationItem/ReservationEvent (تاریخچه‌ی رویداد جدا).
- **audit fields**: ۴۱ فیلدِ timestamp؛ `AuditLog` مدلِ مجزا (`008-audit-logs.sql`, `022-audit-fixes`).
- **soft-delete**: به‌صورتِ status/flag در بعضی مدل‌ها (مثلِ `Staff.isActive` در `017`)؛ الگوی سراسریِ
  soft-delete یکدست نیست — **پیشنهادِ سطح-پایین** برای یکدست‌سازی در صورتِ نیازِ retention.

## ۵) مهاجرت‌ها و ایمنیِ تراکنش
- **۲۹ مهاجرتِ نسخه‌بندی‌شده** با README و `apply-sql.sh`؛ ترتیبِ منطقی (index→partition→features→fixes).
- تراکنش‌ها: **۲۰** مورد `$transaction` در کد؛ رزرو با isolation=Serializable + بازچکِ داخلِ tx + retry.
- **پیشنهاد (متوسط):** چون مهاجرت‌ها «دستی/SQL» هستند (نه `prisma migrate` کامل)، یک تستِ CIِ
  «drift check» بین `schema.prisma` و وضعیتِ واقعیِ DB اضافه شود تا از واگراییِ schema↔DB جلوگیری شود.

## ۶) یافته‌های اولویت‌دار
| # | یافته | شدت | پیشنهاد |
|---|-------|-----|---------|
| D1 | نبودِ drift-check خودکارِ schema↔DB (مهاجرتِ دستی SQL) | متوسط | جابِ CI برای مقایسه |
| D2 | ممیزیِ EXPLAIN روی کوئری‌های سنگین اجرا نشده (استاتیک) | متوسط | بنچمارک با دیتای حجیم |
| D3 | الگوی soft-delete/retention ناهمگون | پایین | استانداردِ مشترک |

**تضمین:** هیچ‌کدام از این موارد schema را تغییر نمی‌دهند؛ همه در سطحِ «پیشنهادِ بهبود»اند.
