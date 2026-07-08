import { test } from 'node:test';
import assert from 'node:assert/strict';

// ═══ تست اعتبارسنجی ورودی (از security.ts) ═══
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

test('UUID معتبر پذیرفته می‌شود', () => {
  assert.equal(isUuid('550e8400-e29b-41d4-a716-446655440000'), true);
});
test('UUID نامعتبر (تزریق) رد می‌شود', () => {
  assert.equal(isUuid("1; DROP TABLE users"), false);
});
test('تاریخ معتبر YYYY-MM-DD', () => {
  assert.equal(isDate('2026-06-22'), true);
  assert.equal(isDate('22/06/2026'), false);
});
test('ساعت معتبر HH:MM (۲۴ ساعته)', () => {
  assert.equal(isTime('20:30'), true);
  assert.equal(isTime('25:00'), false);
  assert.equal(isTime('20:99'), false);
});
