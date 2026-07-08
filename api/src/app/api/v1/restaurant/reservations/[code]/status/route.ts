import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';
import { transitionReservation, type RStatus } from '@/lib/lifecycle';
import { Err, errorResponse } from '@/lib/errors';

/** PATCH /api/v1/restaurant/reservations/:code/status — staff وضعیت رزرو را تغییر می‌دهد. بدنه: { status, reason? } */
export async function PATCH(req: Request, { params }: { params: { code: string } }) {
  try {
    const auth = authFromRequest(req);
    if (auth.kind !== 'staff') throw Err.forbidden();
    const b = await req.json();
    if (!b.status) throw Err.validation('status الزامی است');

    const resv = await db.reservation.findUnique({
      where: { code: params.code },
      select: { id: true, restaurant: { select: { tenantId: true } } },
    });
    if (!resv || (resv as any).restaurant.tenantId !== auth.tenantId) throw Err.forbidden();

    const result = await transitionReservation({
      reservationId: resv.id,
      to: b.status as RStatus,
      actor: `staff:${auth.sub}`,
      reason: b.reason,
      isAutomatic: false,
    });
    return NextResponse.json(result);
  } catch (e) { return errorResponse(e); }
}
