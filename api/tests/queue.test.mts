import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// import پویا عمداً — به دلیل باگ محیطیِ import استاتیک چندنامی در ترکیب
// tsx+node:test در این sandbox (شرح کامل در tests/validate.test.mts).
const { computeBackoffSeconds, shouldDeadLetter } = await import('../src/lib/queue.ts');

describe('computeBackoffSeconds', () => {
  test('backoff نمایی: 2^attempts ثانیه', () => {
    assert.equal(computeBackoffSeconds(1), 2);
    assert.equal(computeBackoffSeconds(3), 8);
    assert.equal(computeBackoffSeconds(5), 32);
  });
  test('سقف ۱ ساعت (۳۶۰۰ ثانیه) دارد', () => {
    assert.equal(computeBackoffSeconds(20), 3600); // 2^20 خیلی بزرگ‌تر از سقف
  });
});

describe('shouldDeadLetter', () => {
  test('بعد از رسیدن به maxAttempts → true (DLQ)', () => {
    assert.equal(shouldDeadLetter(5, 5), true);
    assert.equal(shouldDeadLetter(6, 5), true);
  });
  test('قبل از رسیدن به maxAttempts → false (retry)', () => {
    assert.equal(shouldDeadLetter(3, 5), false);
  });
});
