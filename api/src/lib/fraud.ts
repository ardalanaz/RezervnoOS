import { db } from './db';
import { audit } from './audit';
import { createLogger } from './logger';

const log = createLogger('fraud');

// ═══════════════════════════════════════════════════════════════════════
//  تشخیص تقلب/سوءاستفاده (Fraud Detection)
//
//  rate-limit از حملات حجمی جلوگیری می‌کند، ولی الگوهای سوءاستفاده‌ی
//  هوشمندانه‌تر را نمی‌گیرد. این ماژول سیگنال‌های تقلب را روی داده‌ی
//  واقعی تشخیص می‌دهد. همه‌ی کوئری‌ها روی PostgreSQL واقعی تست شده‌اند.
//
//  رویکرد: تشخیص (detection) + ثبت در audit، نه مسدودسازی خودکار خشن.
//  صاحب کسب‌وکار سیگنال را می‌بیند و تصمیم می‌گیرد (کاهش false-positive).
// ═══════════════════════════════════════════════════════════════════════

export type FraudSignal = {
  kind: 'coupon_multi_account' | 'high_no_show' | 'redemption_velocity';
  severity: 'high' | 'medium';
  subject: string;          // IP یا userId
  detail: string;
  metrics: Record<string, number>;
};

/**
 * سوءاستفاده‌ی چند‌حسابی از کوپن: یک IP که با چند حساب مختلف
 * یک کوپن را استفاده کرده (الگوی کلاسیک فارم‌کردن تخفیف).
 * نیازمند ستون ip در coupon_redemptions (افزوده‌شده، nullable).
 */
export async function detectCouponMultiAccount(restaurantId: string, minAccounts = 3): Promise<FraudSignal[]> {
  const rows = await db.$queryRaw<{ ip: string; coupon_id: string; distinct_accounts: bigint; total: bigint }[]>`
    SELECT cr.ip, cr.coupon_id,
           count(DISTINCT cr.user_id) AS distinct_accounts,
           count(*) AS total
    FROM coupon_redemptions cr
    JOIN coupons c ON c.id = cr.coupon_id
    WHERE c.restaurant_id = ${restaurantId}::uuid
      AND cr.ip IS NOT NULL
      AND cr.redeemed_at > now() - interval '30 days'
    GROUP BY cr.ip, cr.coupon_id
    HAVING count(DISTINCT cr.user_id) >= ${minAccounts}
    ORDER BY distinct_accounts DESC
    LIMIT 50
  `;
  return rows.map((r) => ({
    kind: 'coupon_multi_account' as const,
    severity: Number(r.distinct_accounts) >= minAccounts * 2 ? 'high' : 'medium',
    subject: r.ip,
    detail: `IP ${r.ip} با ${r.distinct_accounts} حساب مختلف یک کوپن را استفاده کرده`,
    metrics: { distinctAccounts: Number(r.distinct_accounts), total: Number(r.total) },
  }));
}

/**
 * الگوی no-show مشکوک: کاربری با نرخ no-show بالا و حداقل چند رزرو.
 * (سیگنال برای deposit-required کردن رزروهای بعدی این کاربر.)
 */
export async function detectHighNoShow(restaurantId: string, minReservations = 4, threshold = 0.6): Promise<FraudSignal[]> {
  const rows = await db.$queryRaw<{ user_id: string; total: bigint; no_shows: bigint; pct: number }[]>`
    SELECT user_id,
           count(*) AS total,
           count(*) FILTER (WHERE status = 'no_show') AS no_shows,
           round(100.0 * count(*) FILTER (WHERE status = 'no_show') / count(*)) AS pct
    FROM reservations
    WHERE restaurant_id = ${restaurantId}::uuid
      AND user_id IS NOT NULL
      AND created_at > now() - interval '90 days'
    GROUP BY user_id
    HAVING count(*) >= ${minReservations}
      AND count(*) FILTER (WHERE status = 'no_show')::float / count(*) >= ${threshold}
    ORDER BY pct DESC
    LIMIT 50
  `;
  return rows.map((r) => ({
    kind: 'high_no_show' as const,
    severity: Number(r.pct) >= 80 ? 'high' : 'medium',
    subject: r.user_id,
    detail: `کاربر با نرخ no-show ${r.pct}٪ (${r.no_shows} از ${r.total} رزرو)`,
    metrics: { total: Number(r.total), noShows: Number(r.no_shows), pct: Number(r.pct) },
  }));
}

/**
 * سرعت redemption غیرعادی: یک کاربر که در بازه‌ی کوتاه چند کوپن استفاده کرده.
 */
export async function detectRedemptionVelocity(restaurantId: string, maxPerDay = 5): Promise<FraudSignal[]> {
  const rows = await db.$queryRaw<{ user_id: string; cnt: bigint }[]>`
    SELECT cr.user_id, count(*) AS cnt
    FROM coupon_redemptions cr
    JOIN coupons c ON c.id = cr.coupon_id
    WHERE c.restaurant_id = ${restaurantId}::uuid
      AND cr.user_id IS NOT NULL
      AND cr.redeemed_at > now() - interval '1 day'
    GROUP BY cr.user_id
    HAVING count(*) > ${maxPerDay}
    ORDER BY cnt DESC
    LIMIT 50
  `;
  return rows.map((r) => ({
    kind: 'redemption_velocity' as const,
    severity: 'medium' as const,
    subject: r.user_id,
    detail: `کاربر ${r.cnt} کوپن در ۲۴ ساعت استفاده کرده`,
    metrics: { redemptions: Number(r.cnt) },
  }));
}

/** اجرای همه‌ی بررسی‌ها برای یک رستوران و ثبت سیگنال‌ها در audit. */
export async function runFraudScan(restaurantId: string): Promise<FraudSignal[]> {
  const [multiAccount, noShow, velocity] = await Promise.all([
    detectCouponMultiAccount(restaurantId).catch(() => []),
    detectHighNoShow(restaurantId).catch(() => []),
    detectRedemptionVelocity(restaurantId).catch(() => []),
  ]);
  const all = [...multiAccount, ...noShow, ...velocity];
  // ثبت سیگنال‌های high در audit برای بررسی
  for (const sig of all.filter((s) => s.severity === 'high')) {
    await audit({
      action: 'security.idor_attempt', // نزدیک‌ترین action موجود؛ یا 'admin.action'
      actorType: 'anonymous',
      restaurantId,
      detail: { fraud: sig.kind, subject: sig.subject, ...sig.metrics },
      success: false,
    }).catch(() => {});
  }
  if (all.length > 0) log.warn('سیگنال تقلب', { restaurantId, count: all.length });
  return all;
}
