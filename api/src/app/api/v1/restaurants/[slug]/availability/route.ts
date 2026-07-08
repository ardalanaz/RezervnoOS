import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAvailability } from '@/lib/reservations';
import { Err, errorResponse } from '@/lib/errors';

/** GET /api/v1/restaurants/{slug}/availability?date=2026-06-12&party=2 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const sp = new URL(req.url).searchParams;
    const date = sp.get('date'); const party = Number(sp.get('party') ?? 2);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Err.validation('پارامتر date لازم است (YYYY-MM-DD)');
    const r = await db.restaurant.findUnique({ where: { slug: params.slug }, select: { id: true } });
    if (!r) throw Err.notFound('رستوران');
    return NextResponse.json(await getAvailability(r.id, date, party));
  } catch (e) { return errorResponse(e); }
}
