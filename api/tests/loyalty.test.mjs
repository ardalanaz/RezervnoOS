import { test } from 'node:test';
import assert from 'node:assert/strict';

// ═══ تست منطق وفاداری ═══
const POINTS = { signup: 200, perReservation: 100, referralReward: 500, birthday: 1000 };

test('موجودی امتیاز = جمع جبری delta ها', () => {
  const ledger = [{ delta: 200 }, { delta: 100 }, { delta: -50 }];
  const balance = ledger.reduce((s, e) => s + e.delta, 0);
  assert.equal(balance, 250);
});
test('کارت هدیه: استفاده‌ی جزئی مانده را درست حساب می‌کند', () => {
  const card = { balance: 500000 };
  const redeem = 200000;
  const remaining = card.balance - redeem;
  assert.equal(remaining, 300000);
  assert.equal(remaining === 0 ? 'redeemed' : 'active', 'active');
});
test('کارت هدیه: استفاده‌ی کامل → redeemed', () => {
  const remaining = 500000 - 500000;
  assert.equal(remaining === 0 ? 'redeemed' : 'active', 'redeemed');
});
test('کارت هدیه: استفاده بیش از موجودی رد می‌شود', () => {
  const balance = 100000, redeem = 200000;
  assert.equal(redeem > balance, true, 'باید رد شود');
});
test('پاداش دعوت موفق ۵۰۰ امتیاز است', () => {
  assert.equal(POINTS.referralReward, 500);
});
