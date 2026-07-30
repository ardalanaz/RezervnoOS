-- 030: دادهٔ مکانیِ رستوران برای Local/Restaurant SEO (ADR 0001, SEO فاز P2).
--
-- افزودنِ فیلدهای مکانی که schema.org PostalAddress + GeoCoordinates لازم دارند و
-- صفحاتِ /r/{slug} و /city/{c} (اپِ apps/seo) از آن‌ها ساخته می‌شوند. مدلِ Restaurant
-- از قبل `price_band` (بازه‌ی قیمت) و `vibes` (amenities) را دارد؛ فقط مکان کم بود.
--
-- ایمنی: همه‌ی ستون‌ها **nullable** (جز country با DEFAULT) → backward-compatible،
-- بدونِ تغییرِ رفتارِ رزرو، بدونِ از دست‌رفتنِ داده. مطابقِ schema.prisma model Restaurant.
--
-- idempotent: همه IF NOT EXISTS؛ اجرای دوباره بی‌خطر. بدونِ CREATE INDEX CONCURRENTLY
-- (داخلِ تراکنشِ ضمنیِ prisma db execute می‌شکند). با apply-sql.sh (`prisma db execute`) اعمال می‌شود.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS address      text,
  ADD COLUMN IF NOT EXISTS city         text,
  ADD COLUMN IF NOT EXISTS district     text,
  ADD COLUMN IF NOT EXISTS postal_code  text,
  ADD COLUMN IF NOT EXISTS country      text NOT NULL DEFAULT 'IR',
  ADD COLUMN IF NOT EXISTS latitude     double precision,
  ADD COLUMN IF NOT EXISTS longitude    double precision;

-- ایندکسِ شهر: صفحاتِ /city/{c} روی رستوران‌های یک شهر فیلتر می‌کنند.
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants (city);
