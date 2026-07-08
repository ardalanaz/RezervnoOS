import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withStaffAuth } from '@/lib/with-restaurant-auth';
import { getEffectivePermissions } from '@/lib/permissions';
import type { AccessPayload } from '@/lib/jwt';
import { Err } from '@/lib/errors';

type StaffPayload = Extract<AccessPayload, { kind: 'staff' }>;

// نکته: این route مدیریت کارکنان سطح tenant است، نه scoped به یک رستوران مشخص
// (resolveStaffRestaurant عمداً صدا زده نمی‌شود) — به همین دلیل withStaffAuth
// به‌جای withRestaurantAuth استفاده شده (به جای سوءاستفاده از یک abstraction نادرست).
//
// همچنین این route از requirePermission ماژولار استفاده نمی‌کند چون مدیریت خود
// کارکنان یک عملیات سطح‌بالای owner/manager است، نه ماژولی قابل‌تفویض به staff عادی
// (وگرنه یک manager می‌تواند به یک staff اجازه‌ی «مدیریت کارکنان» بدهد که شامل خودِ
// owner هم می‌شود — ریسک privilege-escalation).

function assertManagerOrOwner(auth: AccessPayload): asserts auth is StaffPayload {
  if (auth.kind !== 'staff') throw Err.unauthorized();
  if (auth.role !== 'owner' && auth.role !== 'manager') throw Err.forbidden('فقط مدیر می‌تواند کارکنان را مدیریت کند');
}

export const GET = withStaffAuth({}, async (_req, auth) => {
  assertManagerOrOwner(auth);
  const staff = await db.staff.findMany({ where: { tenantId: auth.tenantId }, orderBy: { role: 'asc' } });
  const items = await Promise.all(staff.map(async s => ({
    id: s.id, phone: s.phone, role: s.role,
    permissions: await getEffectivePermissions(s.id, s.role),
  })));
  return NextResponse.json({ items });
});

// PATCH — به‌روزرسانی دسترسی یک عضو staff · بدنه: { staff_id, permissions: { canViewAnalytics: true, ... } }
export const PATCH = withStaffAuth({ rateLimit: 'auth' }, async (req, auth) => {
  assertManagerOrOwner(auth);

  const b = await req.json();
  if (!b.staff_id || typeof b.permissions !== 'object') throw Err.validation('ورودی نامعتبر است');

  const target = await db.staff.findFirst({ where: { id: b.staff_id, tenantId: auth.tenantId } });
  if (!target) throw Err.notFound('کارمند');
  if (target.role === 'owner') throw Err.forbidden('دسترسی owner قابل‌تغییر نیست');

  const allowedKeys = [
    'canManageReservations', 'canManageTables', 'canManageWaitlist', 'canViewAnalytics',
    'canViewRevenue', 'canManageCampaigns', 'canManageCoupons', 'canManageStaff', 'canManageSettings',
  ];
  const data: Record<string, boolean> = {};
  for (const k of allowedKeys) if (k in b.permissions) data[k] = !!b.permissions[k];

  await db.staffPermission.upsert({
    where: { staffId: target.id },
    create: { staffId: target.id, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true });
});
