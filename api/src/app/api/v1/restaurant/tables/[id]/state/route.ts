import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';
import { setTableState } from '@/lib/tables';
import { Err, errorResponse } from '@/lib/errors';

/** PATCH /api/v1/restaurant/tables/:id/state — staff وضعیت میز را تغییر می‌دهد. بدنه: { state } */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = authFromRequest(req);
    if (auth.kind !== 'staff') throw Err.forbidden();
    const b = await req.json();
    if (!b.state) throw Err.validation('state الزامی است');
    // مالکیت میز را تأیید کن
    const t = await db.table.findUnique({ where: { id: params.id }, select: { restaurant: { select: { tenantId: true } } } });
    if (!t || (t as any).restaurant.tenantId !== auth.tenantId) throw Err.forbidden();
    // restaurantId را از میز بگیر
    const tbl = await db.table.findUnique({ where: { id: params.id }, select: { restaurantId: true } });
    const result = await setTableState(params.id, tbl!.restaurantId, b.state);
    return NextResponse.json(result);
  } catch (e) { return errorResponse(e); }
}
