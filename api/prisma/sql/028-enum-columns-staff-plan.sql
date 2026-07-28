-- 028: ارتقای ستون‌های staff.role و tenants.plan از TEXT به enum
--
-- چرا: 0_init/migration.sql این دو ستون را TEXT می‌سازد، اما schema.prisma
-- آن‌ها را enum می‌داند (StaffRole → staff_role، SubscriptionPlan →
-- subscription_plan). این‌ها enumهایی هستند که schema تعریف می‌کند ولی هیچ
-- CREATE TYPE در مسیرِ نصبِ تازه (migrate deploy) نمی‌سازد — هم‌خانواده‌ی
-- باگِ sms_transactions.
--
-- روی DBِ زنده (prisma db push) این ستون‌ها از قبل enum هستند، پس این فایل
-- کاملاً idempotent و no-op است. فقط یک نصبِ تازه‌ی Docker را با schema
-- و با production هم‌تراز می‌کند.
--
-- ترتیب: 028 بعد از 0_init و بعد از هر داده‌ای که ممکن است در این ستون‌ها
-- باشد اجرا می‌شود؛ USING cast مقادیرِ موجود را حفظ می‌کند.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    CREATE TYPE staff_role AS ENUM ('owner','manager','staff','admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE subscription_plan AS ENUM ('free','starter','pro','enterprise');
  END IF;
END $$;

-- ارتقای ستون‌ها فقط اگر هنوز enum نشده‌اند (روی زنده no-op).
DO $$
BEGIN
  IF (SELECT t.typtype FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_type t ON t.oid = a.atttypid
      WHERE c.relname='staff' AND a.attname='role') = 'b' THEN
    ALTER TABLE staff
      ALTER COLUMN role DROP DEFAULT,
      ALTER COLUMN role TYPE staff_role USING role::staff_role,
      ALTER COLUMN role SET DEFAULT 'staff'::staff_role;
  END IF;

  IF (SELECT t.typtype FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_type t ON t.oid = a.atttypid
      WHERE c.relname='tenants' AND a.attname='plan') = 'b' THEN
    ALTER TABLE tenants
      ALTER COLUMN plan DROP DEFAULT,
      ALTER COLUMN plan TYPE subscription_plan USING plan::subscription_plan,
      ALTER COLUMN plan SET DEFAULT 'free'::subscription_plan;
  END IF;
END $$;
