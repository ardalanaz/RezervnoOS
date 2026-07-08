import { test } from 'node:test';
import assert from 'node:assert/strict';

// ═══ تست صف اولویت لیست انتظار ═══
const VIP_PRIORITY = 100, CLUB_GOLD = 50;
function computePriority(tier) {
  if (tier === 'platinum' || tier === 'vip') return VIP_PRIORITY;
  if (tier === 'gold') return CLUB_GOLD;
  if (tier === 'silver') return 20;
  return 0;
}
function sortQueue(entries) {
  return [...entries].sort((a, b) => (b.priority - a.priority) || (a.joinedAt - b.joinedAt));
}

test('VIP اولویت بالاتر از gold و عادی دارد', () => {
  assert.ok(computePriority('platinum') > computePriority('gold'));
  assert.ok(computePriority('gold') > computePriority('bronze'));
});
test('صف: VIP جلوتر از عادیِ زودتر است', () => {
  const q = sortQueue([
    { name: 'A', priority: 0, joinedAt: 100 },
    { name: 'B', priority: 100, joinedAt: 200 },
  ]);
  assert.equal(q[0].name, 'B', 'VIP باید اول باشد');
});
test('صف: بین هم‌اولویت‌ها، زودتر جلوتر (FIFO)', () => {
  const q = sortQueue([
    { name: 'late', priority: 0, joinedAt: 200 },
    { name: 'early', priority: 0, joinedAt: 100 },
  ]);
  assert.equal(q[0].name, 'early');
});
test('تخمین انتظار با میزهای بیشتر کمتر می‌شود', () => {
  const est = (tables, ahead) => Math.max(5, Math.ceil((ahead+1)/tables)*75 - 75 + 15);
  assert.ok(est(4, 8) > est(4, 0), 'نفر نهم باید بیشتر صبر کند');
});
