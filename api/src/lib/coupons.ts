import { db } from './db';
import { Err } from './errors';

// ═══════════════════════════════════════════════════════════
//  موتور کوپن — مستقل از کش‌بک درصدی دائمی فعلی.
//  کوپن برای کمپین‌های هدفمند و موقت است (winback، تولد، VIP).
// ═══════════════════════════════════════════════════════════

export async function validateCoupon(restaurantId: string, code: string, userId: string | null) {
  const coupon = await db.coupon.findUnique({ where: { restaurantId_code: { restaurantId, code: code.toUpperCase() } } });
  if (!coupon || !coupon.isActive) throw Err.validation('کد تخفیف نامعتبر است');
  const now = new Date();
  if (coupon.validFrom > now) throw Err.validation('این کد هنوز فعال نشده است');
  if (coupon.validUntil && coupon.validUntil < now) throw Err.validation('این کد منقضی شده است');
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) throw Err.validation('ظرفیت استفاده از این کد تمام شده است');

  if (userId) {
    const used = await db.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.perUserLimit) throw Err.validation('شما قبلاً از این کد استفاده کرده‌اید');
    if (coupon.targetSegment) {
      const insight = await db.customerInsight.findUnique({ where: { restaurantId_userId: { restaurantId, userId } } });
      if (!insight || insight.segment !== coupon.targetSegment) throw Err.validation('این کد برای حساب شما فعال نیست');
    }
  }
  return coupon;
}

/** تخفیف را روی مبلغ سفارش اعمال می‌کند. */
export function calcDiscount(coupon: { kind: string; value: number }, subtotalToman: number): number {
  // درصدی: سقف = مبلغ کل (NEW-C2: جلوگیری از قیمت منفی اگر value اشتباهاً >۱۰۰ باشد)
  if (coupon.kind === 'percent') return Math.min(Math.round((subtotalToman * coupon.value) / 100), subtotalToman);
  if (coupon.kind === 'fixed') return Math.min(coupon.value, subtotalToman);
  return 0; // free_item جداگانه در سطح آیتم اعمال می‌شود
}

/**
 * redemption اتمیک کوپن — ضد TOCTOU (NEW-H1).
 * به‌جای چک جدا + increment جدا، در یک UPDATE شرطی: فقط اگر هنوز ظرفیت هست
 * increment می‌کند. اگر صفر ردیف برگشت = سقف پر شده (دو درخواست همزمان امن).
 * تأییدشده روی PostgreSQL واقعی.
 * خروجی: true اگر redemption موفق بود، false اگر سقف پر بود.
 */
export async function redeemCouponAtomic(
  couponId: string, userId: string | null, reservationCode: string | null,
  discountToman: number, perUserLimit: number,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    // ۱) افزایش شمارنده فقط اگر ظرفیت کل هست (اتمیک)
    const claimed = await tx.$queryRaw<{ id: string }[]>`
      UPDATE coupons SET redemption_count = redemption_count + 1
      WHERE id = ${couponId}::uuid
        AND (max_redemptions IS NULL OR redemption_count < max_redemptions)
      RETURNING id
    `;
    if (claimed.length === 0) return false; // سقف کل پر است

    // ۲) چک سقف per-user داخل همان تراکنش (با شمارش فعلی)
    if (userId) {
      const used = await tx.couponRedemption.count({ where: { couponId, userId } });
      if (used >= perUserLimit) {
        throw Object.assign(new Error('سقف استفاده‌ی شخصی پر است'), { rollback: true });
      }
    }

    // ۳) ثبت رکورد
    await tx.couponRedemption.create({ data: { couponId, userId, reservationCode, discountToman } });
    return true;
  }).catch((e) => {
    // اگر per-user limit خورد، تراکنش rollback شده (شمارنده هم برگشته) → false
    if ((e as any)?.rollback) return false;
    throw e;
  });
}

/** نسخه‌ی tx-aware (برای فراخوانی داخل تراکنش رزرو، بدون تراکنش تودرتو). */
export async function redeemCouponAtomicTx(
  tx: any, couponId: string, userId: string | null, reservationCode: string | null, discountToman: number,
): Promise<boolean> {
  const claimed = await tx.$queryRaw<{ id: string }[]>`
    UPDATE coupons SET redemption_count = redemption_count + 1
    WHERE id = ${couponId}::uuid
      AND (max_redemptions IS NULL OR redemption_count < max_redemptions)
    RETURNING id
  `;
  if (claimed.length === 0) return false;
  await tx.couponRedemption.create({ data: { couponId, userId, reservationCode, discountToman } });
  return true;
}

/** نسخه‌ی قدیمی (بدون گارد) — منسوخ. از redeemCouponAtomic استفاده کن. */
export async function redeemCoupon(couponId: string, userId: string | null, reservationCode: string | null, discountToman: number) {
  await db.$transaction(async tx => {
    await tx.coupon.update({ where: { id: couponId }, data: { redemptionCount: { increment: 1 } } });
    await tx.couponRedemption.create({ data: { couponId, userId, reservationCode, discountToman } });
  });
}

/** کد یکتای خوانا برای کمپین خودکار می‌سازد (مثلاً WELCOME-7K2N). */
export function genCouponCode(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix.toUpperCase()}-${rand}`;
}
