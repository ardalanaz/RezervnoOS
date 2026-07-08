import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';
import { createReservation } from '@/lib/reservations';
import { normalizePhone } from '@/lib/otp';
import { withIdempotency } from '@/lib/idempotency';
import { clientIp } from '@/lib/ratelimit';
import { Err, errorResponse } from '@/lib/errors';
import { z } from '@/lib/validate';

// Schema ورودیِ رزرو — یک‌جا تعریف، خطاهای یکدست، type inference.
const reservationSchema = z.object({
  restaurant_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // YYYY-MM-DD
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), // HH:mm
  party_size: z.number().int().min(1).max(30),
});

/** POST /api/v1/reservations — مشتری (app) یا staff (manual) */
export async function POST(req: Request) {
  try {
    const auth = authFromRequest(req);
    const b = await req.json();
    // Validation متمرکز: همه‌ی خطاها با هم، فرمتِ یکدست (به‌جای if دستی).
    reservationSchema.parse(b);

    // ── Idempotency: اگر کلاینت هدر Idempotency-Key بفرستد، double-submit
    //    (دوبار زدن دکمه یا retry شبکه) رزرو دوم نمی‌سازد؛ پاسخ اول برمی‌گردد. ──
    const idemKey = req.headers.get('idempotency-key') || undefined;
    const idem = await withIdempotency<any>(idemKey, 'reservation');
    if (idem.replayed) return NextResponse.json(idem.response, { status: 201 });

    const isStaff = auth.kind === 'staff';
    let staffGuestUserId: string | undefined;
    if (isStaff) {
      const r = await db.restaurant.findUnique({ where: { id: b.restaurant_id }, select: { tenantId: true } });
      if (!r || r.tenantId !== auth.tenantId) throw Err.forbidden();
      if (b.guest && !b.guest.name) throw Err.validation('اسم مهمان برای رزرو دستی الزامی است');
      // اگر شماره‌ی مهمان داده شده، کاربر واقعی را پیدا/بساز تا منطق آماده‌ی
      // عضویت باشگاه + کش‌بک (که قبلاً فقط برای userId اجرا می‌شد) برای رزروهای
      // دستی staff هم واقعاً اجرا شود — قبلاً این رزروها هرگز عضو باشگاه نمی‌شدند.
      if (b.guest?.phone) {
        try {
          const phone = normalizePhone(b.guest.phone);
          const nameParts = String(b.guest.name || '').trim().split(/\s+/);
          const user = await db.user.upsert({
            where: { phone },
            create: { phone, firstName: nameParts[0] || null, lastName: nameParts.slice(1).join(' ') || null },
            update: {},
          });
          staffGuestUserId = user.id;
        } catch {
          // شماره نامعتبر بود — مشکلی نیست، رزرو به‌صورت مهمان بدون حساب ادامه پیدا می‌کند
        }
      }
    }

    const result = await createReservation({
      restaurantId: b.restaurant_id,
      date: b.date, time: b.time,
      partySize: b.party_size,
      preferences: b.preferences,
      preorder: (b.preorder ?? []).map((p: { menu_item_id: string; qty?: number }) =>
        ({ menuItemId: p.menu_item_id, qty: p.qty ?? 1 })),
      userId: auth.kind === 'customer' ? auth.sub : staffGuestUserId,
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
      ip: clientIp(req),                    // برای تشخیص سوءاستفاده‌ی چندحسابی کوپن (M1)
    });
    await idem.commit(result);  // ذخیره‌ی پاسخ برای replayهای بعدی همان کلید
    return NextResponse.json(result, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
