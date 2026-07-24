-- 023: فعال‌سازی RLS روی جدول‌هایی که بعداً اضافه شدند و RLS نگرفتند.
-- بقیه‌ی ۳۲ جدولِ اصلی همه RLS فعال دارند (deny-by-default؛ بک‌اند با نقش owner
-- دورش می‌زند). این سه جدول جدید بدون RLS مانده بودند:
--   • payments          → تراکنش مالی (authority/ref_id/مبلغ)
--   • platform_settings → کلید API زرین‌پال/کاوه‌نگار به‌صورت متن ساده
--   • restaurant_closures
-- هیچ‌کدام نباید هیچ‌وقت مستقیم از anon key در دسترس باشند.
-- idempotent: ENABLE ROW LEVEL SECURITY روی جدولی که از قبل فعال است بی‌خطر است.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments') THEN
    EXECUTE 'ALTER TABLE payments ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='platform_settings') THEN
    EXECUTE 'ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='restaurant_closures') THEN
    EXECUTE 'ALTER TABLE restaurant_closures ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
