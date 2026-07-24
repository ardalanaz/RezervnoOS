import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// import پویا عمداً — به دلیل باگ محیطیِ import استاتیک چندنامی در ترکیب
// tsx+node:test در این sandbox (شرح کامل در tests/validate.test.mts).
//
// نکته: بیشترِ توابعِ loyalty.ts مستقیماً با DB کار می‌کنند (addPoints،
// redeemGiftCard و ...) و برای تستِ واقعیِ آن‌ها به یک DB تست (یا mock کاملِ
// Prisma) نیاز است — که خارج از حوصله‌ی تستِ واحدِ خالص است. این فایل فقط
// بخشِ خالص و بدون I/O (ثابت‌های POINTS) را واقعاً تست می‌کند.
const { POINTS } = await import('../src/lib/loyalty.ts');

describe('POINTS (ثابت‌های امتیازدهی)', () => {
  test('پاداش دعوتِ موفق ۵۰۰ امتیاز است', () => {
    assert.equal(POINTS.referralReward, 500);
  });
  test('امتیازِ خوش‌آمد ۲۰۰ است', () => {
    assert.equal(POINTS.signup, 200);
  });
  test('امتیازِ هر رزروِ تکمیل‌شده ۱۰۰ است', () => {
    assert.equal(POINTS.perReservation, 100);
  });
  test('هدیه‌ی تولد و سالگرد هرکدام ۱۰۰۰ امتیاز است', () => {
    assert.equal(POINTS.birthday, 1000);
    assert.equal(POINTS.anniversary, 1000);
  });
});
