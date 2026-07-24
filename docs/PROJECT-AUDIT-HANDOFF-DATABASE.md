# رزرونو — حسابرسیِ Zero-Trust لایه‌ی دیتابیس

**تاریخ:** ۲۰۲۶-۰۷-۱۹ · **روش:** بررسیِ مستقیمِ `schema.prisma` (۹۰۶ خط) + کوئریِ زنده روی
پروژه‌ی Supabase فعال (`zmyuvtpbchytqvtgyewt`) از طریق connector — نه حدس، نه مستنداتِ قبلی.
هرجا ادعای مستنداتِ قبلی با واقعیتِ DB فرق داشت، صراحتاً گفته شده.

---

## ۰. یافته‌ی بحرانی — `docs/SUPABASE-SECURITY.md` روی پروژه‌ی اشتباه نوشته شده

سند امنیتیِ موجود صراحتاً می‌گوید «تولیدشده از بررسیِ دیتابیسِ زنده (پروژه: `nxtvmfoczgnjjgdgrxli`)»
و ادعا می‌کند «۳۲ جدول». اما طبقِ `PROJECT-KNOWLEDGE.md` خودِ همین پروژه، `nxtvmfoczgnjjgdgrxli`
**قدیمی و INACTIVE**‌ست؛ پروژه‌ی واقعیِ فعال `zmyuvtpbchytqvtgyewt`‌ه که همین الان **۳۵ جدول** دارد.

یعنی این سند یافته‌هایش را روی DB اشتباه گرفته — درست است که با بررسیِ مستقلِ من روی پروژه‌ی
فعال هم RLS فعال و ۰ policy تأیید شد (پس نتیجه‌گیریِ نهایی تصادفاً درست از آب درآمده)، ولی سند
به‌عنوانِ مرجع **نباید برای تصمیم‌گیریِ آینده استفاده شود** بدون این‌که دوباره روی پروژه‌ی درست
و با شمارشِ جدولِ به‌روز (۳۵، نه ۳۲) بازتولید شود. جدول‌های جدیدتر (`payments`,
`platform_settings`, `webhooks`, `sms_transactions`, `guest_profiles`, `restaurant_closures`)
اصلاً در آن سند دیده نشده‌اند.

**اکشن:** سند را با project_id درست بازتولید کن، یا حداقل عنوانش را به‌وضوح «منسوخ» علامت بزن.

---

## ۱. معماری و مالتی‌تننسی — تأییدشده

- سلسله‌مراتب `Tenant → Restaurant → {Table, MenuItem, Reservation, ...}` درست و normalized است.
- ایزولاسیونِ چندشعبه‌ای (`Staff.restaurantId` nullable) دقیقاً طبقِ ادعا روی DB زنده هست:
  ستونِ `staff.restaurant_id` با FK به `restaurants.id` (ON DELETE NO ACTION) موجود است.
- تمامِ ۳۵ جدولِ `schema.prisma` **دقیقاً با DB زنده مطابقت دارند** (اسم ستون، تایپ، enum، دیفالت) —
  هیچ drift جدیدی بینِ schema فعلی و DB واقعی پیدا نشد (بر خلافِ چیزی که ممکن بود انتظار داشته
  باشی بعد از تاریخِ شلوغِ migrationهای ۰۱۸-۰۲۲).

## ۲. ⚠️ Drift واقعی که پیدا شد: migrationهای ۰۱۸ تا ۰۲۲ هیچ‌جا SQL ندارند

`prisma/migrations/manual/` فقط تا `017-staff-is-active.sql` می‌رود. اما `schema.prisma` صریحاً
در کامنت‌ها می‌گوید migration ۰۱۸ (staff branch scoping)، ۰۱۹ (payments/deposit)، ۰۲۰
(platform_settings)، و طبقِ `PROJECT-KNOWLEDGE.md` تا ۰۲۲ (`blockBufferMinutes`,
`restaurant_closures`) روی DB زنده اجرا شده‌اند. **گشتم و تأیید می‌کنم: هیچ فایلِ
`018-*.sql` تا `022-*.sql` در کل ریپو وجود ندارد** — نه در `manual/`، نه جای دیگری.

