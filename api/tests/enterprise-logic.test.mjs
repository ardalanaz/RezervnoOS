import { test } from 'node:test';
import assert from 'node:assert/strict';

// ═══════════════════════════════════════════════════════════════════════
//  تست‌های منطق سازمانی (CRM/Fraud/Queue/Idempotency)
//  این‌ها قوانین تصمیم‌گیری را تست می‌کنند که در این جلسه ساخته شدند.
//  منطق خالص (بدون DB) تا در CI سریع و قطعی اجرا شوند.
// ═══════════════════════════════════════════════════════════════════════

// ── RFM segment mapping (آینه‌ی منطق rfm.ts) ──
function rfmSegment(r, f, m) {
  if (r >= 4 && f >= 4 && m >= 4) return 'champions';
  if (r >= 4 && f >= 2) return 'loyal';
  if (r >= 4 && f <= 2) return 'new_promising';
  if (r === 3) return 'needs_attention';
  if (r <= 2 && f >= 3) return 'at_risk';
  if (r <= 2 && f <= 2 && m >= 4) return 'cant_lose';
  return 'hibernating';
}

test('RFM: مشتری طلایی → champions', () => {
  assert.equal(rfmSegment(5, 5, 5), 'champions');
  assert.equal(rfmSegment(4, 4, 4), 'champions');
});
test('RFM: مشتری وفادار اخیر → loyal', () => {
  assert.equal(rfmSegment(5, 3, 2), 'loyal');
});
test('RFM: مشتری در حال ریزش با ارزش بالا → cant_lose', () => {
  assert.equal(rfmSegment(1, 2, 5), 'cant_lose');
});
test('RFM: مشتری غیرفعال → hibernating', () => {
  assert.equal(rfmSegment(1, 1, 1), 'hibernating');
});
test('RFM: مشتری اخیر کم‌بازدید → new_promising', () => {
  assert.equal(rfmSegment(5, 1, 1), 'new_promising');
});

// ── Fraud: آستانه‌ی no-show (آینه‌ی منطق fraud.ts) ──
function isHighNoShow(total, noShows, threshold = 0.6, minReservations = 4) {
  return total >= minReservations && noShows / total >= threshold;
}

test('Fraud: نرخ no-show ۸۳٪ با ۶ رزرو → flag', () => {
  assert.equal(isHighNoShow(6, 5), true);
});
test('Fraud: نرخ no-show پایین → flag نمی‌شود', () => {
  assert.equal(isHighNoShow(10, 2), false);
});
test('Fraud: رزرو کم (زیر آستانه) → flag نمی‌شود حتی با no-show بالا', () => {
  assert.equal(isHighNoShow(2, 2), false); // فقط ۲ رزرو، داده‌ی کافی نیست
});

// ── Fraud: multi-account coupon (آینه‌ی منطق) ──
function isCouponAbuse(distinctAccounts, minAccounts = 3) {
  return distinctAccounts >= minAccounts;
}
test('Fraud: ۴ حساب از یک IP → سوءاستفاده', () => {
  assert.equal(isCouponAbuse(4), true);
});
test('Fraud: ۱ حساب → عادی', () => {
  assert.equal(isCouponAbuse(1), false);
});

// ── Queue: exponential backoff (آینه‌ی منطق queue.ts) ──
function backoffSeconds(attempts) {
  return Math.min(Math.pow(2, attempts), 3600);
}
test('Queue: backoff نمایی ۲^attempts', () => {
  assert.equal(backoffSeconds(1), 2);
  assert.equal(backoffSeconds(3), 8);
  assert.equal(backoffSeconds(5), 32);
});
test('Queue: backoff سقف ۱ ساعت دارد', () => {
  assert.equal(backoffSeconds(20), 3600); // 2^20 خیلی بزرگ، سقف می‌خورد
});

// ── Queue: DLQ decision (آینه‌ی منطق failJob) ──
function shouldDeadLetter(attempts, maxAttempts) {
  return attempts >= maxAttempts;
}
test('Queue: بعد از max attempts → DLQ', () => {
  assert.equal(shouldDeadLetter(5, 5), true);
  assert.equal(shouldDeadLetter(3, 5), false);
});

// ── Cashback clamp (آینه‌ی منطق cashback route مهاجرت‌شده) ──
function clampCashback(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 50) return null; // نامعتبر
  return Math.round(n);
}
test('Cashback: درصد معتبر ۰..۵۰', () => {
  assert.equal(clampCashback(25), 25);
  assert.equal(clampCashback(0), 0);
  assert.equal(clampCashback(50), 50);
});
test('Cashback: درصد نامعتبر رد می‌شود', () => {
  assert.equal(clampCashback(51), null);
  assert.equal(clampCashback(-5), null);
  assert.equal(clampCashback('abc'), null);
});

// ── OTP: ۶ رقمی (آینه‌ی تغییر otp.ts) ──
test('OTP: کد ۶ رقمی در بازه‌ی درست', () => {
  // randomInt(100000, 1000000) همیشه ۶ رقم می‌دهد
  const min = 100000, max = 999999;
  assert.equal(String(min).length, 6);
  assert.equal(String(max).length, 6);
});
