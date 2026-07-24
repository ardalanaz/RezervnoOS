import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ═══════════════════════════════════════════════════════════
//  تست بار مقیاس‌بالا رزرونو (k6) — هدف: شبیه‌سازی ~۴۰۰٬۰۰۰ کاربر
//
//  ⚠️ واقعیت مهم درباره‌ی «۴۰۰هزار کاربر همزمان»:
//  این عدد را نمی‌توان از یک ماشین تولید کرد. دو راهِ درست:
//   ۱) k6 Cloud (توزیع خودکار روی چند لودزنِر جغرافیایی):
//        k6 cloud k6-scale-400k.js
//   ۲) چند instance محلی/ابری موازی، هرکدام بخشی از بار:
//        (مثلاً ۴۰ ماشین × ۱۰٬۰۰۰ VU)
//
//  «۴۰۰هزار کاربر» ≠ «۴۰۰هزار درخواست در ثانیه». یک کاربر واقعی هر چند
//  ثانیه یک درخواست می‌زند. با think-time واقع‌گرایانه (۵-۱۵ ثانیه)،
//  ۴۰۰هزار کاربرِ همزمان ≈ ۳۰٬۰۰۰–۸۰٬۰۰۰ RPS می‌شود. options زیر بر همین مبناست.
//
//  اجرا (نمونه‌ی محلیِ مقیاس‌کوچک برای تستِ صحت، قبل از cloud):
//    k6 run -e BASE_URL=https://api.rezervno.ir loadtest/k6-scale-400k.js
// ═══════════════════════════════════════════════════════════

const errorRate = new Trend('errors', true);
const rl429 = new Counter('rate_limited_429');   // چند بار rate-limit خوردیم (باید >۰ باشد زیر بار سنگین = دفاع کار می‌کند)
const availTrend = new Trend('availability_ms', true);

export const options = {
  scenarios: {
    // سناریوی واقع‌گرایانه: کاربرها تدریجی وارد می‌شوند، مرور می‌کنند، خارج می‌شوند.
    realistic_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m',  target: 5000 },    // گرم‌کردن
        { duration: '5m',  target: 50000 },   // بار سنگین
        { duration: '10m', target: 200000 },  // نزدیک هدف (روی cloud/distributed)
        { duration: '5m',  target: 400000 },  // اوجِ هدف
        { duration: '10m', target: 400000 },  // پایداری در اوج
        { duration: '3m',  target: 0 },       // خنک‌شدن
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1200'],  // ۹۵٪ زیر ۵۰۰ms
    errors: ['p(95)<0.05'],                            // نرخ خطا زیر ۵٪
    http_req_failed: ['rate<0.05'],
  },
  // DNS/connection reuse برای واقع‌گرایی
  noConnectionReuse: false,
  discardResponseBodies: true,  // صرفه‌جویی حافظه در بار بالا
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const API = `${BASE}/api/v1`;

// اسلاگ‌های نمونه (در محیط واقعی از seed یا لیست واقعی بخوان)
const SLUGS = ['bistro-vista', 'cafe-noor', 'sea-breeze', 'golden-fork', 'urban-table', 'saffron-house'];
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

export default function () {
  // ── ۱. صفحه‌ی اصلی: لیست رستوران‌ها (داغ‌ترین مسیر خواندنی) ──
  let res = http.get(`${API}/restaurants`, { tags: { name: 'restaurants_list' } });
  check(res, { 'لیست ۲۰۰': r => r.status === 200 }) || errorRate.add(1);
  if (res.status === 429) rl429.add(1);
  errorRate.add(res.status >= 400 && res.status !== 429 ? 1 : 0);

  sleep(Math.random() * 3 + 2);  // think-time: ۲-۵ ثانیه مرور

  // ── ۲. باز کردن یک رستوران + availability (دومین مسیر داغ) ──
  const slug = pick(SLUGS);
  const today = new Date().toISOString().slice(0, 10);
  res = http.get(`${API}/restaurants/${slug}/availability?date=${today}&party=2`, { tags: { name: 'availability' } });
  availTrend.add(res.timings.duration);
  check(res, { 'availability پاسخ داد': r => r.status === 200 || r.status === 404 });
  if (res.status === 429) rl429.add(1);

  sleep(Math.random() * 10 + 5);  // think-time: ۵-۱۵ ثانیه (کاربر تصمیم می‌گیرد)
}

// خلاصه‌ی سفارشی
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values['p(95)']?.toFixed(0);
  const errs = (data.metrics.http_req_failed?.values.rate * 100)?.toFixed(2);
  const rl = data.metrics.rate_limited_429?.values.count || 0;
  return {
    stdout: `
╔══════════════════════════════════════════╗
║  نتیجه‌ی تست بار رزرونو                    ║
╠══════════════════════════════════════════╣
║  P95 latency:      ${p95} ms
║  نرخ خطا:          ${errs}%
║  rate-limit (429): ${rl}  (>۰ یعنی دفاع DDoS کار می‌کند)
╚══════════════════════════════════════════╝
`,
  };
}
