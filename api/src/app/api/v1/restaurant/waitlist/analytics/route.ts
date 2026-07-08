import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { getWaitlistAnalytics } from '@/lib/waitlist';
import { resolveStaffRestaurant } from '@/lib/staff-helpers';
import { errorResponse } from '@/lib/errors';

/** GET /api/v1/restaurant/waitlist/analytics — آمار لیست انتظار */
export async function GET(req: Request) {
  try {
    const restaurant = await resolveStaffRestaurant(authFromRequest(req));
    const days = parseInt(new URL(req.url).searchParams.get('days') || '30', 10);
    const analytics = await getWaitlistAnalytics(restaurant.id, days);
    return NextResponse.json(analytics);
  } catch (e) { return errorResponse(e); }
}
