import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// import پویا عمداً — به دلیل باگ محیطیِ import استاتیک چندنامی در ترکیب
// tsx+node:test در این sandbox (شرح کامل در tests/validate.test.mts).
const { computeRanges, genReservationCode, isConflictError, isSerializationError } =
  await import('../src/lib/reservation-helpers.ts');

const CFG = { slotMinutes: 90, bufferMinutes: 15, cleaningMinutes: 20, holdMinutes: 10 };

describe('computeRanges', () => {
  test('بازه‌ی رزرو را با تایم‌زون تهران (+03:30) درست محاسبه می‌کند', () => {
    const r = computeRanges('2026-08-01', '20:00', CFG);
    // 20:00 +03:30 == 16:30 UTC
    assert.equal(r.start.toISOString(), '2026-08-01T16:30:00.000Z');
    assert.equal(r.duration, 90);
  });
  test('end = start + duration', () => {
    const r = computeRanges('2026-08-01', '20:00', CFG);
    assert.equal(+r.end - +r.start, 90 * 60_000);
  });
  test('blockEnd = end + (cleaning + buffer)', () => {
    const r = computeRanges('2026-08-01', '20:00', CFG);
    assert.equal(r.blockBufferMin, 35); // 20 + 15
    assert.equal(+r.blockEnd - +r.end, 35 * 60_000);
  });
  test('durationOverride جایگزین slotMinutes پیش‌فرض می‌شود', () => {
    const r = computeRanges('2026-08-01', '20:00', CFG, 120);
    assert.equal(r.duration, 120);
  });
  test('تاریخ/ساعت نامعتبر خطا می‌دهد', () => {
    assert.throws(() => computeRanges('not-a-date', '20:00', CFG));
  });
});

describe('genReservationCode', () => {
  test('همیشه با RZ شروع می‌شود و طول ۹ کاراکتر دارد', () => {
    for (let i = 0; i < 50; i++) {
      const code = genReservationCode();
      assert.equal(code.length, 9);
      assert.equal(code.slice(0, 2), 'RZ');
    }
  });
  test('فقط از الفبای Base32 امن استفاده می‌کند (بدون 0/O/1/I)', () => {
    const safeAlphabet = /^RZ[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{7}$/;
    for (let i = 0; i < 50; i++) {
      assert.match(genReservationCode(), safeAlphabet);
    }
  });
  test('عملاً یکتا تولید می‌شود (بدون تصادف روی یک sample بزرگ)', () => {
    const codes = new Set(Array.from({ length: 500 }, () => genReservationCode()));
    assert.equal(codes.size, 500);
  });
});

describe('isConflictError / isSerializationError', () => {
  test('کد postgres exclusion_violation (23P01) تداخل شناخته می‌شود', () => {
    assert.equal(isConflictError({ code: '23P01' }), true);
  });
  test('کد serialization_failure (40001) هم تداخل و هم serialization است', () => {
    assert.equal(isConflictError({ code: '40001' }), true);
    assert.equal(isSerializationError({ code: '40001' }), true);
  });
  test('deadlock (40P01) تداخل و serialization است', () => {
    assert.equal(isConflictError({ code: '40P01' }), true);
    assert.equal(isSerializationError({ code: '40P01' }), true);
  });
  test('exclusion_violation صرفاً conflict است نه serialization', () => {
    assert.equal(isSerializationError({ code: '23P01' }), false);
  });
  test('خطای بی‌ربط تداخل شناخته نمی‌شود', () => {
    assert.equal(isConflictError({ code: 'P2025' }), false);
    assert.equal(isConflictError(new Error('random')), false);
    assert.equal(isConflictError(null), false);
  });
});
