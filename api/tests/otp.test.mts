import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// import پویا عمداً — به دلیل باگ محیطیِ import استاتیک چندنامی در ترکیب
// tsx+node:test در این sandbox (شرح کامل در tests/validate.test.mts).
const { normalizePhone } = await import('../src/lib/otp.ts');

describe('normalizePhone', () => {
  test('فرمت 09xxxxxxxxx به +98 تبدیل می‌شود', () => {
    assert.equal(normalizePhone('09123456789'), '+989123456789');
  });
  test('فرمت با فاصله/خط‌تیره هم پذیرفته می‌شود (غیررقم حذف می‌شود)', () => {
    assert.equal(normalizePhone('0912-345-6789'), '+989123456789');
    assert.equal(normalizePhone('0912 345 6789'), '+989123456789');
  });
  test('فرمت 989xxxxxxxxx (بدون +) پذیرفته می‌شود', () => {
    assert.equal(normalizePhone('989123456789'), '+989123456789');
  });
  test('فرمت +989xxxxxxxxx از قبل نرمال، دست‌نخورده برمی‌گردد', () => {
    assert.equal(normalizePhone('+989123456789'), '+989123456789');
  });
  test('شماره‌ی خیلی کوتاه رد می‌شود', () => {
    assert.throws(() => normalizePhone('0912'));
  });
  test('شماره‌ی غیرموبایل (ثابت با کد شهر) رد می‌شود', () => {
    assert.throws(() => normalizePhone('02112345678'));
  });
  test('کاراکترهای غیررقمی (از جمله تلاش تزریق) صرفاً حذف می‌شوند، نه اجرا', () => {
    // \D همه‌چیز جز رقم را حذف می‌کند؛ نتیجه فقط رقم‌های موبایل معتبر باقی می‌ماند
    assert.equal(normalizePhone("09123456789'; DROP TABLE users;--"), '+989123456789');
  });
  test('پیشوند اشتباه (مثلاً 08) رد می‌شود', () => {
    assert.throws(() => normalizePhone('08123456789'));
  });
});
