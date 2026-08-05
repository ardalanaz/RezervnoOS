import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// ═══════════════════════════════════════════════════════════════════
//  تستِ رگرسیونِ امنیتی — SEC-001 (ممیزیِ ۲۰۲۶-۰۸-۰۵)
//
//  حفره‌ی اصلی: /auth/otp/request (که واقعاً پیامک می‌فرستد) فقط سقفِ
//  per-phone داشت. مهاجم با چرخاندنِ شماره‌ها می‌توانست نامحدود پیامک
//  بفرستد — هم SMS-bombing روی شماره‌های واقعی، هم تخلیه‌ی اعتبارِ پیامک.
//  قانونِ RULES.otpPerIp تعریف شده بود ولی هیچ‌جا وصل نشده بود.
//
//  این تست ساختاری است (نه رفتاری) چون فراخوانیِ واقعیِ route به Redis و
//  دیتابیس نیاز دارد. هدف: اگر کسی این محافظ را حذف کند، CI قرمز شود.
// ═══════════════════════════════════════════════════════════════════

const OTP_SENDERS = [
  'src/app/api/v1/auth/otp/request/route.ts',
  'src/app/api/v1/auth/staff/request/route.ts',
];

describe('SEC-001 — سقفِ per-IP روی endpointهای ارسالِ OTP', () => {
  for (const rel of OTP_SENDERS) {
    test(`${rel} سقفِ per-IP دارد`, () => {
      assert.ok(existsSync(rel), `فایل پیدا نشد: ${rel}`);
      const src = readFileSync(rel, 'utf8');
      assert.match(
        src, /enforceRateLimit\(\s*clientIp\(req\)/,
        `${rel} باید enforceRateLimit(clientIp(req), ...) را صدا بزند — ` +
        'بدونِ آن، چرخاندنِ شماره سقفِ per-phone را دور می‌زند.',
      );
    });
  }

  test('قانونِ otpPerIp همچنان تعریف شده و مصرف می‌شود', () => {
    const rules = readFileSync('src/lib/ratelimit.ts', 'utf8');
    assert.match(rules, /otpPerIp\s*:/, 'قانونِ otpPerIp از ratelimit.ts حذف شده است');

    const route = readFileSync('src/app/api/v1/auth/otp/request/route.ts', 'utf8');
    assert.match(
      route, /RULES\.otpPerIp/,
      'otp/request دیگر از RULES.otpPerIp استفاده نمی‌کند — همان حفره‌ی SEC-001 برگشته است.',
    );
  });

  test('requestOtp سقفِ per-phone را هم نگه داشته (دفاع در عمق)', () => {
    const otp = readFileSync('src/lib/otp.ts', 'utf8');
    assert.match(otp, /otp:rl:/, 'سقفِ per-phone داخلِ requestOtp حذف شده است');
  });
});
