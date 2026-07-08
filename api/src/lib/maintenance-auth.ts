import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════
//  احراز هویت endpointهای نگهداری (cron)
//  قبلاً این چک در ۴ route کپی شده بود (نقض DRY) — حالا یک منبع.
// ═══════════════════════════════════════════════════════════

/**
 * بررسی هدر x-maintenance-key. اگر نامعتبر بود، NextResponse خطا برمی‌گرداند؛
 * اگر معتبر بود، null برمی‌گرداند (یعنی ادامه بده).
 *
 * استفاده:
 *   const denied = guardMaintenance(req);
 *   if (denied) return denied;
 */
export function guardMaintenance(req: Request): NextResponse | null {
  const key = req.headers.get('x-maintenance-key');
  if (!process.env.MAINTENANCE_KEY || key !== process.env.MAINTENANCE_KEY) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی غیرمجاز' } },
      { status: 401 },
    );
  }
  return null;
}
