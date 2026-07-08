#!/bin/sh
set -e

echo "→ صبر برای آماده‌شدن دیتابیس..."
# تلاش تا ۳۰ بار (۶۰ ثانیه) برای اتصال به دیتابیس
i=0
until npx prisma db execute --schema=prisma/schema.prisma --stdin <<'PING' >/dev/null 2>&1
SELECT 1;
PING
do
  i=$((i+1))
  if [ "$i" -ge 30 ]; then echo "✗ دیتابیس آماده نشد"; exit 1; fi
  echo "  ...تلاش $i"
  sleep 2
done
echo "✓ دیتابیس آماده است"

echo "→ اعمال schema روی دیتابیس..."
npx prisma db push --skip-generate --accept-data-loss

echo "→ افزودن constraint قفل دو-لایه (اگر نباشد)..."
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL' || echo "  (constraint احتمالاً از قبل هست)"
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE reservations ADD CONSTRAINT no_table_overlap
  EXCLUDE USING gist (
    table_id WITH =,
    tstzrange(slot_start, slot_end) WITH &&
  )
  WHERE (status IN ('pending','confirmed','arrived') AND table_id IS NOT NULL);
SQL

# seed خودکار فقط اگر RUN_SEED=true باشد (برای اولین راه‌اندازی)
if [ "$RUN_SEED" = "true" ]; then
  echo "→ اجرای seed (داده‌ی اولیه)..."
  npx prisma db seed || echo "  (seed قبلاً اجرا شده یا خطا داشت)"
fi

echo "→ استارت سرور..."
exec npm run start
