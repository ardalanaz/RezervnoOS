#!/bin/sh
# ═══════════════════════════════════════════════════════════
#  رزرونو — اسکریپت بک‌آپ دیتابیس
#  داخل container بک‌آپ اجرا می‌شود (به postgres دسترسی شبکه‌ای دارد).
#  چرخش: فقط N بک‌آپ آخر نگه داشته می‌شود.
#  اختیاری: آپلود به آبجکت‌استوریج اگر تنظیم شده باشد.
# ═══════════════════════════════════════════════════════════
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP="${BACKUP_KEEP:-14}"          # تعداد بک‌آپ برای نگه‌داشتن
PGHOST="${PGHOST:-postgres}"
PGUSER="${POSTGRES_USER:-rezervno}"
PGDATABASE="${POSTGRES_DB:-rezervno}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/rezervno_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] شروع بک‌آپ → $FILE"

# pg_dump با فشرده‌سازی
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" \
  --no-owner --no-acl \
  | gzip > "$FILE"

# بررسی اینکه بک‌آپ خالی نیست (حداقل ۱ کیلوبایت)
SIZE=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE" 2>/dev/null || echo 0)
if [ "$SIZE" -lt 1024 ]; then
  echo "✗ خطا: بک‌آپ خیلی کوچک است ($SIZE بایت) — احتمالاً ناموفق بوده"
  rm -f "$FILE"
  exit 1
fi
echo "✓ بک‌آپ ساخته شد: $FILE ($(echo "$SIZE" | awk '{printf "%.1f KB", $1/1024}'))"

# چرخش: حذف بک‌آپ‌های قدیمی، نگه‌داشتن N آخر
cd "$BACKUP_DIR"
COUNT=$(ls -1 rezervno_*.sql.gz 2>/dev/null | wc -l)
if [ "$COUNT" -gt "$KEEP" ]; then
  ls -1t rezervno_*.sql.gz | tail -n +$((KEEP + 1)) | while read old; do
    echo "  حذف بک‌آپ قدیمی: $old"
    rm -f "$old"
  done
fi
echo "  تعداد بک‌آپ موجود: $(ls -1 rezervno_*.sql.gz 2>/dev/null | wc -l) (سقف: $KEEP)"

# ── آپلود اختیاری به آبجکت‌استوریج (S3-compatible مثل آروان/لیارا) ──
if [ -n "$S3_BUCKET" ] && [ -n "$S3_ENDPOINT" ]; then
  if command -v aws >/dev/null 2>&1; then
    echo "  آپلود به آبجکت‌استوریج..."
    AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
      aws --endpoint-url "$S3_ENDPOINT" s3 cp "$FILE" "s3://$S3_BUCKET/backups/" \
      && echo "  ✓ آپلود شد به s3://$S3_BUCKET/backups/" \
      || echo "  ⚠️ آپلود ناموفق (بک‌آپ محلی سالم است)"
  else
    echo "  ⚠️ aws cli نصب نیست — فقط بک‌آپ محلی"
  fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] بک‌آپ کامل شد"
