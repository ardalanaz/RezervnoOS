-- 029: رویدادبوسِ رفتاریِ append-only (Data Platform · فاز ۱).
--
-- جدولِ کانونیِ platform_events که رویدادهای رفتاریِ همه‌ی دامنه‌ها را جمع می‌کند
-- (مکملِ reservation_events که فقط رزرو را پوشش می‌دهد). append-only، بدونِ FKِ سخت
-- تا درج بی‌قفل باشد و anonymize ارجاع نشکند. مطابقِ schema.prisma model PlatformEvent.
--
-- idempotent: همه‌چیز IF NOT EXISTS؛ اجرای دوباره بی‌خطر است. بدونِ CREATE INDEX
-- CONCURRENTLY (داخلِ تراکنشِ ضمنیِ prisma db execute می‌شکند — همان تله‌ی 003).
-- توسط apply-sql.sh با `prisma db execute` اعمال می‌شود (نه psql).

CREATE TABLE IF NOT EXISTS platform_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type           text        NOT NULL,
  occurred_at    timestamptz NOT NULL,
  ingested_at    timestamptz NOT NULL DEFAULT now(),
  tenant_id      uuid,
  restaurant_id  uuid,
  user_id        uuid,
  staff_id       uuid,
  session_id     text,
  correlation_id text,
  source         text        NOT NULL,
  device         jsonb,
  geo            jsonb,
  payload        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer     NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS platform_events_type_occurred_idx        ON platform_events (type, occurred_at);
CREATE INDEX IF NOT EXISTS platform_events_restaurant_occurred_idx  ON platform_events (restaurant_id, occurred_at);
CREATE INDEX IF NOT EXISTS platform_events_user_occurred_idx        ON platform_events (user_id, occurred_at);
CREATE INDEX IF NOT EXISTS platform_events_correlation_idx          ON platform_events (correlation_id);

-- RLS مثل بقیه‌ی جداول: deny-by-default برای anon key؛ بک‌اند با نقشِ سرویس دورش می‌زند.
-- رویدادِ رفتاری هرگز نباید مستقیم از anon key خواندنی/نوشتنی باشد.
-- idempotent: ENABLE روی جدولی که از قبل فعال است بی‌خطر است.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='platform_events') THEN
    EXECUTE 'ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
