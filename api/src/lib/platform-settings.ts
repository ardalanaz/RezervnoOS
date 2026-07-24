import { db } from './db';
import { cached, invalidatePattern } from './cache';

// ⚠️ همگام‌سازی‌شده با DB زنده (migration 020_platform_settings_payment_toggle).
//
// تنظیماتِ سطح‌پلتفرم (کلید/مقدار ساده) — مثل merchant_id زرین‌پال، فلگ sandbox،
// کلید کاوه‌نگار — عمداً در دیتابیس نگه داشته می‌شوند نه فقط env، تا از پنل
// شرکت («تنظیمات پلتفرم») بدون نیاز به ری‌دیپلوی قابل‌ویرایش باشند.
// کش ۳۰ ثانیه‌ای تا هر request مستقیم دیتابیس نخورد.

const TTL_SEC = 30;

/** خواندنِ یک تنظیمِ پلتفرم (با کش). اگر در DB نبود، fallback به env. */
export async function getPlatformSetting(key: string, envFallback?: string): Promise<string | undefined> {
  const value = await cached(`platform-settings:${key}`, TTL_SEC, async () => {
    const row = await db.platformSettings.findUnique({ where: { key } });
    return row?.value ?? null;
  });
  return value ?? envFallback ?? undefined;
}

/** نوشتنِ یک تنظیمِ پلتفرم (پنل شرکت). کش مربوطه بلافاصله باطل می‌شود. */
export async function setPlatformSetting(key: string, value: string, updatedByStaffId?: string): Promise<void> {
  await db.platformSettings.upsert({
    where: { key },
    create: { key, value, updatedBy: updatedByStaffId },
    update: { value, updatedBy: updatedByStaffId, updatedAt: new Date() },
  });
  await invalidatePattern(`platform-settings:${key}`);
}

/** همه‌ی تنظیماتِ زرین‌پال یک‌جا (برای پنل شرکت + lib/zarinpal.ts). */
export async function getZarinpalConfig(): Promise<{ merchantId: string | undefined; sandbox: boolean }> {
  const [merchantId, sandboxRaw] = await Promise.all([
    getPlatformSetting('zarinpal_merchant_id', process.env.ZARINPAL_MERCHANT_ID),
    getPlatformSetting('zarinpal_sandbox', process.env.ZARINPAL_SANDBOX),
  ]);
  return { merchantId, sandbox: sandboxRaw === 'true' };
}
