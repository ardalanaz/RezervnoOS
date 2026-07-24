import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withStaffAuth } from '@/lib/with-restaurant-auth';
import { getEffectivePermissions } from '@/lib/permissions';
import type { AccessPayload } from '@/lib/jwt';
import { Err } from '@/lib/errors';
import { parseBody, zUuid, z } from '@/lib/schemas';

const permissionsSchema = z.object({
  canManageReservations: z.boolean().optional(),
  canManageTables: z.boolean().optional(),
  canManageWaitlist: z.boolean().optional(),
  canViewAnalytics: z.boolean().optional(),
  canViewRevenue: z.boolean().optional(),
  canManageCampaigns: z.boolean().optional(),
  canManageCoupons: z.boolean().optional(),
  canManageStaff: z.boolean().optional(),
  canManageSettings: z.boolean().optional(),
});
const patchSchema = z.object({
  staff_id: zUuid,
  permissions: permissionsSchema.optional(),
  // ⚠️ همگام‌سازی‌شده با DB زنده (migration 018): تخصیص/تغییرِ شعبه.
  // null صریح یعنی «قفل شعبه را بردار» (دسترسی به همه‌ی شعبه‌ها)، غایب یعنی «تغییر نده».
  restaurant_id: zUuid.nullable().optional(),
});

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
    id: s.id, phone: s.phone, role: s.role, restaurant_id: s.restaurantId,
    permissions: await getEffectivePermissions(s.id, s.role),
  })));
  return NextResponse.json({ items });
});

// PATCH — به‌روزرسانی دسترسی/شعبه‌ی یک عضو staff · بدنه: { staff_id, permissions?, restaurant_id? }
export const PATCH = withStaffAuth({ rateLimit: 'auth' }, async (req, auth) => {
  assertManagerOrOwner(auth);

  const b = await parseBody(req, patchSchema);

  const target = await db.staff.findFirst({ where: { id: b.staff_id, tenantId: auth.tenantId } });
  if (!target) throw Err.notFound('کارمند');
  if (target.role === 'owner') throw Err.forbidden('دسترسی owner قابل‌تغییر نیست');

  if (b.permissions) {
    await db.staffPermission.upsert({
      where: { staffId: target.id },
      create: { staffId: target.id, ...b.permissions },
      update: b.permissions,
    });
  }

  if (b.restaurant_id !== undefined) {
    if (b.restaurant_id !== null) {
      // چک تنانت: جلوگیری از قفل‌کردنِ کارمند به شعبه‌ای متعلق به تنانتِ دیگر (IDOR)
      const restaurant = await db.restaurant.findFirst({ where: { id: b.restaurant_id, tenantId: auth.tenantId }, select: { id: true } });
      if (!restaurant) throw Err.notFound('رستوران/شعبه');
    }
    await db.staff.update({ where: { id: target.id }, data: { restaurantId: b.restaurant_id } });
  }

  return NextResponse.json({ ok: true });
});
