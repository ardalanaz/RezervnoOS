-- 021: جدولِ تعطیلاتِ خاصِ رستوران (بستنِ دستیِ روزهای مشخص).
-- بازسازی‌شده از دیفِ schema.prisma؛ روی DB زنده از قبل اعمال شده بود (drift).
-- idempotent است.
--
-- قبلاً کدِ hours.ts/availability.ts/reservations.ts با raw SQL از این جدول
-- SELECT می‌زدند بدونِ این‌که هیچ migrationی آن را ساخته باشد → PUT /restaurant/hours
-- با «relation does not exist» می‌شکست تا این جدول دستی ساخته شد.
--
-- نکته: ستونِ block_buffer_minutes روی reservations از migration 018/EXTRA-after-
-- prisma-migrate.sql (فایلِ همراهِ 0_init) از قبل وجود داشت؛ کاری که اینجا مانده
-- بود فقط ساختِ خودِ جدولِ restaurant_closures بود، نه آن ستون.

CREATE TABLE IF NOT EXISTS restaurant_closures (
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  closure_date  DATE NOT NULL,
  reason        TEXT,
  PRIMARY KEY (restaurant_id, closure_date)
);
