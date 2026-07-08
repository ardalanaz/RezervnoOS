import { test } from 'node:test';
import assert from 'node:assert/strict';

// ═══ تست state machine چرخه‌ی حیات رزرو ═══
// منطق TRANSITIONS از lifecycle.ts بازتولید شده برای تست واحد
const TRANSITIONS = {
  pending: ['confirmed','auto_confirmed','rejected','expired','cancelled','auto_cancelled'],
  waitlisted: ['confirmed','auto_confirmed','expired','cancelled'],
  confirmed: ['preparing','checked_in','running_late','seated','no_show','cancelled','auto_cancelled'],
  auto_confirmed: ['preparing','checked_in','running_late','seated','no_show','cancelled','auto_cancelled'],
  preparing: ['checked_in','running_late','seated','no_show','cancelled'],
  checked_in: ['seated','no_show','cancelled'],
  running_late: ['seated','checked_in','no_show','cancelled'],
  seated: ['dining','completed','cancelled'],
  dining: ['completed'],
  completed: [],
  no_show: [],
  rejected: [],
  expired: [],
  cancelled: [],
  auto_cancelled: [],
};
function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

test('انتقال معتبر: confirmed → seated مجاز است', () => {
  assert.equal(canTransition('confirmed', 'seated'), true);
});
test('انتقال نامعتبر: completed → seated ممنوع (وضعیت نهایی)', () => {
  assert.equal(canTransition('completed', 'seated'), false);
});
test('وضعیت‌های نهایی هیچ انتقالی ندارند', () => {
  for (const final of ['completed','no_show','rejected','expired','cancelled']) {
    assert.equal(TRANSITIONS[final].length, 0, `${final} باید نهایی باشد`);
  }
});
test('pending نمی‌تواند مستقیم به seated برود (باید اول confirmed شود)', () => {
  assert.equal(canTransition('pending', 'seated'), false);
});
test('seated → dining → completed مسیر کامل', () => {
  assert.equal(canTransition('seated', 'dining'), true);
  assert.equal(canTransition('dining', 'completed'), true);
});
