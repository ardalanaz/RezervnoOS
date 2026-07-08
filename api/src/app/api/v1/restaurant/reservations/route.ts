import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';

/** GET ?date=today|tomorrow|upcoming|past|all — رزروهای رستوران. مهاجرت‌شده به wrapper. */
export const GET = withRestaurantAuth(
  { rateLimit: 'search' },
  async (req, ctx) => {
    const restaurant = ctx.restaurant;
    const url = new URL(req.url);
    const filter = url.searchParams.get('date') || 'today';

    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday); endToday.setDate(endToday.getDate() + 1);
    const endTomorrow = new Date(endToday); endTomorrow.setDate(endTomorrow.getDate() + 1);

    let slotWhere: Record<string, unknown> = {};
    if (filter === 'today') slotWhere = { slotStart: { gte: startToday, lt: endToday } };
    else if (filter === 'tomorrow') slotWhere = { slotStart: { gte: endToday, lt: endTomorrow } };
    else if (filter === 'upcoming') slotWhere = { slotStart: { gte: endTomorrow } };
    else if (filter === 'past') slotWhere = { slotStart: { lt: startToday } };

    const list = await db.reservation.findMany({
      where: { restaurantId: restaurant.id, ...slotWhere },
      orderBy: { slotStart: filter === 'past' ? 'desc' : 'asc' },
      take: 100,
      include: {
        table: { select: { number: true } },
        user: { select: { firstName: true, lastName: true, phone: true } },
        items: { include: { menuItem: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      reservations: list.map(r => ({
        code: r.code, status: r.status, party_size: r.partySize, slot_start: r.slotStart,
        table_number: r.table?.number ?? null,
        name: r.user ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() : (r.guestName || 'مهمان'),
        phone: r.user?.phone || r.guestPhone || null,
        source: r.source,
        preorder: r.items.map(i => i.menuItem.name),
        note: r.preferences.join('، '),
      })),
    });
  },
);
