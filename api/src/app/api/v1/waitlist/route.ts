import { NextResponse } from 'next/server';
import { joinWaitlist } from '@/lib/waitlist';
import { authFromRequest } from '@/lib/jwt';
import { Err, errorResponse } from '@/lib/errors';

/** POST /api/v1/waitlist — پیوستن به لیست انتظار. بدنه: { restaurant_id, party_size, guest?, notify_* } */
export async function POST(req: Request) {
  try {
    let userId: string | undefined;
    let isStaff = false;
    try { const a = authFromRequest(req); if (a.kind === 'customer') userId = a.sub; else isStaff = true; } catch {}
    const b = await req.json();
    if (!b.restaurant_id || !b.party_size) throw Err.validation('restaurant_id و party_size الزامی است');
    const result = await joinWaitlist({
      restaurantId: b.restaurant_id,
      partySize: b.party_size,
      userId: isStaff ? undefined : userId,
      guest: b.guest,
      notifySms: b.notify_sms, notifyPush: b.notify_push, notifyEmail: b.notify_email,
      note: b.note,
    });
    return NextResponse.json(result);
  } catch (e) { return errorResponse(e); }
}
