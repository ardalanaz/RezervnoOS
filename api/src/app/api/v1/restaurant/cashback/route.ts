import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';

/** GET — درصدهای فعلی کش‌بک (مهاجرت‌شده به wrapper: rate-limit/auth/metric/trace خودکار) */
export const GET = withRestaurantAuth(
  { rateLimit: 'search' },
  async (_req, ctx) => {
    const r = await db.restaurant.findUnique({
      where: { id: ctx.restaurant.id },
      select: { cbBasePct: true, cbPreorderPct: true, cbVipPct: true, cbWinbackPct: true },
    });
    return NextResponse.json({
      base_pct: r!.cbBasePct, preorder_pct: r!.cbPreorderPct,
      vip_pct: r!.cbVipPct, winback_pct: r!.cbWinbackPct,
    });
  },
);

/** PATCH — به‌روزرسانی کش‌بک. نیاز به دسترسی مدیریت تنظیمات. */
export const PATCH = withRestaurantAuth(
  { permission: 'canManageSettings', rateLimit: 'auth' },
  async (req, ctx) => {
    const b = await req.json();
    const clamp = (v: unknown): number | undefined => {
      if (v === undefined || v === null) return undefined;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 50) throw Err.validation('درصد کش‌بک باید بین ۰ تا ۵۰ باشد');
      return Math.round(n);
    };
    const data: Record<string, number> = {};
    const base = clamp(b.base_pct); if (base !== undefined) data.cbBasePct = base;
    const pre = clamp(b.preorder_pct); if (pre !== undefined) data.cbPreorderPct = pre;
    const vip = clamp(b.vip_pct); if (vip !== undefined) data.cbVipPct = vip;
    const win = clamp(b.winback_pct); if (win !== undefined) data.cbWinbackPct = win;
    if (Object.keys(data).length === 0) throw Err.validation('حداقل یک مقدار لازم است');

    const updated = await db.restaurant.update({
      where: { id: ctx.restaurant.id }, data,
      select: { cbBasePct: true, cbPreorderPct: true, cbVipPct: true, cbWinbackPct: true },
    });
    return NextResponse.json({
      base_pct: updated.cbBasePct, preorder_pct: updated.cbPreorderPct,
      vip_pct: updated.cbVipPct, winback_pct: updated.cbWinbackPct,
    });
  },
);
