import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { Err, errorResponse } from '@/lib/errors';

/** POST { reason } — برای staff دلیل اجباری است (فیچر ۷) */
export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const auth = authFromRequest(req);
    const { reason } = await req.json().catch(() => ({}));

    const resv = await db.reservation.findUnique({
      where: { code: params.code },
      include: { restaurant: { select: { tenantId: true } } },
    });
    if (!resv) throw Err.notFound('رزرو');

    let status: 'cancelled_by_user' | 'cancelled_by_restaurant';
    if (auth.kind === 'staff') {
      if (resv.restaurant.tenantId !== auth.tenantId) throw Err.forbidden();
      if (!reason?.trim()) throw Err.validation('دلیل لغو برای رستوران الزامی است');
      status = 'cancelled_by_restaurant';
    } else {
      if (resv.userId !== auth.sub) throw Err.forbidden();
      status = 'cancelled_by_user';
    }

    const updated = await db.reservation.update({
      where: { id: resv.id },
      data: { status, cancelReason: reason?.trim() || null },
    });
    await redis.del(`avail:${resv.restaurantId}:${resv.slotStart.toISOString().slice(0,10)}`);
    return NextResponse.json({ code: updated.code, status: updated.status });
  } catch (e) { return errorResponse(e); }
}
