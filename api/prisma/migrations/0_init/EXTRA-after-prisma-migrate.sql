-- ═══════════════════════════════════════════════════════════
--  رزرونو — Constraintهای دیتابیس برای جلوگیری قطعی از تداخل
--  این فایل را بعد از `prisma db push` / `migrate` روی دیتابیس اجرا کن.
--  (Prisma از EXCLUDE constraint و generated column پشتیبانی کامل ندارد)
--  ⚠️ این لایه «منبع حقیقت» است — Redis lock فقط بهینه‌سازی است.
--
--  ✅ تست‌شده روی PostgreSQL 17 واقعی (نه فقط type-check). سه باگ که در
--     تست دیتابیس واقعی کشف و رفع شد:
--   ۱) generated column باید make_interval() باشد، نه (x || ' minutes')::interval
--      — چون cast متن→interval غیرimmutable است و GENERATED ALWAYS را می‌شکند.
--   ۲) چون ستون‌ها timestamp (بدون timezone) هستند، باید tsrange باشد نه tstzrange
--      — tstzrange به timezone نشست وابسته و در ایندکس/constraint غیرimmutable است.
--   ۳) ترتیب اجرا مهم است: CREATE EXTENSION باید پیش از constraint اجرا و commit
--      شود؛ اگر همه در یک transaction باشند و یک statement خطا دهد، extension هم
--      rollback می‌شود. این فایل را جدا از migration اصلی و اول اجرا کن.
-- ═══════════════════════════════════════════════════════════

-- ⚠️ این خط را اول و در صورت امکان در یک transaction جدا اجرا کن (commit مستقل):
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── ستون محاسبه‌شده: پایان مؤثر رزرو = پایان + زمان نظافت/بافر ──
-- این تضمین می‌کند فاصله‌ی نظافت بین دو رزرو روی یک میز رعایت شود.
-- (block_buffer_minutes روی هر رزرو ذخیره می‌شود تا constraint خودکفا باشد)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS block_buffer_minutes SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE reservations
  DROP COLUMN IF EXISTS block_end;
ALTER TABLE reservations
  ADD COLUMN block_end TIMESTAMP
  GENERATED ALWAYS AS (slot_end + make_interval(mins => block_buffer_minutes)) STORED;

-- ── EXCLUDE constraint: هیچ دو رزرو فعالی روی یک میز نباید بازه‌ی مؤثرشان هم‌پوشانی کند ──
-- بازه‌ی مؤثر = [slot_start, block_end) که شامل زمان نظافت است.
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS no_table_overlap;
ALTER TABLE reservations ADD CONSTRAINT no_table_overlap
  EXCLUDE USING gist (
    table_id WITH =,
    tsrange(slot_start, block_end) WITH &&
  )
  WHERE (
    status IN ('pending','confirmed','arrived','seated')
    AND table_id IS NOT NULL
  );

-- ── ایندکس‌های عملکرد (مکمل ایندکس‌های Prisma) ──
-- برای کوئری تداخل و داشبورد در ساعات شلوغ:
CREATE INDEX IF NOT EXISTS idx_resv_table_active_range
  ON reservations USING gist (table_id, tsrange(slot_start, block_end))
  WHERE status IN ('pending','confirmed','arrived','seated');

-- برای پاکسازی هولدهای منقضی:
CREATE INDEX IF NOT EXISTS idx_resv_hold_expiry
  ON reservations (hold_expires_at)
  WHERE status = 'pending' AND hold_expires_at IS NOT NULL;
