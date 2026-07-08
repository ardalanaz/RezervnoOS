import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';
import { suggestPricing, type HeatCell } from '@/lib/pricing';

// ═══════════════════════════════════════════════════════════
//  GET  /restaurant/pricing         — قواعدِ فعلی + پیشنهادهای هوشمند
//  PUT  /restaurant/pricing         — ذخیره‌ی قواعدِ قیمت (پذیرفته‌شده توسط رستوران‌دار)
// ═══════════════════════════════════════════════════════════

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateRules(rules: unknown): boolean {
  if (rules === null) return true;
  if (!Array.isArray(rules)) return false;
  for (const r of rules as Record<string, unknown>[]) {
    if (!Array.isArray(r.dows) || !(r.dows as number[]).every(d => Number.isInteger(d) && d >= 0 && d <= 6)) return false;
    if (typeof r.from !== 'string' || !HHMM.test(r.from)) return false;
    if (typeof r.to !== 'string' || !HHMM.test(r.to)) return false;
    if (!Number.isInteger(r.min_toman) || (r.min_toman as number) < 0) return false;
  }
  return true;
}

export const GET = withRestaurantAuth({ permission: 'canManageSettings', rateLimit: 'search' }, async (_req, ctx) => {
  const r = await db.restaurant.findUnique({
    where: { id: ctx.restaurant.id },
    select: { pricingRules: true, baseMinSpendToman: true },
  });

  // داده‌ی شلوغیِ ۹۰ روز اخیر برای تولیدِ پیشنهاد
  const heat = await db.$queryRaw<HeatCell[]>`
    SELECT EXTRACT(DOW FROM slot_start)::int AS dow,
           EXTRACT(HOUR FROM slot_start)::int AS hour,
           COUNT(*)::int AS count
    FROM reservations
    WHERE restaurant_id = ${ctx.restaurant.id}::uuid
      AND slot_start >= now() - interval '90 days'
      AND status IN ('confirmed','arrived','seated','completed')
    GROUP BY dow, hour
  `.catch(() => [] as HeatCell[]);

  const suggestions = suggestPricing(heat, r?.baseMinSpendToman ?? 0);

  return NextResponse.json({
    current_rules: r?.pricingRules ?? [],
    base_min_spend_toman: r?.baseMinSpendToman ?? 0,
    suggestions,
    has_data: heat.length > 0,
  });
});

export const PUT = withRestaurantAuth({ permission: 'canManageSettings', rateLimit: 'auth' }, async (req, ctx) => {
  const b = await req.json();
  if (!validateRules(b.rules)) throw Err.validation('ساختار قواعد قیمت نامعتبر است');
  const baseMin = Number.isInteger(b.base_min_spend_toman) && b.base_min_spend_toman >= 0
    ? b.base_min_spend_toman : 0;

  await db.restaurant.update({
    where: { id: ctx.restaurant.id },
    data: {
      pricingRules: b.rules ?? null,
      baseMinSpendToman: baseMin,
    },
  });

  return NextResponse.json({ ok: true });
});
