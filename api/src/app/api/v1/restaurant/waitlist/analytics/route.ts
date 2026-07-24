import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { getWaitlistAnalytics } from '@/lib/waitlist';
import { resolveStaffRestaurant } from '@/lib/staff-helpers';
import { errorResponse } from '@/lib/errors';
import { parseQuery, z } from '@/lib/schemas';

const querySchema = z.object({ days: z.number().int().min(1).max(365).default(30) });

/** GET /api/v1/restaurant/waitlist/analytics — آمار لیست انتظار */
export async function GET(req: Request) {
  try {
    const restaurant = await resolveStaffRestaurant(authFromRequest(req), req);
    const { days } = parseQuery(req, querySchema);
    const analytics = await getWaitlistAnalytics(restaurant.id, days);
    return NextResponse.json(analytics);
  } catch (e) { return errorResponse(e); }
}
