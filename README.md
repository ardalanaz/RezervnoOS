# رزرونو (RezervoNo) — سیستم کامل رزرو رستوران

پلتفرم SaaS رزرو رستوران — سه اپلیکیشن + بک‌اند مشترک، آماده‌ی راه‌اندازی روی سرور.

---

## معماری (مدل اوبر)

سه فرانت‌اند مجزا که به یک بک‌اند مشترک وصل‌اند:
- **اپ مشتری** — رزرو، باشگاه مشتریان، پروفایل
- **پنل رستوران** — مدیریت رزرو، میز، باشگاه، آنالیز، کمپین پیامکی
- **پنل شرکت** — مدیریت کل پلتفرم (super-admin)

**Stack:** Next.js 14 + Prisma + PostgreSQL 16 + Redis + JWT

---

## 🚀 راه‌اندازی

نیاز: سرور لینوکس با **Docker** و **Docker Compose**.

### قدم مشترک: تنظیمات
```bash
cp .env.example .env
nano .env
#   - POSTGRES_PASSWORD: یک رمز قوی
#   - JWT_SECRET و JWT_REFRESH_SECRET: با  openssl rand -base64 48  بساز
#   - RUN_SEED=true  (برای اولین راه‌اندازی)
```

سپس یکی از دو حالت زیر:

### حالت A — تست محلی (HTTP، بدون دامنه)
برای امتحان روی سیستم خودت یا آی‌پی سرور:
```bash
docker compose --profile http up -d --build
```
- اپ مشتری: `http://آی‌پی‌سرور/`
- پنل رستوران: `http://آی‌پی‌سرور/business/`
- پنل شرکت: `http://آی‌پی‌سرور/company/`

### حالت B — تولید (HTTPS خودکار، با دامنه) ✅ برای فروش
نیاز: دامنه‌ای که به آی‌پی سرور اشاره کند (رکورد A) + پورت‌های ۸۰ و ۴۴۳ باز.
```bash
# دامنه را در .env بگذار:  DOMAIN=رستوران‌تو.ir
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
Caddy خودکار گواهی SSL از Let's Encrypt می‌گیرد و هر ۹۰ روز تمدید می‌کند. صفر تنظیم دستی.
- اپ مشتری: `https://دامنه‌ات/`
- پنل رستوران: `https://دامنه‌ات/business/`
- پنل شرکت: `https://دامنه‌ات/company/`

### قدم آخر (هر دو حالت): مدیر پلتفرم
```bash
docker compose logs api | grep PLATFORM_ADMIN_TENANT_ID
#   خط چاپ‌شده را در .env بگذار، RUN_SEED=false کن، و دوباره up بزن
```

---

## 🔑 ورود به سیستم (داده‌ی seed)

| پنل | شماره ورود | توضیح |
|---|---|---|
| اپ مشتری | هر شماره‌ای | کاربر جدید فرم ثبت‌نام می‌بیند |
| پنل رستوران | `09121111111` | مدیر رستوران نمونه |
| پنل شرکت | `09120000000` | مدیر پلتفرم |

در حالت `OTP_DEV_MODE=true`، کد ورود در پاسخ API برمی‌گردد (برای تست بدون پیامک واقعی). برای محصول واقعی `false` بگذار و `KAVENEGAR_API_KEY` را تنظیم کن.

---

## 📁 ساختار

```
rezervno-deploy/
├── docker-compose.yml      ← ارکستراسیون کل سیستم
├── .env.example            ← تنظیمات
├── README.md · LAUNCH-GUIDE.md
├── apps/
│   ├── customer/index.html ← اپ مشتری
│   ├── business/index.html ← پنل رستوران
│   └── company/index.html  ← پنل شرکت
├── api/                    ← بک‌اند Next.js
│   ├── Dockerfile + docker-entrypoint.sh
│   ├── prisma/ (schema + seed + migration)
│   └── src/ (app/api/v1 + lib + middleware)
└── deploy/nginx/nginx.conf
```

---

## 🛠 دستورهای مفید

```bash
docker compose logs -f api      # لاگ بک‌اند
docker compose logs -f          # لاگ همه
docker compose restart api      # ری‌استارت بک‌اند
docker compose down             # توقف
docker compose down -v          # توقف + پاک‌کردن داده (احتیاط!)

# seed دستی (اگر RUN_SEED نگذاشتی)
docker compose exec api npx prisma db seed

# اتصال به دیتابیس
docker compose exec postgres psql -U rezervno rezervno
```

---

## 💾 بک‌آپ خودکار

سیستم بک‌آپ **داخل بسته** است — سرویس `backup` خودکار هر شب از دیتابیس بک‌آپ می‌گیرد.

```bash
docker compose exec backup /scripts/backup.sh    # بک‌آپ فوری
docker compose exec backup /scripts/list.sh      # لیست بک‌آپ‌ها
docker compose exec backup /scripts/restore.sh   # بازیابی از آخرین بک‌آپ
```

تنظیمات در `.env`: `BACKUP_CRON` (زمان‌بندی)، `BACKUP_KEEP` (تعداد)، و `S3_*` برای آپلود به آبجکت‌استوریج.

**جزئیات کامل (مهم — شامل بازیابی و بک‌آپ خارج از سرور): `BACKUP-GUIDE.md`**

---

## 🔒 قبل از فروش/لانچ واقعی

فایل **`LAUNCH-GUIDE.md`** را بخوان — راهنمای کامل:
1. **HTTPS** (Caddy یا certbot) — ضروری
2. **CDN/WAF** (ArvanCloud / Cloudflare) — دفاع DDoS
3. **بک‌آپ خودکار دیتابیس** (cron + pg_dump)
4. **کلید Kavenegar** برای پیامک واقعی

---

## ✅ امکانات

**مشتری:** کشف رستوران، رزرو با جلوگیری از تداخل (قفل دو-لایه)، ثبت‌نام، باشگاه مشتریان، تاریخچه
**رستوران:** داشبورد، رزروها، پلان سالن (میز با اسم دلخواه)، باشگاه، آنالیز رفتار مشتری، کش‌بک، کمپین پیامکی
**شرکت:** مدیریت رستوران‌ها، آمار کلی پلتفرم، اشتراک‌ها

همه‌ی پنل‌ها: ورود با OTP، پیامک واقعی (Kavenegar)، RTL فارسی، ریت‌لیمیت، محافظت XSS.
