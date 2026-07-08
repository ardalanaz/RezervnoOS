import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';

const SHAPES = ['rectangle', 'round', 'booth'];
const ZONES = ['indoor', 'outdoor', 'window', 'vip', 'smoking'];

/** GET — لیست همه‌ی میزهای رستوران (برای نقشه‌ی سالن و مدیریت میز در پنل) */
export const GET = withRestaurantAuth({ permission: 'canManageTables' }, async (_req, ctx) => {
  const tables = await db.table.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: { number: 'asc' },
  });
  return NextResponse.json({
    items: tables.map(t => ({
      id: t.id, number: t.number, name: t.name, capacity: t.capacity,
      min_party_size: t.minPartySize, max_party_size: t.maxPartySize,
      shape: t.shape, zone: t.zone,
      is_vip: t.isVip, is_smoking: t.isSmoking, is_accessible: t.isAccessible,
      is_active: t.isActive, state: t.state,
      pos_x: t.posX, pos_y: t.posY, rotation: t.rotation,
      qr_code: t.qrCode,
    })),
  });
});

/** POST — افزودن میز جدید · بدنه: { number, capacity, name?, shape?, zone?, is_vip?, is_smoking?, is_accessible? } */
export const POST = withRestaurantAuth({ rateLimit: 'auth', permission: 'canManageTables' }, async (req, ctx) => {
  const b = await req.json();
  const number = Number(b.number);
  const capacity = Number(b.capacity);
  if (!Number.isInteger(number) || number <= 0) throw Err.validation('شماره میز باید عدد مثبت باشد');
  if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 50) throw Err.validation('ظرفیت میز نامعتبر است');
  if (b.shape && !SHAPES.includes(b.shape)) throw Err.validation('شکل میز نامعتبر است');
  if (b.zone && !ZONES.includes(b.zone)) throw Err.validation('ناحیه‌ی میز نامعتبر است');

  const dup = await db.table.findFirst({ where: { restaurantId: ctx.restaurant.id, number } });
  if (dup) throw Err.validation(`میز شماره ${number} از قبل وجود دارد`);

  const table = await db.table.create({
    data: {
      restaurantId: ctx.restaurant.id, number, capacity,
      name: b.name || null,
      shape: b.shape || 'rectangle', zone: b.zone || 'indoor',
      isVip: !!b.is_vip, isSmoking: !!b.is_smoking, isAccessible: !!b.is_accessible,
      minPartySize: b.min_party_size || 1, maxPartySize: b.max_party_size || capacity,
    },
  });
  return NextResponse.json({ id: table.id, number: table.number }, { status: 201 });
});
