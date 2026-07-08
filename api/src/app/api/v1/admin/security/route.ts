import { NextResponse } from 'next/server';
import { dbRead as db } from '@/lib/db';
import { enforceRateLimit, clientIp, RULES } from '@/lib/ratelimit';
import { adminAuthFromRequest } from '@/lib/admin-auth';
import { errorResponse } from '@/lib/errors';

/**
 * GET /api/v1/admin/security — سیگنال‌های امنیتی سطح پلتفرم (پنل شرکت).
 * fraud signals در کل رستوران‌ها + رویدادهای حساس audit.
 * این به تیم پلتفرم اجازه می‌دهد سوءاستفاده‌های متقاطع بین رستوران‌ها را ببینند.
 */
export async function GET(req: Request) {
  try {
    await enforceRateLimit(clientIp(req), RULES.search);
    adminAuthFromRequest(req);

    const [couponAbuse, highNoShow, recentFailedActions, sensitiveActions] = await Promise.all([
      // الگوی fraud: چند حساب از یک IP کوپن استفاده کرده (سطح کل پلتفرم)
      db.$queryRaw<{ ip: string; accounts: bigint; redemptions: bigint }[]>`
        SELECT ip, count(DISTINCT user_id) AS accounts, count(*) AS redemptions
        FROM coupon_redemptions
        WHERE ip IS NOT NULL
        GROUP BY ip HAVING count(DISTINCT user_id) >= 3
        ORDER BY accounts DESC LIMIT 20
      `,
      // مشتریان با نرخ no-show بالا در کل پلتفرم (ریسک)
      db.$queryRaw<{ user_id: string; no_show_rate: number; restaurant_id: string }[]>`
        SELECT user_id, no_show_rate_pct AS no_show_rate, restaurant_id
        FROM customer_insights
        WHERE no_show_rate_pct >= 60 AND (no_show_count + completed_count) >= 4
        ORDER BY no_show_rate_pct DESC LIMIT 20
      `,
      // اقدامات ناموفق اخیر (تلاش‌های مشکوک)
      db.auditLog.findMany({
        where: { success: false, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
        select: { action: true, actorType: true, ip: true, restaurantId: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: 30,
      }),
      // اقدامات حساس اخیر (حذف، تغییر دسترسی، و...)
      db.auditLog.findMany({
        where: {
          action: { in: ['restaurant.deactivated', 'restaurant.activated', 'staff.permission_change', 'plan.changed', 'subscription.cancelled', 'coupon.created'] },
          createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
        },
        select: { action: true, actorId: true, restaurantId: true, detail: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: 30,
      }),
    ]);

    return NextResponse.json({
      coupon_abuse_signals: couponAbuse.map(c => ({
        ip: c.ip, distinct_accounts: Number(c.accounts), total_redemptions: Number(c.redemptions),
      })),
      high_no_show_customers: highNoShow.map(h => ({
        user_id: h.user_id, no_show_rate_pct: h.no_show_rate, restaurant_id: h.restaurant_id,
      })),
      recent_failed_actions: recentFailedActions.map(a => ({
        action: a.action, actor_type: a.actorType, ip: a.ip,
        restaurant_id: a.restaurantId, at: a.createdAt,
      })),
      sensitive_actions: sensitiveActions.map(a => ({
        action: a.action, actor_id: a.actorId, restaurant_id: a.restaurantId,
        detail: a.detail, at: a.createdAt,
      })),
    });
  } catch (e) { return errorResponse(e); }
}
