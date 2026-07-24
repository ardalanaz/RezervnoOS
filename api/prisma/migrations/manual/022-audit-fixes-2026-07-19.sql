-- 022: فیکس‌های حسابرسیِ zero-trust دیتابیس (۲۰۲۶-۰۷-۱۹).
-- رجوع کن به docs/PROJECT-AUDIT-HANDOFF-DATABASE.md برای جزئیاتِ کاملِ هر مورد.
-- همه‌ی statementها idempotent هستند.

-- ── ۱) rename ستونِ mixed-case coupons.targetSegment → snake_case ──
-- تنها استثنای کلِ schema که @map نداشت. جدول در لحظه‌ی نوشتنِ این migration
-- ۰ ردیف داشت، پس rename کاملاً بی‌خطر است.
DO $$ BEGIN
  ALTER TABLE coupons RENAME COLUMN "targetSegment" TO target_segment;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ── ۲) Foreign Keyهای گمشده — ۴ مدلی که با raw SQL ساخته شدند و relation
--       field در schema.prisma نداشتند، پس هیچ FK واقعی روی DB نداشتند ──
DO $$ BEGIN
  ALTER TABLE webhooks
    ADD CONSTRAINT webhooks_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE sms_transactions
    ADD CONSTRAINT sms_transactions_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE guest_profiles
    ADD CONSTRAINT guest_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE restaurant_closures
    ADD CONSTRAINT restaurant_closures_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ۳) حذفِ ایندکس‌های تکراری — هزینه‌ی نوشتنِ اضافه بدونِ فایده‌ی خواندنِ اضافه ──
-- idx_resv_table_active_range: تقریباً عینِ ایندکسِ خودکارِ constraint «no_table_overlap»
-- (GiST، همان ستون‌ها) با پوششِ کمتر (بدونِ شرطِ table_id IS NOT NULL) — بدونِ فایده‌ی
-- کوئری اضافه، فقط ۲ برابر هزینه‌ی maintenance روی هر INSERT/UPDATE رزرو.
DROP INDEX IF EXISTS idx_resv_table_active_range;

-- payments_authority_idx: btree ساده روی authority، کاملاً زیرمجموعه‌ی
-- payments_authority_key (unique btree روی همان ستون) — دومی هر کوئریِ برابری را
-- از قبل پوشش می‌دهد.
DROP INDEX IF EXISTS payments_authority_idx;
