import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';
import { safeJson } from '@/lib/schemas';

// ═══════════════════════════════════════════════════════════
//  GET /restaurant/location — دادهٔ مکانیِ رستوران (برای پنل).
//  PUT /restaurant/location — به‌روزرسانیِ آدرس/شهر/منطقه/کدپستی/مختصات.
//  این‌ها منبعِ schema.org PostalAddress + GeoCoordinates صفحاتِ SEO هستند (apps/seo).
//  همه اختیاری/nullable؛ فقط permission = canManageSettings.
// ═══════════════════════════════════════════════════════════

function str(v: unknown, max = 300): string | null {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') throw Err.validation('مقدارِ متنی نامعتبر است');
  const s = v.trim();
  if (s.length > max) throw Err.validation('متن خیلی بلند است');
  return s || null;
}
function coord(v: unknown, min: number, max: number, label: string): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw Err.validation(`${label} نامعتبر است`);
  return n;
}

export const GET = withRestaurantAuth({ permission: 'canManageSettings', rateLimit: 'search' }, async (_req, ctx) => {
  const r = await db.restaurant.findUnique({
    where: { id: ctx.restaurant.id },
    select: { address: true, city: true, district: true, postalCode: true, country: true, latitude: true, longitude: true },
  });
  return NextResponse.json({
    address: r?.address ?? null, city: r?.city ?? null, district: r?.district ?? null,
    postal_code: r?.postalCode ?? null, country: r?.country ?? 'IR',
    latitude: r?.latitude ?? null, longitude: r?.longitude ?? null,
  });
});

export const PUT = withRestaurantAuth({ permission: 'canManageSettings', rateLimit: 'auth' }, async (req, ctx) => {
  const b = await safeJson(req);
  await db.restaurant.update({
    where: { id: ctx.restaurant.id },
    data: {
      address: str(b.address),
      city: str(b.city, 100),
      district: str(b.district, 100),
      postalCode: str(b.postal_code, 20),
      latitude: coord(b.latitude, -90, 90, 'عرضِ جغرافیایی'),
      longitude: coord(b.longitude, -180, 180, 'طولِ جغرافیایی'),
    },
  });
  return NextResponse.json({ ok: true });
});
