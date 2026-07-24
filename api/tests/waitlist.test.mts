import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// import پویا عمداً — به دلیل باگ محیطیِ import استاتیک چندنامی در ترکیب
// tsx+node:test در این sandbox (شرح کامل در tests/validate.test.mts).
//
// نکته: isVipTier/tierToPriority به‌عنوان توابعِ خالصِ قابل‌تست از computePriority
// جدا شدند (همان الگوی reservation-helpers.ts) تا این تست واقعاً کدِ اصلی را
// اجرا کند، نه یک کپیِ دستی از آن.
const { isVipTier, tierToPriority } = await import('../src/lib/waitlist.ts');

describe('isVipTier', () => {
  test('platinum و vip و gold همگی VIP محسوب می‌شوند', () => {
    assert.equal(isVipTier('platinum'), true);
    assert.equal(isVipTier('vip'), true);
    assert.equal(isVipTier('gold'), true);
  });
  test('silver و bronze و نامعتبر VIP نیستند', () => {
    assert.equal(isVipTier('silver'), false);
    assert.equal(isVipTier('bronze'), false);
    assert.equal(isVipTier('unknown'), false);
  });
});

describe('tierToPriority', () => {
  test('platinum/vip بالاترین اولویت (۱۰۰) را دارند', () => {
    assert.equal(tierToPriority('platinum'), 100);
    assert.equal(tierToPriority('vip'), 100);
  });
  test('gold اولویت ۵۰ دارد (کمتر از platinum با اینکه هردو VIP‌اند)', () => {
    assert.equal(tierToPriority('gold'), 50);
    assert.ok(tierToPriority('gold') < tierToPriority('platinum'));
  });
  test('silver اولویت ۲۰ دارد', () => {
    assert.equal(tierToPriority('silver'), 20);
  });
  test('bronze/نامعتبر اولویت صفر (عادی) دارند', () => {
    assert.equal(tierToPriority('bronze'), 0);
    assert.equal(tierToPriority('unknown'), 0);
  });
});

describe('ترتیب صف بر اساس اولویت + FIFO (شبیه‌سازی مرتب‌سازی واقعی Prisma orderBy)', () => {
  // خودِ مرتب‌سازی توسط Prisma (`orderBy: [{priority:'desc'},{joinedAt:'asc'}]`)
  // انجام می‌شود، نه کدِ JS؛ اینجا فقط تضمین می‌کنیم ورودیِ اولویت (خروجیِ
  // tierToPriority) با ترتیبِ مورد انتظار سازگار است.
  test('VIP باید عدد اولویتِ بالاتری از مشتریِ عادی داشته باشد', () => {
    assert.ok(tierToPriority('vip') > tierToPriority('bronze'));
  });
});
