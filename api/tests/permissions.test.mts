import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// import پویا عمداً — به دلیل باگ محیطیِ import استاتیک چندنامی در ترکیب
// tsx+node:test در این sandbox (شرح کامل در tests/validate.test.mts).
// effectivePermissionsFrom یک تابعِ خالص است (بدونِ DB/HTTP)، پس مستقیم تست‌پذیر
// است — همان منطقی که getEffectivePermissions و GET route روی آن تکیه می‌کنند.
const { effectivePermissionsFrom } = await import('../src/lib/permissions.ts');

// ۹ کلیدِ PermissionKey (باید با src/lib/permissions.ts یکی باشد).
const KEYS = [
  'canManageReservations', 'canManageTables', 'canManageWaitlist',
  'canViewAnalytics', 'canViewRevenue', 'canManageCampaigns',
  'canManageCoupons', 'canManageStaff', 'canManageSettings',
];

// همان SAFE_DEFAULTS در permissions.ts — عملیاتِ روزمره‌ی مجاز، مالی/تنظیمات ممنوع.
const SAFE_DEFAULTS = {
  canManageReservations: true, canManageTables: true, canManageWaitlist: true,
  canViewAnalytics: false, canViewRevenue: false, canManageCampaigns: false,
  canManageCoupons: false, canManageStaff: false, canManageSettings: false,
};

const ALL_TRUE = Object.fromEntries(KEYS.map(k => [k, true]));

describe('effectivePermissionsFrom', () => {
  test('owner → هر ۹ کلید true (perm نادیده گرفته می‌شود)', () => {
    assert.deepEqual(effectivePermissionsFrom('owner', null), ALL_TRUE);
    assert.deepEqual(effectivePermissionsFrom('owner', { ...SAFE_DEFAULTS }), ALL_TRUE);
  });

  test('manager → هر ۹ کلید true', () => {
    assert.deepEqual(effectivePermissionsFrom('manager', null), ALL_TRUE);
  });

  test('staff بدونِ رکوردِ perm → دقیقاً SAFE_DEFAULTS', () => {
    assert.deepEqual(effectivePermissionsFrom('staff', null), SAFE_DEFAULTS);
  });

  test('staff با perm سفارشی (canViewRevenue=true) منعکس می‌شود', () => {
    const perm = { ...SAFE_DEFAULTS, canViewRevenue: true };
    const r = effectivePermissionsFrom('staff', perm);
    assert.equal(r.canViewRevenue, true);
    assert.equal(r.canManageReservations, true);
    assert.equal(r.canManageSettings, false);
  });

  test('خروجی همیشه دقیقاً ۹ کلید است — ستون‌های اضافی (updated_at/id/...) نشت نمی‌کنند', () => {
    // یک رکوردِ StaffPermissionِ واقعی ستون‌های اضافی هم دارد؛ نباید به API برسند.
    const leaky = { ...SAFE_DEFAULTS, id: 'x', staffId: 'y', updatedAt: new Date(), canViewRevenue: true };
    const r = effectivePermissionsFrom('staff', leaky as any);
    assert.equal(Object.keys(r).length, 9);
    assert.deepEqual(Object.keys(r).sort(), [...KEYS].sort());
    assert.equal((r as any).updatedAt, undefined);
    assert.equal((r as any).id, undefined);
    assert.equal((r as any).staffId, undefined);
  });
});
