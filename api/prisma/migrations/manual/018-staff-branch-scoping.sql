-- 018: چندشعبه‌ای — قفلِ کارمند به یک شعبه‌ی مشخص (Multi-branch / Multi-location).
-- بازسازی‌شده از دیفِ schema.prisma؛ روی DB زنده (zmyuvtpbchytqvtgyewt) از قبل اعمال
-- شده بود ولی فایلِ migration برایش کامیت نشده بود (drift مستندشده در
-- PROJECT-AUDIT-HANDOFF-DATABASE.md بخش ۲). این فایل idempotent است — اجرای دوباره
-- روی DB زنده هم بی‌خطر است (IF NOT EXISTS همه‌جا).
--
-- NULL = دسترسی به همه‌ی شعبه‌های تنانت (owner/manager)؛ ست‌شده = قفل به یک شعبه.
-- انتخاب شعبه‌ی فعال از سمتِ کلاینت با هدرِ X-Restaurant-Id انجام می‌شود (نه JWT)،
-- یعنی بدونِ نیاز به ورودِ دوباره قابلِ‌سوییچ است. منطقِ مرکزی: lib/staff-helpers.ts.

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

CREATE INDEX IF NOT EXISTS staff_restaurant_id_idx ON staff (restaurant_id);
