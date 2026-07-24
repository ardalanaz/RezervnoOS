import { NextResponse } from 'next/server';
import { dbRead as db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';
import { parseParams, zUuid, z } from '@/lib/schemas';

const paramsSchema = z.object({ userId: zUuid });

export const GET = withRestaurantAuth({ permission: 'canViewAnalytics' }, async (_req, ctx, rawParams: { userId: string }) => {
  const { userId } = parseParams(rawParams, paramsSchema);
  const insight = await db.customerInsight.findUnique({
    where: { restaurantId_userId: { restaurantId: ctx.restaurant.id, userId } },
    include: { user: { select: { firstName: true, lastName: true, phone: true, birthDate: true, avatarUrl: true } } },
  });
  if (!insight) throw Err.notFound('سابقه‌ی این مشتری برای این رستوران یافت نشد');

  const timeline = await db.reservation.findMany({
    where: { restaurantId: ctx.restaurant.id, userId },
    orderBy: { slotStart: 'desc' },
    take: 20,
    select: { code: true, status: true, slotStart: true, partySize: true, items: { select: { qty: true, menuItem: { select: { name: true, priceToman: true } } } } },
  });

  return NextResponse.json({
    user: {
      name: [insight.user.firstName, insight.user.lastName].filter(Boolean).join(' ') || 'مشتری',
      phone: insight.user.phone,
      birth_date: insight.user.birthDate,
      avatar_url: insight.user.avatarUrl,
    },
    clv: {
      total_visits: insight.totalVisits,
      total_spend_toman: insight.totalSpendToman,
      avg_spend_toman: insight.avgSpendToman,
      visit_frequency_days: insight.visitFrequencyDays,
      predicted_clv_toman: insight.predictedClvToman,
      first_visit_at: insight.firstVisitAt,
      last_visit_at: insight.lastVisitAt,
    },
    risk: {
      no_show_count: insight.noShowCount,
      cancel_count: insight.cancelCount,
      no_show_rate_pct: insight.noShowRatePct,
      churn_risk_score: insight.churnRiskScore,
    },
    segment: insight.segment,
    is_vip: insight.isVip,
    timeline: timeline.map(r => ({
      code: r.code, status: r.status, slot_start: r.slotStart, party_size: r.partySize,
      spend_toman: r.items.reduce((s, it) => s + it.qty * it.menuItem.priceToman, 0),
      items: r.items.map(it => `${it.menuItem.name} ×${it.qty}`),
    })),
  });
});
