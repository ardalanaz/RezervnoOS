import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enforceRateLimit, clientIp, RULES } from '@/lib/ratelimit';
import { adminAuthFromRequest } from '@/lib/admin-auth';
import { audit } from '@/lib/audit';
import { Err, errorResponse } from '@/lib/errors';

/**
 * PATCH /api/v1/admin/restaurants/[id]/control — کنترل رستوران (پنل شرکت).
 * فعال/غیرفعال کردن رستوران یا تغییر پلن tenant. عملیات حساس → audit می‌شود.
 *
 * body: { action: 'activate' | 'deactivate' | 'set_plan', plan?: string }
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await enforceRateLimit(clientIp(req), RULES.auth);
    const admin = adminAuthFromRequest(req);
    const restaurantId = params.id;
    const body = await req.json();
    const action = body.action as string;

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, isOpen: true, tenantId: true },
    });
    if (!restaurant) throw Err.notFound('رستوران');

    let result: Record<string, unknown> = {};

    if (action === 'activate' || action === 'deactivate') {
      const isOpen = action === 'activate';
      await db.restaurant.update({ where: { id: restaurantId }, data: { isOpen } });
      result = { id: restaurantId, is_open: isOpen };
      await audit({
        action: 'admin.action', actorId: admin.sub, actorType: 'admin',
        targetId: restaurantId, restaurantId, ip: clientIp(req),
        detail: { operation: action, restaurant_name: restaurant.name },
      });
    } else if (action === 'set_plan') {
      const plan = String(body.plan ?? '').trim();
      if (!['free', 'pro', 'enterprise'].includes(plan)) {
        throw Err.validation('پلن نامعتبر است (free/pro/enterprise)');
      }
      // پلن روی tenant است (نه رستوران) — کل زنجیره را تغییر می‌دهد
      await db.tenant.update({ where: { id: restaurant.tenantId }, data: { plan } });
      result = { tenant_id: restaurant.tenantId, plan };
      await audit({
        action: 'admin.action', actorId: admin.sub, actorType: 'admin',
        targetId: restaurant.tenantId, restaurantId, ip: clientIp(req),
        detail: { operation: 'set_plan', plan, restaurant_name: restaurant.name },
      });
    } else {
      throw Err.validation('عملیات نامعتبر (activate/deactivate/set_plan)');
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) { return errorResponse(e); }
}
