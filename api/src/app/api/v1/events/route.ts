import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cached } from '@/lib/cache';
import { errorResponse } from '@/lib/errors';

/** GET /api/v1/events?restaurant_id=... — رویدادهای ویژه‌ی پیش‌رو */
export async function GET(req: Request) {
  try {
    const rid = new URL(req.url).searchParams.get('restaurant_id');
    const key = `events:${rid || 'all'}`;
    const events = await cached(key, 120, async () => {
      return db.specialEvent.findMany({
        where: {
          isPublished: true, startsAt: { gte: new Date() },
          ...(rid ? { restaurantId: rid } : {}),
        },
        orderBy: { startsAt: 'asc' }, take: 20,
        select: { id: true, restaurantId: true, title: true, description: true, emoji: true, startsAt: true, endsAt: true, priceToman: true, capacity: true },
      });
    });
    return NextResponse.json({ events });
  } catch (e) { return errorResponse(e); }
}
