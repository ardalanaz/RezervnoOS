import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';
import { safeJson } from '@/lib/schemas';

// ═══════════════════════════════════════════════════════════
//  GET  /restaurant/hours — خواندن ساعتِ کاری + تعطیلاتِ خاص
//  PUT  /restaurant/hours — تنظیم ساعتِ کاری (و تعطیلات)
//  منطقِ اعتبارسنجی اینجاست؛ ساده و متمرکز.
// ═══════════════════════════════════════════════════════════

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** اعتبارسنجی ساختار openingHours قبل از ذخیره. */
function validateHours(oh: unknown): boolean {
  if (oh === null) return true;
  if (typeof oh !== 'object' || Array.isArray(oh)) return false;
  for (const [k, shifts] of Object.entries(oh as Record<string, unknown>)) {
    if (!/^[0-6]$/.test(k)) return false;                 // کلید فقط 0..6
    if (!Array.isArray(shifts)) return false;
    for (const s of shifts) {
      if (!Array.isArray(s) || s.length !== 2) return false;
      if (!HHMM.test(s[0]) || !HHMM.test(s[1])) return false;
    }
  }
  return true;
}

export const GET = withRestaurantAuth({ permission: 'canManageSettings', rateLimit: 'search' }, async (_req, ctx) => {
  const r = await db.restaurant.findUnique({
    where: { id: ctx.restaurant.id },
    select: { openingHours: true, timezone: true },
  });
  const closures = await db.$queryRaw<Array<{ closure_date: Date; reason: string | null }>>`
    SELECT closure_date, reason FROM restaurant_closures
    WHERE restaurant_id = ${ctx.restaurant.id}::uuid AND closure_date >= CURRENT_DATE
    ORDER BY closure_date
  `.catch(() => []);
  return NextResponse.json({
    opening_hours: r?.openingHours ?? null,
    timezone: r?.timezone ?? 'Asia/Tehran',
    closures: closures.map(c => ({
      date: c.closure_date instanceof Date ? c.closure_date.toISOString().slice(0, 10) : String(c.closure_date).slice(0, 10),
      reason: c.reason,
    })),
  });
});

export const PUT = withRestaurantAuth({ permission: 'canManageSettings', rateLimit: 'auth' }, async (req, ctx) => {
  const b = await safeJson(req);
  if (!validateHours(b.opening_hours)) throw Err.validation('ساختار ساعتِ کاری نامعتبر است');

  await db.restaurant.update({
    where: { id: ctx.restaurant.id },
    data: { openingHours: b.opening_hours ?? null },
  });

  // به‌روزرسانیِ تعطیلاتِ خاص (اگر ارسال شده): جایگزینیِ کامل
  if (Array.isArray(b.closures)) {
    await db.$executeRaw`DELETE FROM restaurant_closures WHERE restaurant_id = ${ctx.restaurant.id}::uuid`;
    for (const c of b.closures) {
      if (typeof c?.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) continue;
      await db.$executeRaw`
        INSERT INTO restaurant_closures (restaurant_id, closure_date, reason)
        VALUES (${ctx.restaurant.id}::uuid, ${c.date}::date, ${c.reason ?? null})
        ON CONFLICT (restaurant_id, closure_date) DO UPDATE SET reason = EXCLUDED.reason
      `;
    }
  }

  return NextResponse.json({ ok: true });
});
