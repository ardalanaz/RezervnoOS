# دیپلوی با Vercel CLI (بدونِ داشبورد)

> برای وقتی به داشبوردِ Vercel دسترسی نداری. همه‌چیز از ترمینال با دستورِ `vercel`.
> این هم API را زنده می‌کند (رفعِ ۴۰۴) و هم اپِ SEO را. مکملِ `docs/DEPLOY_API_VERCEL.md`.

## ۰) پیش‌نیاز
```bash
npm i -g vercel      # نصبِ CLI
vercel login         # ورود (لینکِ ایمیل/گیت‌هاب)
```

## ۱) API (رفعِ ۴۰۴)
API باید از پوشه‌ی `api/` دیپلوی شود — همان‌جا که `vercel` را اجرا می‌کنی «ریشه‌ی پروژه»
می‌شود، پس نیازی به تنظیمِ Root Directory در داشبورد نیست.

```bash
cd api
vercel link            # یک پروژه‌ی جدید بساز یا به پروژه‌ی API موجود لینک کن

# متغیرهای محیطی (برای هر کدام مقدارِ واقعی را پیست می‌کنی؛ در چت نفرست):
vercel env add DATABASE_URL production        # از pooler سوپابیس (?pgbouncer=true)
vercel env add JWT_SECRET production          # ≥ ۳۲ کاراکتر
vercel env add JWT_REFRESH_SECRET production   # ≥ ۳۲ کاراکتر
vercel env add REDIS_URL production
vercel env add REDIS_PASSWORD production
vercel env add ALLOWED_ORIGINS production      # دامنه‌های فرانت، با کاما جدا
vercel env add OTP_DEV_MODE production          # مقدار: false  (وگرنه کدِ ۱۲۳۴ در prod می‌پذیرد)

vercel --prod          # دیپلویِ production → یک URL می‌دهد، مثلاً https://rezervno-api.vercel.app
```
تست: `curl https://<api-url>/api/health` باید ۲۰۰ (یا ۵۰۳ اگر DB/Redis وصل نیست) بدهد،
نه ۴۰۴. اگر ۴۰۴ داد یعنی هنوز از پوشه‌ی درست (`api/`) دیپلوی نشده.

> **Deployment Protection:** اگر خروجی ۴۰۱/صفحه‌ی لاگین داد، حفاظت روشن است:
> `vercel project` → یا در تنظیماتِ پروژه Protection را Standard/Off کن (فعلاً فقط از داشبورد/تنظیماتِ تیم قابل‌تغییر است؛ اگر CLI اجازه نداد، این تنها موردی است که به داشبورد نیاز دارد).

## ۲) اپِ SEO (`apps/seo`)
```bash
cd apps/seo
vercel link
vercel env add SEO_API_BASE production                 # همان URLِ API از مرحله‌ی ۱ (بدونِ اسلشِ آخر)
vercel env add SEO_GOOGLE_SITE_VERIFICATION production  # اختیاری: کدِ تأییدِ Search Console
vercel --prod
```

## ۳) اتصال به دامنه‌ی اصلی + rewrites
برای اینکه صفحاتِ SEO روی `rezervno.ir/r/...` سرو شوند (نه ساب‌دامنه):
- دامنه را به پروژه‌ی فرانتِ اصلی وصل کن: `vercel domains add rezervno.ir` (یا از قبل وصل است).
- روی پروژه‌ی فرانتِ اصلی یک `vercel.json` با rewrite بگذار که `/r/:p*`، `/city/:p*`،
  `/cuisine/:p*`، `/sitemap.xml`، `/robots.txt` را به دامنه‌ی اپِ SEO پروکسی کند. مثال:
```json
{ "rewrites": [
  { "source": "/r/:path*",       "destination": "https://<seo-url>/r/:path*" },
  { "source": "/city/:path*",    "destination": "https://<seo-url>/city/:path*" },
  { "source": "/cuisine/:path*", "destination": "https://<seo-url>/cuisine/:path*" },
  { "source": "/sitemap.xml",    "destination": "https://<seo-url>/sitemap.xml" },
  { "source": "/robots.txt",     "destination": "https://<seo-url>/robots.txt" }
]}
```
- همچنین فرانت باید بداند API کجاست: در `apps/customer/index.html` تگِ
  `<meta name="rz-api-base" content="https://<api-url>">` را ست کن (یا `window.RZ_API_BASE`).

## ۴) بعد از دیپلوی
- `curl https://rezervno.ir/sitemap.xml` → باید URLهای رستوران/شهر/آشپزی را بدهد.
- در Google Search Console دامنه را ثبت و sitemap را submit کن (کدِ تأیید = `SEO_GOOGLE_SITE_VERIFICATION`).
- دستورِ به‌روزرسانیِ env بعداً: `vercel env rm <NAME> production` سپس دوباره `add`، و `vercel --prod`.

> هیچ سکرتی را در چت/کد/گیت commit نکن؛ همه از `vercel env add` می‌آیند.
