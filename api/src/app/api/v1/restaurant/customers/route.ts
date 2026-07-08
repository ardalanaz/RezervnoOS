import { NextResponse } from 'next/server';
import { dbRead as db } from '@/lib/db';
import { cached, cacheKey } from '@/lib/cache';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';

// ═══════════════════════════════════════════════════════════
//  GET /restaurant/customers — لیست مشتریان با CLV، ریسک no-show، سگمنت
//  Query: ?segment=vip|at_risk|churned|active|new_customer&sort=clv|churn|visits&cursor=&limit=24
//  (پس از ریفکتور معماری: auth/ratelimit/RBAC در withRestaurantAuth — این فایل فقط منطق خودش را دارد)
// ═══════════════════════════════════════════════════════════

export const GET = withRestaurantAuth({ permission: 'canViewAnalytics' }, async (req, ctx) => {
  const url = new URL(req.url);
  const segment = url.searchParams.get('segment');
  const sort = url.searchParams.get('sort') || 'clv';
  const limit = Math.min(50, Number(url.searchParams.get('limit')) || 24);
  const cursor = url.searchParams.get('cursor');

  const orderBy = sort === 'churn' ? { churnRiskScore: 'desc' as const }
    : sort === 'visits' ? { totalVisits: 'desc' as const }
    : { predictedClvToman: 'desc' as const };

  const data = await cached(cacheKey('customers', ctx.restaurant.id, segment, sort, cursor), 60, async () => {
    const rows = await db.customerInsight.findMany({
      where: { restaurantId: ctx.restaurant.id, ...(segment ? { segment: segment as any } : {}) },
      orderBy,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { restaurantId_userId: { restaurantId: ctx.restaurant.id, userId: cursor } } } : {}),
      include: { user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } } },
    });
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(r => ({
      user_id: r.userId,
      name: [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || 'مشتری',
      phone: r.user.phone,
      avatar_url: r.user.avatarUrl,
      total_visits: r.totalVisits,
      avg_spend_toman: r.avgSpendToman,
      predicted_clv_toman: r.predictedClvToman,
      no_show_rate_pct: r.noShowRatePct,
      churn_risk_score: r.churnRiskScore,
      segment: r.segment,
      is_vip: r.isVip,
      last_visit_at: r.lastVisitAt,
    }));
    return { items, next_cursor: hasMore ? rows[limit].userId : null };
  });

  return NextResponse.json(data);
});
