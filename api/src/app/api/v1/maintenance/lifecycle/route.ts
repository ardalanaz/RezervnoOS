import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { autoMarkRunningLate, autoMarkNoShow, autoComplete } from '@/lib/lifecycle';
import { expireStaleHolds } from '@/lib/reservations';
import { guardMaintenance } from '@/lib/maintenance-auth';
import { errorResponse } from '@/lib/errors';

/**
 * POST /api/v1/maintenance/lifecycle — انتقال‌های خودکار چرخه‌ی حیات (cron).
 * انقضای هولد + running_late + no_show + completed برای همه‌ی رستوران‌ها.
 */
export async function POST(req: Request) {
  try {
    const denied = guardMaintenance(req);
    if (denied) return denied;

    const expired = await expireStaleHolds();
    const restaurants = await db.restaurant.findMany({ where: { isOpen: true }, select: { id: true } });
    let late = 0, noShow = 0, completed = 0;
    for (const r of restaurants) {
      late += await autoMarkRunningLate(r.id);
      noShow += await autoMarkNoShow(r.id);
      completed += await autoComplete(r.id);
    }
    return NextResponse.json({ ok: true, expired, running_late: late, no_show: noShow, completed });
  } catch (e) { return errorResponse(e); }
}
