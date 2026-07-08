import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';

const CATEGORIES = ['food', 'interior', 'drink', 'event', 'other'];

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
  const b = await req.json();
  const urlStr = String(b.url || '').trim();
  if (!urlStr || !/^https?:\/\//.test(urlStr)) throw Err.validation('آدرس عکس باید با http(s) شروع شود');
  const category = CATEGORIES.includes(b.category) ? b.category : 'food';

  const photo = await db.restaurantPhoto.create({
    data: { restaurantId: ctx.restaurant.id, url: urlStr, caption: (b.caption || '').trim() || null, category, sortOrder: b.sort_order || 0 },
  });
  return NextResponse.json({ id: photo.id }, { status: 201 });
});

/** DELETE ?id= — حذف عکس */
export const DELETE = withRestaurantAuth({ rateLimit: 'auth', permission: 'canManageSettings' }, async (req, ctx) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw Err.validation('شناسه‌ی عکس الزامی است');
  const photo = await db.restaurantPhoto.findUnique({ where: { id }, select: { restaurantId: true } });
  if (!photo || photo.restaurantId !== ctx.restaurant.id) throw Err.notFound('عکس');
  await db.restaurantPhoto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