این یعنی:
- اگر امروز یک DB خالیِ جدید بسازی و `prisma migrate deploy` بزنی، این پنج تغییر (چندشعبه‌ای،
  پرداخت، تنظیماتِ پلتفرم، `blockBufferMinutes`، `restaurant_closures`) **از صفر ساخته نمی‌شوند**
  چون تاریخچه‌ی migration درباره‌شان چیزی نمی‌داند — فقط با `prisma db push` (که از schema.prisma
  می‌سازد، نه از تاریخچه) قابل‌بازسازی‌اند. یعنی **disaster recovery از مسیرِ migrate رسمی شکسته است.**
- این همان ریسکِ فرآیندی‌ای‌ست که خودِ `PROJECT-AUDIT-HANDOFF.md` بخش ۶ به آن اشاره کرده
  («ریشه‌ی drift بینِ DB و گیت رفع نشده») — من مستقل تأییدش کردم، دقیق‌تر (اسمِ فایل‌های گمشده
  را مشخص کردم) و اضافه می‌کنم: این فقط «مستندسازی ناقص» نیست، مسیرِ استاندارد بازسازیِ DB را
  می‌شکند.

**اکشن پیشنهادی:** پنج migration دستیِ گمشده (۰۱۸ تا ۰۲۲) را از دیفِ `schema.prisma` بین دو
کامیت بازسازی و در `manual/` کامیت کن، حتی اگر روی DB زنده از قبل اعمال شده باشند — قانونِ
«هر migration دستی همان لحظه کامیت شود» که در `PROJECT-AUDIT-HANDOFF.md` بخش ۱۰ نوشته شده،
دقیقاً برای همین است.

## ۳. باگِ واقعیِ schema که تازه پیدا شد: `Coupon.targetSegment` بدونِ `@map`

هر فیلدِ دیگری در کلِ schema.prisma دقیقاً یک الگو دارد: camelCase در Prisma + `@map("snake_case")`
برای ستونِ واقعیِ Postgres. **یک استثنا وجود دارد:**

```prisma
targetSegment CustomerSegment?   // ← بدون @map!
```

تأییدشده روی DB زنده: ستونِ واقعی در جدولِ `coupons` نامش دقیقاً `"targetSegment"` است (mixed-case،
نیازمندِ دابل‌کوتیشن در هر SQL خام). Prisma خودش این را می‌فهمد و کد از طریقِ Prisma Client مشکلی
ندارد، ولی:
- هر کوئریِ raw SQل آینده (مثلِ الگویی که در `fraud.ts`/`rfm.ts`/`coupons.ts` همین الان استفاده
  می‌شود) اگر بدونِ کوتیشن به این ستون اشاره کند (`target_segment` یا `targetsegment` بدونِ کوتیشن)،
  ساکت به یک ستونِ نامعتبر resolve نمی‌شود، بلکه ارورِ «column does not exist» می‌دهد — قابلِ‌کشف
  ولی گیج‌کننده و برخلافِ کانوانسیونِ کل پروژه.
- هر ابزارِ خارجی (BI، Metabase، psql دستی) که عادت به snake_case دارد، این یک ستون را باید جدا
  کوتیشن کند.

**اکشن:** یک migration کوچک اضافه کن: `ALTER TABLE coupons RENAME COLUMN "targetSegment" TO
target_segment;` + `@map("target_segment")` در schema.prisma. جدول `coupons` فعلاً روی DB زنده
۰ ردیف دارد، پس این rename کاملاً بی‌خطر و بدونِ ریسکِ داده است — همین الان انجامش بده، قبل از
این‌که داده‌ی واقعی وارد شود و rename پرهزینه‌تر شود.

## ۴. مدل‌های بدونِ رابطه‌ی Prisma → بدونِ Foreign Key واقعی روی DB

چهار مدل که همه بعداً (خارج از چرخه‌ی `prisma migrate` رسمی، مستقیم با SQL دستی) اضافه شده‌اند،
هیچ‌کدام فیلدِ رابطه (`relation`) به مدلِ والدشان در `schema.prisma` ندارند — و چون Prisma رابطه
ندارد، **FK هم روی DB واقعی ساخته نشده**. تک‌تک با کوئری روی DB زنده تأیید شد (نه فرض):

| مدل | ستونِ اشاره‌گر | باید FK بخورد به | وضعیتِ واقعیِ FK روی DB |
|---|---|---|---|
| `Webhook` | `restaurantId` | `restaurants.id` | ❌ **هیچ FK ندارد** |
| `SmsTransaction` | `restaurantId` | `restaurants.id` | ❌ **هیچ FK ندارد** |
| `GuestProfile` | `userId` (PK) | `users.id` | ❌ **هیچ FK ندارد** (حتی روی PK!) |
| `RestaurantClosure` | `restaurantId` | `restaurants.id` | ❌ **هیچ FK ندارد** |

