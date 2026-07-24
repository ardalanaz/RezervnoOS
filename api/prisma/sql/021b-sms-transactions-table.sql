-- 021b: ساختِ جدولِ sms_transactions.
--
-- چرا اینجا و نه در 0_init: مدلِ SmsTransaction در schema.prisma هست، اما
-- هیچ فایلِ SQLی آن را CREATE نمی‌کرد — فقط از راهِ `prisma db push` در CI
-- ساخته می‌شد. روی یک نصبِ تازه‌ی Docker، FKِ 022
-- (sms_transactions_restaurant_id_fkey) با P1014 می‌شکست.
-- شماره‌ی 021b انتخاب شد تا در ترتیبِ اجرا پیش از 022 قرار گیرد بدونِ
-- ویرایشِ retroactive یک مایگریشنِ اعمال‌شده.
-- idempotent است: روی DB زنده که جدول از قبل وجود دارد، no-op.

CREATE TABLE IF NOT EXISTS sms_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  delta         INT NOT NULL,
  reason        TEXT NOT NULL,
  balance_after INT NOT NULL,
  actor_id      UUID,
  note          TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_tx_restaurant_created
  ON sms_transactions (restaurant_id, created_at DESC);
