import { db } from './db';
import { Err } from './errors';
import type { AccessPayload } from './jwt';

/** رستورانِ متعلق به این staff را پیدا می‌کند. */
export async function resolveStaffRestaurant(auth: AccessPayload) {
  if (auth.kind !== 'staff') throw Err.forbidden();
  const restaurant = await db.restaurant.findFirst({
    where: { tenantId: auth.tenantId },
    select: { id: true, name: true, slug: true, clubPrefix: true, cbBasePct: true, cbPreorderPct: true, cbVipPct: true, cbWinbackPct: true },
  });
  if (!restaurant) throw Err.notFound('رستورانی برای این حساب یافت نشد');
  return restaurant;
}

/** بازه‌ی زمانی N روز گذشته تا الان */
export function sinceDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
