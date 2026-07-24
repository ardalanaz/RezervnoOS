-- 024: چت مشتری ↔ رستوران (Polling-based).
-- دو جدول: chat_threads (یک گفتگو بین کاربر و رستوران، اختیاری لینک به رزرو)
-- و chat_messages. RLS فعال (deny-by-default مثل بقیه‌ی جدول‌ها).

DO $$ BEGIN
  CREATE TYPE chat_sender AS ENUM ('user','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS chat_threads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reservation_id    UUID REFERENCES reservations(id) ON DELETE SET NULL,
  last_message_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_for_user   INTEGER NOT NULL DEFAULT 0,
  unread_for_staff  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- یکتایی: هر (رستوران، کاربر، رزرو) یک thread. چون Postgres در UNIQUE، NULLها را
-- متمایز می‌بیند (هر NULL یکتا)، برای thread عمومی (reservation_id IS NULL) از یک
-- partial unique index جدا استفاده می‌کنیم تا فقط یک thread عمومی هم تضمین شود.
CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_uniq_with_resv
  ON chat_threads (restaurant_id, user_id, reservation_id)
  WHERE reservation_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_uniq_general
  ON chat_threads (restaurant_id, user_id)
  WHERE reservation_id IS NULL;

CREATE INDEX IF NOT EXISTS chat_threads_restaurant_idx ON chat_threads (restaurant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS chat_threads_user_idx ON chat_threads (user_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender      chat_sender NOT NULL,
  staff_id    UUID,
  body        TEXT NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_thread_idx ON chat_messages (thread_id, created_at);

ALTER TABLE chat_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
