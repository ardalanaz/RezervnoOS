-- 026: یکپارچه‌سازیِ نهاییِ محافظِ ضدِ رزروِ تکراری (canonical و idempotent)
--
-- چرا: تعریفِ no_table_overlap تا امروز در دو جا تکرار می‌شد — manual/016 و
-- 0_init/EXTRA-after-prisma-migrate.sql. تعریفِ خودِ constraint یکسان بود، اما
-- مدیریتِ ایندکس متفاوت: ۰۱۶ ایندکسِ idx_resv_table_active_range را می‌ساخت و
-- EXTRA همان را حذف می‌کرد. یعنی وضعیتِ نهاییِ دیتابیس به ترتیبِ اجرا وابسته بود.
-- ضمناً EXTRA روی اجرای دوم می‌شکست (DROP COLUMN block_end پیش از DROP CONSTRAINT،
-- در حالی که constraint به همان ستون وابسته است).
--
-- از این پس این فایل تنها منبعِ حقیقت است. ۰۱۶ دست‌نخورده می‌ماند (forward-only)
-- اما توسطِ این فایل نسخ می‌شود؛ EXTRA حذف شده است.
--
-- ⚠️ constraint فقط وقتی بازسازی می‌شود که غایب یا منحرف باشد. بازساختنِ بی‌دلیلِ
-- یک EXCLUDE constraint روی reservations هم گران است (بازسازیِ کاملِ ایندکسِ GiST
-- زیرِ قفلِ ACCESS EXCLUSIVE) و هم پنجره‌ای می‌سازد که در آن هیچ محافظی مقابلِ
-- رزروِ تکراری وجود ندارد.
--
-- وضعیتِ تأییدشده روی production (۲۴ ژوئیه ۲۰۲۶): constraint دقیقاً canonical است،
-- پس این فایل روی آن دیتابیس no-op است.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS block_buffer_minutes SMALLINT NOT NULL DEFAULT 0;

-- block_end هرگز drop نمی‌شود — constraint به آن وابسته است.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'block_end'
  ) THEN
    ALTER TABLE reservations
      ADD COLUMN block_end TIMESTAMP
      GENERATED ALWAYS AS (slot_end + make_interval(mins => block_buffer_minutes)) STORED;
  END IF;
END $$;

DO $$
DECLARE
  def   text;
  st    text;
  valid boolean := true;
  active_statuses CONSTANT text[] := ARRAY[
    'pending','confirmed','auto_confirmed','preparing','checked_in',
    'running_late','arrived','seated','dining'
  ];
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conrelid = 'reservations'::regclass
    AND conname  = 'no_table_overlap'
    AND contype  = 'x';

  IF def IS NULL THEN
    valid := false;
  ELSE
    IF position('block_end' in def) = 0 THEN valid := false; END IF;
    IF position('table_id IS NOT NULL' in def) = 0 THEN valid := false; END IF;
    FOREACH st IN ARRAY active_statuses LOOP
      IF position('''' || st || '''' in def) = 0 THEN valid := false; END IF;
    END LOOP;
  END IF;

  IF valid THEN
    RAISE NOTICE '026: no_table_overlap از قبل canonical است — بدونِ تغییر.';
  ELSE
    RAISE NOTICE '026: no_table_overlap غایب یا منحرف — بازسازی می‌شود.';
    ALTER TABLE reservations DROP CONSTRAINT IF EXISTS no_table_overlap;
    ALTER TABLE reservations ADD CONSTRAINT no_table_overlap
      EXCLUDE USING gist (
        table_id WITH =,
        tsrange(slot_start, block_end) WITH &&
      )
      WHERE (
        status IN ('pending','confirmed','auto_confirmed','preparing','checked_in',
                   'running_late','arrived','seated','dining')
        AND table_id IS NOT NULL
      );
  END IF;
END $$;

-- زائد: تقریباً عینِ ایندکسِ خودکارِ constraint بالا (حسابرسیِ ۰۲۲).
DROP INDEX IF EXISTS idx_resv_table_active_range;

CREATE INDEX IF NOT EXISTS idx_resv_hold_expiry
  ON reservations (hold_expires_at)
  WHERE status = 'pending' AND hold_expires_at IS NOT NULL;
