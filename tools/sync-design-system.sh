#!/bin/sh
# sync-design-system.sh — تنها منبعِ حقیقتِ دیزاین‌سیستم = shared/؛ این اسکریپت
# آن را به هر سه اپ کپی می‌کند تا drift حذف شود (بدونِ bundler/build).
#
# چرا کپی و نه import: هر اپ یک پروژه‌ی استاتیکِ جداگانه‌ی Vercel با root جدا و
# بدونِ build است؛ فایل‌ها باید فیزیکی داخلِ هر اپ باشند تا سرو شوند.
#
# چه چیزی sync می‌شود (از shared/):
#   css/tokens.css      → پایه‌ی مشترکِ توکن‌ها
#   css/foundation.css  → یکسان در هر سه اپ
#   css/ds-bridge.css   → یکسان در هر سه اپ
#   js/icons.js         → customer نسخه‌ی ESM (عیناً)؛ business/company نسخه‌ی
#                         global (چون با <script> کلاسیک لود می‌شوند و export مجاز نیست)
#
# چه چیزی sync نمی‌شود (app-owned):
#   css/theme.css       → تمِ مخصوصِ هر اپ (بعد از tokens.css لود می‌شود)
#   css/app.css, css/panel.css → استایلِ خاصِ هر اپ
#
# حالت --check (برای CI): چیزی نمی‌نویسد؛ اگر کپی‌ها با منبع فرق داشتند exit 1.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/shared"
CHECK=0
[ "$1" = "--check" ] && CHECK=1

ESM_APPS="customer"
GLOBAL_APPS="business company"
CSS_FILES="tokens.css foundation.css ds-bridge.css"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# نسخه‌ی global از icons.js (export را برمی‌دارد؛ برای <script> کلاسیک).
make_global_icons() {
  sed \
    -e 's/^export function icon(/function icon(/' \
    -e 's/^export const ICON_NAMES = Object\.keys(PATHS);/if (typeof window !== "undefined") window.ICON_NAMES = Object.keys(PATHS);/' \
    "$SRC/js/icons.js"
}

# staging: خروجیِ موردِانتظار را در TMP می‌سازیم، سپس یا کپی یا مقایسه می‌کنیم.
diffcount=0
place() { # place <generated-file> <dest>
  gen="$1"; dest="$2"
  if [ "$CHECK" = "1" ]; then
    if ! cmp -s "$gen" "$dest"; then
      echo "✗ drift: $dest (با منبعِ shared/ نمی‌خواند)"
      diffcount=$((diffcount+1))
    fi
  else
    cp "$gen" "$dest"
    echo "  → $dest"
  fi
}

for app in $ESM_APPS $GLOBAL_APPS; do
  for f in $CSS_FILES; do
    place "$SRC/css/$f" "$ROOT/apps/$app/css/$f"
  done
done

# icons.js — ESM برای customer، global برای پنل‌ها
for app in $ESM_APPS; do
  place "$SRC/js/icons.js" "$ROOT/apps/$app/js/icons.js"
done
make_global_icons > "$TMP/icons.global.js"
for app in $GLOBAL_APPS; do
  place "$TMP/icons.global.js" "$ROOT/apps/$app/js/icons.js"
done

if [ "$CHECK" = "1" ]; then
  if [ "$diffcount" -gt 0 ]; then
    echo "✗ دیزاین‌سیستم هماهنگ نیست ($diffcount فایل). اجرا کن: sh tools/sync-design-system.sh"
    exit 1
  fi
  echo "✓ دیزاین‌سیستم با shared/ هماهنگ است"
else
  echo "✓ sync انجام شد (منبع: shared/)"
fi
