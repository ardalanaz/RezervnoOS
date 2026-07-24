-- 028: ساختِ نوعِ enum staff_role و تبدیلِ ستونِ staff.role به آن.
--
-- چرا: schema.prisma فیلدِ role را StaffRole (enum) تعریف می‌کند، اما 0_init نه
-- نوعِ enum را ساخته و نه ستونِ role را از آن نوع کرده — ستون text است (drift از
-- همان جنسِ sms_transactions در P1: 0_init نسبت به schema.prisma ناقص است و DB
-- زنده فقط از راهِ `prisma db push` کامل شده بود). روی یک نصبِ تازه، هر Prisma
-- write روی staff.role (مثلِ POST /restaurant/staff در همین PR) با خطای
-- «type "public.staff_role" does not exist» می‌شکند.
--
-- روی DB زنده که enum از قبل دارد و ستون از قبل staff_role است، این فایل کاملاً
-- no-op است (گاردِ pg_type و گاردِ data_type='text').

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    CREATE TYPE staff_role AS ENUM ('owner','manager','staff','admin');
  END IF;
END $$;

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'staff' AND column_name = 'role') = 'text' THEN
    ALTER TABLE staff ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE staff ALTER COLUMN role TYPE staff_role USING role::staff_role;
    ALTER TABLE staff ALTER COLUMN role SET DEFAULT 'staff';
  END IF;
END $$;
