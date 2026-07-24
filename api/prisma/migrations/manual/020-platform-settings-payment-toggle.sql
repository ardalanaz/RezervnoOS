-- 020: تنظیماتِ سطحِ‌پلتفرم (key/value) + فعال/غیرفعال‌سازیِ پرداخت per-restaurant.
-- بازسازی‌شده از دیفِ schema.prisma؛ روی DB زنده از قبل اعمال شده بود (drift).
-- idempotent است.
--
-- مثل merchant_id زرین‌پال، sandbox flag، کلید کاوه‌نگار — از دیتابیس خوانده
-- می‌شود (نه فقط env)، قابلِ‌ویرایش از پنلِ شرکت بدونِ ری‌دیپلوی. کشِ ۳۰ ثانیه‌ای
-- در لایه‌ی lib (lib/platform-settings.ts).

CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN NOT NULL DEFAULT false;
