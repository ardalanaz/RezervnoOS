import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';
import { createReservation } from '@/lib/reservations';
import { withIdempotency } from '@/lib/idempotency';
import { Err, errorResponse } from '@/lib/errors';

/** POST /api/v1/reservations — مشتری (app) یا staff (manual) */
export async function POST(req: Request) {
  try {
    const auth = authFromRequest(req);
    const b = await req.json();
    if (!b.restaurant_id || !b.date || !b.time || !b.party_size)
      throw Err.validation('restaurant_id, date, time, party_size الزامی است');

    // ── Idempotency: اگر کلاینت هدر Idempotency-Key بفرستد، double-submit
    //    (دوبار زدن دکمه یا retry شبکه) رزرو دوم نمی‌سازد؛ پاسخ اول برمی‌گردد. ──
    const idemKey = req.headers.get('idempotency-key') || undefined;
    const idem = await withIdempotency<any>(idemKey, 'reservation');
    if (idem.replayed) return NextResponse.json(idem.response, { status: 201 });

    const isStaff = auth.kind === 'staff';
    if (isStaff) {
      const r = await db.restaurant.findUnique({ where: { id: b.restaurant_id }, select: { tenantId: true } });
      if (!r || r.tenantId !== auth.tenantId) throw Err.forbidden();
      if (b.guest && !b.guest.name) throw Err.validation('اسم مهمان برای رزرو دستی الزامی است');
    }

    const result = await createReservation({
      restaurantId: b.restaurant_id,
      date: b.date, time: b.time,
      partySize: b.party_size,
      preferences: b.preferences,
      preorder: (b.preorder ?? []).map((p: { menu_item_id: string; qty?: number }) =>
        ({ menuItemId: p.menu_item_id, qty: p.qty ?? 1 })),
      userId: auth.kind === 'customer' ? auth.sub : undefined,
      guest: isStaff ? {
        name: b.guest?.name, phone: b.guest?.phone,
        tableNumber: b.guest?.table_number, note: b.guest?.note,
      } : undefined,
      source: isStaff ? 'manual' : 'app',
      notifySms: b.notify_sms,
      durationMinutes: b.duration_minutes,  // اختیاری: مدت سفارشی رزرو
      hold: b.hold === true,                // اختیاری: رزرو هولد موقت (pending با انقضا)
      couponCode: b.coupon_code,            // checkout: کوپن (یا کارت هدیه، نه هردو)
      giftCardCode: b.gift_card_code,
      giftCardAmount: b.gift_card_amount,
    });
    await idem.commit(result);  // ذخیره‌ی پاسخ برای replayهای بعدی همان کلید
    return NextResponse.json(result, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
