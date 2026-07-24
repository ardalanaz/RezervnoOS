import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { setTableState } from '@/lib/tables';
import { Err } from '@/lib/errors';
import { parseBody, parseParams, zUuid, z } from '@/lib/schemas';

const paramsSchema = z.object({ id: zUuid });
const bodySchema = z.object({ state: z.enum(['free', 'reserved', 'occupied', 'cleaning', 'maintenance'] as const) });

/**
 * PATCH /api/v1/restaurant/tables/:id/state — تغییر وضعیتِ میز. بدنه: { state }
 *
 * هم‌تراز شده با بقیه‌ی روت‌های نوشتاری: پیش‌تر این handler خام بود و اگرچه
 * احراز هویت و بررسیِ مالکیتِ tenant را داشت، از withRestaurantAuth استفاده
 * نمی‌کرد؛ در نتیجه نه rate-limit داشت و نه مجوزِ canManageTables را اعمال
 * می‌کرد. یعنی اگر مالک این مجوز را از کارمندی سلب می‌کرد، محدودیت روی همین
 * یک endpoint بی‌اثر بود.
 */
export const PATCH = withRestaurantAuth(
  { rateLimit: 'auth', permission: 'canManageTables' },
  async (req, ctx, rawParams: { id: string }) => {
    const { id } = parseParams(rawParams, paramsSchema);
    const { state } = await parseBody(req, bodySchema);

    // میز باید متعلق به همین رستوران باشد (انزوای چندمستأجری).
    const table = await db.table.findUnique({ where: { id }, select: { restaurantId: true } });
    if (!table || table.restaurantId !== ctx.restaurant.id) throw Err.notFound('میز');

    const result = await setTableState(id, table.restaurantId, state);
    return NextResponse.json(result);
  },
);
