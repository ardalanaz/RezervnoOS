import { NextResponse } from 'next/server';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { normalizePhone } from '@/lib/otp';
import { createWalkin } from '@/lib/reservations';
import { Err } from '@/lib/errors';

// ═══════════════════════════════════════════════════════════
//  POST /restaurant/walkin — ثبت ورود مهمان بدون رزروی قبلی (walk-in) توسط پرسنل.
//  منطق در لایه‌ی سرویس (lib/reservations.ts → createWalkin) است؛ این route
//  فقط اعتبارسنجی ورودی و صدازدنِ سرویس را انجام می‌دهد (route لاغر).
// ═══════════════════════════════════════════════════════════

export const POST = withRestaurantAuth({ rateLimit: 'auth', permission: 'canManageReservations' }, async (req, ctx) => {
  const b = await req.json();
  const phone = normalizePhone(String(b.phone || ''));
  const partySize = Number(b.party_size) || 2;
  if (partySize < 1 || partySize > 30) throw Err.validation('تعداد نفرات نامعتبر است');

  const result = await createWalkin({
    restaurantId: ctx.restaurant.id,
    clubPrefix: ctx.restaurant.clubPrefix,
    phone,
    partySize,
    firstName: (b.first_name || '').trim() || null,
    lastName: (b.last_name || '').trim() || null,
    tableId: b.table_id || null,
    birthDay: b.birth_day ? Number(b.birth_day) : null,
    birthMonth: b.birth_month ? Number(b.birth_month) : null,
  });

  return NextResponse.json({
    reservation_code: result.reservation.code,
    user_id: result.user.id,
    name: [result.user.firstName, result.user.lastName].filter(Boolean).join(' ') || 'مهمان',
    club_code: result.clubCode,
    enrolled_now: result.enrolledNow,
  }, { status: 201 });
});
