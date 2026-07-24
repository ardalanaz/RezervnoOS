# راه‌اندازی HTTPS — رزرونو

این راهنما HTTPS را با **Caddy** فعال می‌کند: گواهی SSL خودکار از Let's Encrypt، تمدید خودکار، صفر تنظیم دستی.

> چرا HTTPS ضروری است: بدون آن، کدهای OTP و توکن‌های ورود روی شبکه قابل شنود هستند. **هیچ‌وقت بدون HTTPS نفروش/لانچ نکن.**

---

## پیش‌نیازها

1. **دامنه** — مثلاً `rezervno.ir` (از ایرنیک یا هر ثبت‌کننده‌ای)
2. **رکورد DNS** — یک رکورد `A` که دامنه را به آی‌پی سرورت اشاره دهد:
   ```
   rezervno.ir.       A    188.x.x.x   (آی‌پی سرورت)
   www.rezervno.ir.   A    188.x.x.x
   ```
3. **پورت‌های باز** — ۸۰ و ۴۴۳ روی سرور (فایروال/security group):
   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   ```

> **مهم:** قبل از ادامه، مطمئن شو دامنه واقعاً به سرور اشاره می‌کند:
> ```bash
> dig +short rezervno.ir     # باید آی‌پی سرورت را نشان دهد
> ```
> اگر DNS هنوز منتشر نشده (تا چند ساعت طول می‌کشد)، Caddy نمی‌تواند گواهی بگیرد.

---

## راه‌اندازی

```bash
# ۱) دامنه را در .env بگذار
nano .env
#   DOMAIN=rezervno.ir

# ۲) با override تولید اجرا کن
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

تمام! Caddy خودکار:
- گواهی SSL از Let's Encrypt می‌گیرد (چند ثانیه)
- HTTP را به HTTPS ریدایرکت می‌کند
- گواهی را هر ۹۰ روز قبل از انقضا تمدید می‌کند

بررسی:
```bash
docker compose logs caddy        # باید «certificate obtained» ببینی
curl -I https://rezervno.ir      # باید 200 برگردد
```

---

## رفع اشکال

**گواهی گرفته نشد / خطای ACME:**
- مطمئن شو `dig +short دامنه‌ات` آی‌پی سرور را نشان می‌دهد (DNS منتشر شده)
- مطمئن شو پورت ۸۰ از بیرون باز است (Let's Encrypt برای تأیید به آن می‌زند)
- لاگ: `docker compose logs caddy`

**Let's Encrypt محدودیت نرخ دارد** (۵ گواهی ناموفق در ساعت). اگر زیاد تست کردی و گیر کردی، چند ساعت صبر کن یا برای تست از staging استفاده کن (به Caddyfile اضافه کن: `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory`).

**می‌خواهی موقت بدون HTTPS تست کنی:**
```bash
docker compose --profile http up -d        # HTTP روی پورت ۸۰
```

**گواهی‌ها کجا ذخیره می‌شوند:**
در volume به نام `caddy_data`. این را پاک نکن (`docker compose down -v` پاکش می‌کند) وگرنه باید دوباره گواهی بگیری.

---

## بعد از HTTPS

وقتی دامنه با HTTPS کار کرد:
- `OTP_DEV_MODE=false` بگذار (تا کد OTP در پاسخ API لو نرود)
- `KAVENEGAR_API_KEY` را تنظیم کن (تا OTP واقعاً پیامک شود)
- سراغ بک‌آپ خودکار و CDN/WAF برو (در `LAUNCH-GUIDE.md`)
