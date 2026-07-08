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

# ═══════════════════════════════════════════════════════════
#  اعمال schema با migration history واقعی (نه db push).
#  C5: قبلاً `db push --accept-data-loss` بود که روی هر استارت می‌توانست
#  ستون/داده‌ی production را حذف کند. حالا migrate deploy فقط migrationهای
#  ثبت‌شده را به‌ترتیب اعمال می‌کند و چیزی drop نمی‌کند.
# ═══════════════════════════════════════════════════════════
echo "→ اعمال migrationها (prisma migrate deploy)..."
if ! npx prisma migrate deploy; then
  echo "✗ migrate deploy ناموفق بود — استارت متوقف شد (برای جلوگیری از اجرای ناقص)"
  exit 1
fi

# ═══════════════════════════════════════════════════════════
#  اعمال constraintهای خارج از توان Prisma (EXCLUDE + generated column).
#  C4: قبلاً اینجا یک کانسترینت اشتباه (tstzrange + slot_end بدون زمان نظافت +
#  مجموعه‌ی وضعیت ناقص) ساخته می‌شد. حالا فایل canonical که تست‌شده و درست است
#  اجرا می‌شود (tsrange + block_end + مجموعه‌ی کامل وضعیت‌های فعال).
#  این فایل idempotent است (DROP IF EXISTS / ADD COLUMN IF NOT EXISTS).
# ═══════════════════════════════════════════════════════════
echo "→ اعمال constraint قفل دو-لایه و ستون block_end (canonical)..."
if [ -f prisma/migrations/0_init/EXTRA-after-prisma-migrate.sql ]; then
  npx prisma db execute --schema=prisma/schema.prisma \
    --file prisma/migrations/0_init/EXTRA-after-prisma-migrate.sql \
    || { echo "✗ اعمال EXTRA constraint ناموفق — استارت متوقف شد"; exit 1; }
  echo "✓ constraint و ستون block_end اعمال شد"
else
  echo "✗ فایل EXTRA-after-prisma-migrate.sql یافت نشد — استارت متوقف شد"
  exit 1
fi

# seed خودکار فقط اگر RUN_SEED=true باشد (برای اولین راه‌اندازی)
if [ "$RUN_SEED" = "true" ]; then
  echo "→ اجرای seed (داده‌ی اولیه)..."
  npx prisma db seed || echo "  (seed قبلاً اجرا شده یا خطا داشت)"
fi

echo "→ استارت سرور..."
exec npm run start