مقایسه کن با `RestaurantPhoto`/`StaffNote`/`CampaignLog` که همه فیلدِ `restaurant Restaurant
@relation(...)` دارند و FK‌شان روی DB واقعاً موجود است. الگو مشخص است: **هر مدلی که وقتِ ساختنش
حواسِ کسی به relation field نبوده، بدونِ integrity در production نشسته.**

ریسکِ عملی: اگر یک رستوران یا کاربر (فرضاً از پنل ادمین، در آینده) حذف شود، این چهار جدول می‌توانند
رکوردهای orphan نگه دارند بدونِ این‌که Postgres جلوی آن را بگیرد یا حتی خطا بدهد. برای
`guest_profiles` مخصوصاً بد است چون کلیدِ اصلی‌اش دقیقاً `userId`‌ست — یعنی even نبودِ FK روی
خودِ PK هم عجیب است (معمولاً یعنی جدول با migration دستی و بدونِ عبور از Prisma ساخته شده).

**اکشن:** به هر ۴ مدل فیلدِ relation اضافه کن و یک migration برای افزودنِ FK بزن:
```prisma
model Webhook {
  ...
  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
}
model SmsTransaction {
  ...
  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
}
model GuestProfile {
  ...
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
model RestaurantClosure {
  ...
  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
}
```
(انتخابِ `onDelete` را بسته به رفتارِ موردنظر تنظیم کن؛ چون فعلاً هیچ مسیر حذفِ رستوران/کاربر در
پروژه پیاده نشده، ریسکِ فوری نیست، ولی برای صحتِ معماری باید اضافه شود.)

## ۵. ایندکس‌های تکراری/بی‌فایده — یافته‌ی جدید (هزینه‌ی نوشتن، نه فقط فضا)

بررسیِ `pg_indexes` + `pg_constraint` روی جدولِ `reservations` (سنگین‌ترین جدول از نظرِ نرخِ نوشتن)
یک تکرارِ واقعی نشان داد:

- `no_table_overlap` یک **EXCLUDE constraint** واقعی‌ست (GiST روی `table_id` + بازه‌ی زمانی) —
  همانی که جلوی double-booking را می‌گیرد؛ خودش به‌طورِ خودکار ایندکسِ پشتیبانش را می‌سازد.
- `idx_resv_table_active_range` یک **ایندکسِ جدا و اضافیِ GiST** با تقریباً همان تعریف (فقط
  بدونِ شرطِ `table_id IS NOT NULL`) — این ایندکس هیچ کوئریِ اضافه‌ای را سریع‌تر نمی‌کند که
  ایندکسِ خودِ constraint از قبل نمی‌کند، ولی روی **هر INSERT/UPDATE رزرو** باید دوباره نگه‌داری
  شود. ایندکس‌های GiST گران‌ترین نوع برای maintenance‌اند — این یعنی هر رزرو دو بار cost اضافیِ
  GiST می‌دهد بدونِ فایده‌ی خواندنیِ اضافه.
- به‌همین‌ترتیب `payments_authority_idx` (btree ساده روی `authority`) کاملاً زیرمجموعه‌ی
  `payments_authority_key` (unique btree روی همان یک ستون) است — دومی هر کوئریِ برابریِ اولی را
  از قبل پوشش می‌دهد.

**اکشن:** `DROP INDEX idx_resv_table_active_range;` و `DROP INDEX payments_authority_idx;` —
هر دو بدونِ افتِ عملکردِ خواندن، فقط سودِ نوشتن.

## ۶. RLS و مدلِ امنیتی — تأییدشده (با اصلاحِ منبع)

- روی هر ۳۵ جدولِ schema فعلی RLS فعال و ۰ policy — deny-by-default واقعی، مستقیم از DB
  زنده‌ی درست (`zmyuvtpbchytqvtgyewt`) تأیید شد.
- مدلِ امنیتی («بک‌اند با نقشِ owner که RLS را دور می‌زند + اعتبارسنجیِ سطحِ اپلیکیشن») درست و
  رایج است، به‌شرطِ این‌که `SUPABASE_ANON_KEY`/`SERVICE_ROLE` هیچ‌وقت سمتِ کلاینت افشا نشود —
  این را کد بررسی نکردم (خارج از اسکوپِ این حسابرسی که فقط لایه‌ی DB بود)، ولی توصیه می‌کنم در
  یک پاسِ بعدی روی env/secrets چک شود.
