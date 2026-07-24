# رزرونو — تست بار و امنیت

سه اسکریپت k6. **همه نیاز به یک بک‌اندِ دیپلوی‌شده و در حال اجرا دارند** (`BASE_URL`).
روی محیطِ خودت اجرا کن، نه production واقعی زیر بارِ کاربر.

## ⚠️ نکته‌ی حیاتی درباره‌ی «۴۰۰هزار کاربر همزمان»
این عدد را **نمی‌توان از یک ماشین** تولید کرد (محدودیت CPU/شبکه/فایل‌دیسکریپتور).
دو راهِ درست:
1. **k6 Cloud** (ساده‌ترین): `k6 cloud loadtest/k6-scale-400k.js` — خودش روی چند لودزنر توزیع می‌کند.
2. **چند instance موازی**: مثلاً ۴۰ ماشین، هرکدام `k6 run --vus 10000`.

«۴۰۰هزار کاربر» با think-time واقعی ≈ ۳۰٬۰۰۰–۸۰٬۰۰۰ درخواست/ثانیه (نه ۴۰۰هزار RPS).

## اسکریپت‌ها

### ۱. `k6-load-test.js` — تستِ پایه (تا ۵۰۰ کاربر)
برای تستِ سریعِ صحت از یک ماشین، قبل از تستِ بزرگ.
```bash
k6 run -e BASE_URL=https://api.rezervno.ir loadtest/k6-load-test.js
```

### ۲. `k6-scale-400k.js` — تستِ مقیاسِ بالا (هدف ۴۰۰هزار)
مسیرهای داغِ خواندنی را با think-time واقع‌گرایانه می‌زند.
```bash
# محلی (مقیاس‌کوچک، فقط تستِ صحت):
k6 run -e BASE_URL=https://api.rezervno.ir loadtest/k6-scale-400k.js
# مقیاسِ واقعی:
k6 cloud -e BASE_URL=https://api.rezervno.ir loadtest/k6-scale-400k.js
```
معیار موفقیت: P95 < ۵۰۰ms، نرخ خطا < ۵٪، و دیدنِ چند 429 (یعنی rate-limit زیر بار کار می‌کند).

### ۳. `k6-security-probe.js` — تستِ دفاع‌ها
چهار چیز را می‌سنجد: rate limiting، مقاومت در برابر SQL injection، اجبارِ auth، و رد کردنِ XSS.
```bash
k6 run -e BASE_URL=https://api.rezervno.ir loadtest/k6-security-probe.js
```
**فقط روی محیطِ خودت و با اجازه.** اجرای این روی سیستمِ دیگران غیرقانونی است.

## پیش‌نیازِ رسیدن به ۴۰۰هزار کاربر (سمتِ زیرساخت)
تستِ بار فقط وقتی معنی دارد که زیرساخت برای مقیاس آماده باشد:
- [ ] چند instance از API پشتِ load balancer (نه تک‌instance)
- [ ] Postgres با read-replica (کدِ `dbRead` از قبل آماده است — فقط `DATABASE_REPLICA_URL` بده)
- [ ] Redis cluster (کدِ `REDIS_CLUSTER_NODES` از قبل پشتیبانی می‌شود)
- [ ] connection pooling با PgBouncer (در `DATABASE_URL`)
- [ ] CDN جلوی سه اپِ استاتیک
