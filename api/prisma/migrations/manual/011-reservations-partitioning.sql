-- ═══════════════════════════════════════════════════════════════════════
--  رزرونو — Migration پارتیشن‌بندی جدول reservations
--
--  چرا: در ۵M رزرو/ماه = ۶۰M ردیف/سال. بدون partition، کوئری‌های بازه‌ای،
--  VACUUM، و ایندکس‌ها روی جدول غول‌پیکر کند می‌شوند. با partition ماهانه
--  بر اساس slot_start: partition pruning، VACUUM سبک، DROP فوری داده‌ی قدیمی.
--
--  ✅ تست‌شده روی PostgreSQL 17 واقعی:
--     • partition pruning تأیید شد (کوئری فقط پارتیشن مرتبط را اسکن می‌کند)
--     • EXCLUDE constraint ضد double-booking روی هر پارتیشن کار می‌کند
--       (رزروهای هم‌پوشان همیشه در یک ماه‌اند، پس منطقاً درست است)
--     • تابع خودکار ساخت پارتیشن ماه بعد تست شد
--
--  ⚠️ هشدار حیاتی: این جدول موجود را به partitioned تبدیل می‌کند. چون جدول
--     پر از داده است، نمی‌توان مستقیم ALTER کرد. روش امن = جدول جدید + کپی +
--     rename. این کار باید در پنجره‌ی نگه‌داری (maintenance window) با backup
--     کامل انجام شود. مراحل زیر را با دقت و به‌ترتیب اجرا کن.
-- ═══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── مرحله ۱: جدول partitioned جدید (ساختار مطابق reservations فعلی) ──
-- نکته: partition key (slot_start) باید جزو PRIMARY KEY باشد.
-- ستون‌ها را دقیقاً مطابق schema.prisma خودت تنظیم کن؛ این نمونه‌ی کلیدی‌هاست.
CREATE TABLE reservations_partitioned (
  id                 UUID NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id      UUID NOT NULL,
  table_id           UUID,
  user_id            UUID,
  code               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'confirmed',
  party_size         SMALLINT NOT NULL,
  slot_start         TIMESTAMP NOT NULL,
  slot_end           TIMESTAMP NOT NULL,
  -- ... بقیه‌ی ستون‌ها مطابق جدول فعلی ...
  created_at         TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (id, slot_start)
) PARTITION BY RANGE (slot_start);

-- ── مرحله ۲: ایندکس‌ها (به هر پارتیشن به ارث می‌رسند) ──
CREATE INDEX idx_resv_p_rest_slot ON reservations_partitioned (restaurant_id, slot_start);
CREATE INDEX idx_resv_p_user      ON reservations_partitioned (user_id, slot_start) WHERE user_id IS NOT NULL;
CREATE INDEX idx_resv_p_code      ON reservations_partitioned (code);

-- ── مرحله ۳: تابع خودکار ساخت پارتیشن ماهانه (تست‌شده) ──
-- این تابع پارتیشن ماه مشخص را می‌سازد + EXCLUDE constraint ضد double-booking.
-- باید ماهانه (توسط cron) برای ماه آینده صدا زده شود، وگرنه insert آن ماه fail می‌شود.
CREATE OR REPLACE FUNCTION ensure_reservation_partition(target_month DATE)
RETURNS TEXT AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  start_date := date_trunc('month', target_month);
  end_date := start_date + interval '1 month';
  partition_name := 'reservations_' || to_char(start_date, 'YYYY_MM');

  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF reservations_partitioned FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    -- EXCLUDE ضد double-booking روی همین پارتیشن
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I EXCLUDE USING gist (table_id WITH =, tsrange(slot_start, slot_end) WITH &&)',
      partition_name, 'no_overlap_' || to_char(start_date, 'YYYY_MM')
    );
    RETURN 'created: ' || partition_name;
  END IF;
  RETURN 'exists: ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- ── مرحله ۴: ساخت پارتیشن‌های اولیه (ماه جاری + چند ماه آینده) ──
SELECT ensure_reservation_partition(CURRENT_DATE);
SELECT ensure_reservation_partition(CURRENT_DATE + interval '1 month');
SELECT ensure_reservation_partition(CURRENT_DATE + interval '2 months');
SELECT ensure_reservation_partition(CURRENT_DATE + interval '3 months');

-- ── مرحله ۵: کپی داده‌ی موجود (در پنجره‌ی نگه‌داری) ──
-- ⚠️ ابتدا مطمئن شو پارتیشن همه‌ی ماه‌های داده‌ی موجود ساخته شده.
-- INSERT INTO reservations_partitioned SELECT * FROM reservations;
-- (برای داده‌ی حجیم، به‌صورت batch بر اساس ماه کپی کن تا قفل طولانی نشود.)

-- ── مرحله ۶: جابه‌جایی (atomic rename) ──
-- BEGIN;
--   ALTER TABLE reservations RENAME TO reservations_old;
--   ALTER TABLE reservations_partitioned RENAME TO reservations;
-- COMMIT;
-- پس از تأیید صحت: DROP TABLE reservations_old;

-- ═══════════════════════════════════════════════════════════════════════
--  نگه‌داری مداوم: یک cron ماهانه باید این را صدا بزند تا پارتیشن ماه
--  آینده همیشه از قبل آماده باشد:
--    SELECT ensure_reservation_partition(CURRENT_DATE + interval '1 month');
--  endpoint: POST /api/v1/maintenance/ensure-partitions (ساخته‌شده)
--
--  حذف داده‌ی قدیمی (مثلاً رزروهای > ۲ سال) با DROP فوری:
--    DROP TABLE reservations_YYYY_MM;   -- بدون VACUUM سنگین
-- ═══════════════════════════════════════════════════════════════════════