- `btree_gist` در schema عمومیِ `public` نصب شده، نه در schema اختصاصیِ `extensions` (که
  Supabase برایش می‌سازد). ریسکِ امنیتیِ عملی پایین است (توصیه‌ی best-practice، نه آسیب‌پذیری)
  ولی چون همین الان کاربردیِ فعال دارد (EXCLUDE constraint رزرو)، جابه‌جاییِ آن یک migration
  حساس‌تر است — برای الان اولویتِ پایین.

## ۷. کیفیتِ کدِ لایه‌ی اتصال (`lib/db.ts`) — یافته‌ی جزئی

معماریِ pooling + read-replica-routing درست و production-grade است (singleton روی `globalThis`،
`connection_limit`/`pool_timeout` قابل‌تنظیم، متریکِ latency، graceful shutdown). یک نکته‌ی
تمیزکاری: **دو مکانیزمِ جداگانه‌ی shutdown hook** در همین فایل ثبت شده‌اند — یکی با `process.once`
(خط ۱۰۵-۱۱۴) و یکی با `process.on` (خط ۱۳۳-۱۴۷) — هر دو روی `SIGTERM`/`SIGINT` و هر دو
`$disconnect` را صدا می‌زنند. بی‌ضرر است (Prisma دیسکانکتِ دوباره را تحمل می‌کند) ولی دو مسیرِ
موازی برای یک مسئولیت، نشونه‌ی merge ناقصِ دو تغییرِ قبلی است. توصیه: یکی‌شان (ترجیحاً نسخه‌ی
`process.once` که idempotent‌تره) حذف شود.

## ۸. آنچه از قبل درست بود و دوباره کشف نشد (تأییدِ مثبت)

- ایندکس‌گذاریِ `reservations` برای مقیاسِ ۱۰M+ (بر اساسِ الگوهای کوئریِ مستندشده در
  `PROJECT-KNOWLEDGE.md`) روی DB زنده کاملاً موجود و درست است — همه‌ی ۷ ایندکسِ موردِ ادعا پیدا شد.
- تمام enumها (۱۳ enum) بینِ schema و DB یکی‌ست، شاملِ مقادیرِ قدیمیِ نگه‌داشته‌شده برای سازگاری
  (`arrived`, `cancelled_by_user`, `cancelled_by_restaurant`).
- Optimistic locking روی `Tenant.version` وجود دارد و به‌درستی مستندسازی شده.
- ForeignKeyهای اصلیِ کسب‌وکار (Reservation, ClubMember, CustomerInsight, Payment, ...) همه
  با `onDelete` منطقی تعریف شده‌اند (مثلاً `ReservationItem.menuItem` عمداً `Restrict`‌ه تا تاریخچه
  خراب نشود).

---

## خلاصه‌ی اکشن‌ها (اولویت‌بندی‌شده)

1. **بحرانی/سریع:** rename ستونِ `coupons."targetSegment"` → `target_segment` (جدول خالیه، هزینه صفر) + اضافه‌کردنِ `@map`.
2. **بحرانی/فرآیندی:** بازسازی و کامیتِ ۵ فایلِ migration گمشده (۰۱۸-۰۲۲) از دیفِ schema، تا مسیرِ `migrate deploy` رسمی دوباره قابل‌اعتماد شود.
3. **بالا:** اضافه‌کردنِ ۴ relation field گمشده (Webhook, SmsTransaction, GuestProfile, RestaurantClosure) + migration برای FK واقعی.
4. **متوسط:** حذفِ دو ایندکسِ تکراری (`idx_resv_table_active_range`, `payments_authority_idx`) برای کاهشِ هزینه‌ی نوشتن.
5. **پایین:** یکی‌سازیِ دو shutdown hook در `db.ts`؛ بازتولیدِ `SUPABASE-SECURITY.md` روی project_id درست با شمارشِ جدولِ به‌روز؛ بررسیِ جابه‌جاییِ `btree_gist` به schema اختصاصی در یک نشستِ جداگانه.

هیچ‌کدام از این‌ها مانعِ لانچ نیستند به‌جز #۲ (که ریسکِ disaster-recovery است، نه ریسکِ روزمره) —
ولی همه‌شان کم‌هزینه‌اند و بهتر است قبل از این‌که داده‌ی واقعیِ production وارد شود انجام شوند،
مخصوصاً #۱ که فقط الان (جدولِ خالی) بی‌درد است.
