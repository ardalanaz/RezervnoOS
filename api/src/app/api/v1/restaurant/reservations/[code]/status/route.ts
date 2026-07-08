import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transitionReservation, type RStatus } from '@/lib/lifecycle';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';

/**
 * PATCH /api/v1/restaurant/reservations/:code/status — staff وضعیت رزرو را تغییر می‌دهد.
 * بدنه: { status, reason? }
 *
 * ⚠️ باگ H6: قبلاً این route با authFromRequest دستی نوشته شده بود؛ نه rate-limit
 * داشت و نه چک مجوز (RBAC). یعنی هر کارمندی — حتی با نقش محدود staff — می‌توانست
 * هر رزروی را completed/no_show/cancelled کند (که پیامد مالی و آنالیتیکس دارد) و
 * چون rate-limit نبود، امکان سوءاستفاده‌ی انبوه هم وجود داشت. حالا از wrapper
 * مشترک با permission='canManageReservations' و rateLimit='auth' استفاده می‌شود.
 */
export const PATCH = withRestaurantAuth(
  { rateLimit: 'auth', permission: 'canManageReservations' },
  async (req, ctx, params: { code: string }) => {
    const b = await req.json();
    if (!b.status) throw Err.validation('status الزامی است');

    // رزرو باید به همین رستوران (tenant احرازشده) تعلق داشته باشد.
    const resv = await db.reservation.findUnique({
      where: { code: params.code },
      select: { id: true, restaurantId: true },
    });
    if (!resv || resv.restaurantId !== ctx.restaurant.id) throw Err.notFound('رزرو');

    const result = await transitionReservation({
      reservationId: resv.id,
      to: b.status as RStatus,
      actor: `staff:${ctx.auth.sub}`,
      reason: b.reason,
      isAutomatic: false,
    });
    return NextResponse.json(result);
  },
);
