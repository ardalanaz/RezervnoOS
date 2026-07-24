import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';
import { parseBody, parseQuery, zUuid, z } from '@/lib/schemas';

const CATEGORIES = ['food', 'interior', 'drink', 'event', 'other'] as const;
const createSchema = z.object({
  url: z.string().min(1).max(2000).regex(/^https?:\/\//, 'آدرس عکس باید با http(s) شروع شود'),
  caption: z.string().max(300).trim().optional(),
  category: z.enum(CATEGORIES).default('food'),
  sort_order: z.number().int().min(0).max(9999).optional(),
});
const deleteQuerySchema = z.object({ id: zUuid });

/** GET — عکس‌های گالری رستوران */
export const GET = withRestaurantAuth({ rateLimit: 'search' }, async (_req, ctx) => {
  const photos = await db.restaurantPhoto.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({
    items: photos.map(p => ({ id: p.id, url: p.url, caption: p.caption, category: p.category, sort_order: p.sortOrder })),
  });
});

/** POST — افزودن عکس. بدنه: { url, caption?, category? } */
export const POST = withRestaurantAuth({ rateLimit: 'auth', permission: 'canManageSettings' }, async (req, ctx) => {
  const b = await parseBody(req, createSchema);

  const photo = await db.restaurantPhoto.create({
    data: { restaurantId: ctx.restaurant.id, url: b.url, caption: b.caption || null, category: b.category, sortOrder: b.sort_order || 0 },
  });
  return NextResponse.json({ id: photo.id }, { status: 201 });
});

/** DELETE ?id= — حذف عکس */
export const DELETE = withRestaurantAuth({ rateLimit: 'auth', permission: 'canManageSettings' }, async (req, ctx) => {
  const { id } = parseQuery(req, deleteQuerySchema);
  const photo = await db.restaurantPhoto.findUnique({ where: { id }, select: { restaurantId: true } });
  if (!photo || photo.restaurantId !== ctx.restaurant.id) throw Err.notFound('عکس');
  await db.restaurantPhoto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
