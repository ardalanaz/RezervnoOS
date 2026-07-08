import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { genCouponCode } from '@/lib/coupons';
import { Err } from '@/lib/errors';

export const GET = withRestaurantAuth({ permission: 'canManageCoupons' }, async (_req, ctx) => {
  const coupons = await db.coupon.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { redemptions: true } } },
  });
  return NextResponse.json({
    items: coupons.map(c => ({
      id: c.id, code: c.code, kind: c.kind, value: c.value,
      max_redemptions: c.maxRedemptions, redemption_count: c.redemptionCount,
      per_user_limit: c.perUserLimit, target_segment: c.targetSegment,
      valid_from: c.validFrom, valid_until: c.validUntil, is_active: c.isActive,
    })),
  });
});

// POST — ساخت کوپن جدید · بدنه: { kind, value, code?, min_party_size?, max_redemptions?, per_user_limit?, target_segment?, valid_until? }
export const POST = withRestaurantAuth({ rateLimit: 'auth', permission: 'canManageCoupons' }, async (req, ctx) => {
  const b = await req.json();
  if (!['percent', 'fixed', 'free_item'].includes(b.kind)) throw Err.validation('نوع کوپن نامعتبر است');
  if (b.kind !== 'free_item' && (!Number.isFinite(b.value) || b.value <= 0)) throw Err.validation('مقدار تخفیف نامعتبر است');

  const code = (b.code || genCouponCode(ctx.restaurant.name.slice(0, 4))).toUpperCase().slice(0, 30);
  const coupon = await db.coupon.create({
    data: {
      restaurantId: ctx.restaurant.id, code, kind: b.kind, value: b.value || 0,
      freeMenuItemId: b.free_menu_item_id || null,
      minPartySize: b.min_party_size || null,
      maxRedemptions: b.max_redemptions ?? null,
      perUserLimit: b.per_user_limit ?? 1,
      targetSegment: b.target_segment || null,
      validUntil: b.valid_until ? new Date(b.valid_until) : null,
    },
  });
  return NextResponse.json({ id: coupon.id, code: coupon.code }, { status: 201 });
});
