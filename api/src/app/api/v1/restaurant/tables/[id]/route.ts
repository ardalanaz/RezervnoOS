import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';

const SHAPES = ['rectangle', 'round', 'booth'];
const ZONES = ['indoor', 'outdoor', 'window', 'vip', 'smoking'];

/** PATCH — ویرایش جزئیات میز (ظرفیت، نام، شکل، ناحیه، فعال/غیرفعال). تغییر state از endpoint جدا (/tables/:id/state) انجام می‌شود. */
export const PATCH = withRestaurantAuth({ rateLimit: 'auth', permission: 'canManageTables' }, async (req, ctx, params: { id: string }) => {
  const table = await db.table.findUnique({ where: { id: params.id } });
  if (!table || table.restaurantId !== ctx.restaurant.id) throw Err.notFound('میز');

  const b = await req.json();
  const data: Record<string, unknown> = {};
  if (b.capacity !== undefined) {
    const capacity = Number(b.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 50) throw Err.validation('ظرفیت میز نامعتبر است');
    data.capacity = capacity;
  }
  if (b.name !== undefined) data.name = b.name || null;
  if (b.shape !== undefined) {
    if (!SHAPES.includes(b.shape)) throw Err.validation('شکل میز نامعتبر است');
    data.shape = b.shape;
  }
  if (b.zone !== undefined) {
    if (!ZONES.includes(b.zone)) throw Err.validation('ناحیه‌ی میز نامعتبر است');
    data.zone = b.zone;
  }
  if (b.is_vip !== undefined) data.isVip = !!b.is_vip;
  if (b.is_smoking !== undefined) data.isSmoking = !!b.is_smoking;
  if (b.is_accessible !== undefined) data.isAccessible = !!b.is_accessible;
  if (b.is_active !== undefined) data.isActive = !!b.is_active;
  if (b.min_party_size !== undefined) data.minPartySize = Number(b.min_party_size) || 1;
  if (b.max_party_size !== undefined) data.maxPartySize = b.max_party_size ? Number(b.max_party_size) : null;
  if (b.pos_x !== undefined) data.posX = b.pos_x;
  if (b.pos_y !== undefined) data.posY = b.pos_y;
  if (b.rotation !== undefined) data.rotation = Number(b.rotation) || 0;

  const updated = await db.table.update({ where: { id: params.id }, data });
  return NextResponse.json({ id: updated.id, number: updated.number });
});

/** DELETE — حذف میز. اگر رزرو فعالی به این میز وصل باشد، اجازه نمی‌دهد (برای جلوگیری از یتیم‌شدن رزرو). */
export const DELETE = withRestaurantAuth({ rateLimit: 'auth', permission: 'canManageTables' }, async (_req, ctx, params: { id: string }) => {
  const table = await db.table.findUnique({ where: { id: params.id } });
  if (!table || table.restaurantId !== ctx.restaurant.id) throw Err.notFound('میز');

  const activeReservation = await db.reservation.findFirst({
    where: { tableId: params.id, status: { in: ['pending', 'confirmed', 'auto_confirmed', 'checked_in', 'seated', 'dining'] } },
  });
  if (activeReservation) throw Err.validation('این میز رزرو فعال دارد — ابتدا رزرو را لغو یا تکمیل کن');

  await db.table.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
