import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expireOffers, promoteNext } from '@/lib/waitlist';
import { guardMaintenance } from '@/lib/maintenance-auth';
import { errorResponse } from '@/lib/errors';

/**
 * POST /api/v1/maintenance/waitlist — نگهداری لیست انتظار (cron).
 * انقضای آفرهای بی‌پاسخ + تلاش برای ارتقای صف هر رستوران.
 */
export async function POST(req: Request) {
  try {
    const denied = guardMaintenance(req);
    if (denied) return denied;

    const expired = await expireOffers();
    const withQueue = await db.waitlistEntry.findMany({
      where: { status: 'waiting' }, distinct: ['restaurantId'], select: { restaurantId: true },
    });
    let promoted = 0;
    for (const w of withQueue) {
      const res = await promoteNext(w.restaurantId);
      if (res.promoted) promoted++;
    }
    return NextResponse.json({ ok: true, expired_offers: expired, promoted });
  } catch (e) { return errorResponse(e); }
}
