-- 019: پرداختِ آنلاینِ زرین‌پال + بیعانه‌ی رزرو.
-- بازسازی‌شده از دیفِ schema.prisma؛ روی DB زنده از قبل اعمال شده بود (drift —
-- رجوع کن به PROJECT-AUDIT-HANDOFF-DATABASE.md بخش ۲). idempotent است.
--
-- یک رزرو می‌تواند چند تلاشِ پرداخت داشته باشد (کاربر رها/تکرار می‌کند)، برای همین
-- payments جدولِ مستقل است، نه فیلدِ روی Reservation.

DO $$ BEGIN
  CREATE TYPE deposit_status AS ENUM ('none', 'pending', 'paid', 'refunded', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deposit_amount_toman INTEGER,
  ADD COLUMN IF NOT EXISTS deposit_status deposit_status NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  provider       TEXT NOT NULL DEFAULT 'zarinpal',
  authority      TEXT UNIQUE,        -- شناسه‌ی تراکنشِ زرین‌پال (قبل از verify)
  ref_id         TEXT,               -- شماره‌ی پیگیریِ نهایی (بعد از verify موفق)
  amount_toman   INTEGER NOT NULL,
  status         payment_status NOT NULL DEFAULT 'pending',
  fail_reason    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payments_reservation_id_idx ON payments (reservation_id);

-- ⚠️ توجه (یافته‌ی حسابرسیِ ۲۰۲۶-۰۷-۱۹): payments_authority_idx که این migration
-- قبلاً اینجا می‌ساخت، عمداً حذف شد چون کاملاً زیرمجموعه‌ی unique index خودکارِ
-- authority بود (پوششِ کامل + هزینه‌ی نوشتنِ اضافه). رجوع کن به migration 022.
