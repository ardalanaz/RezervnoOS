-- 027: افزودنِ ستونِ name به staff.
--
-- چرا: مدلِ Staff تا امروز فیلدِ name نداشت. پنلِ بیزنس (P2) نامِ نمایشیِ کارمند
-- را نشان و ویرایش می‌کند، پس این ستون لازم است.
-- nullable و بدونِ default است (ردیف‌های موجود → NULL).
-- idempotent: روی DB زنده که ستون نیست اضافه می‌کند؛ اگر باشد no-op.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS name TEXT;
