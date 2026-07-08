import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';
import { transitionReservation } from '@/lib/lifecycle';
import { enforceRateLimit, clientIp, RULES } from '@/lib/ratelimit';
import { Err, errorResponse } from '@/lib/errors';

/**
 * POST /api/v1/reservations/:code/cancel — لغو رزرو. بدنه: { reason }
 * برای staff دلیل اجباری است (فیچر ۷).
 *
 * ⚠️ باگ H7: قبلاً این route مستقیم status را می‌نوشت و state machine چرخه‌ی حیات
 * را دور می‌زد: نه اعتبارسنجی انتقال، نه رویداد audit، نه چک وضعیت پایانی، نه اعلان.
 * پس حتی یک رزرو completed/no_show هم «لغو» می‌شد. حالا از transitionReservation
 * استفاده می‌شود که: انتقال نامعتبر (مثلاً از وضعیت پایانی) را رد می‌کند، رویداد
 * audit ثبت می‌کند، اعلان می‌فرستد و کش availability را درست (pattern-based) باطل
 * می‌کند. تمایز کاربر/رستوران در actor و دلیل حفظ می‌شود (سازگاری رفتاری).
 */
export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const auth = authFromRequest(req);
    await enforceRateLimit(clientIp(req), RULES.auth);
    const { reason } = await req.json().catch(() => ({}));

    const resv = await db.reservation.findUnique({
      where: { code: params.code },
      select: { id: true, userId: true, restaurantId: true, restaurant: { select: { tenantId: true } } },
    });
    if (!resv) throw Err.notFound('رزرو');

    // مجوز: staff باید هم‌تنانت باشد و دلیل بدهد؛ مشتری باید صاحب رزرو باشد.
    let actor: string;
    if (auth.kind === 'staff') {
      if ((resv as any).restaurant.tenantId !== auth.tenantId) throw Err.forbidden();
      if (!reason?.trim()) throw Err.validation('دلیل لغو برای رستوران الزامی است');
      actor = `staff:${auth.sub}`;
    } else {
      if (resv.userId !== auth.sub) throw Err.forbidden();
      actor = `customer:${auth.sub}`;
    }

    // ذخیره‌ی دلیل لغو روی رکورد (فیلد اختصاصی) + انتقال از طریق state machine.
    if (reason?.trim()) {
      await db.reservation.update({ where: { id: resv.id }, data: { cancelReason: reason.trim() } });
    }
    const result = await transitionReservation({
      reservationId: resv.id,
      to: 'cancelled',
      actor,
      reason: reason?.trim() || undefined,
      isAutomatic: false,
    });
    return NextResponse.json({ code: params.code, status: result.status });
  } catch (e) { return errorResponse(e); }
}
