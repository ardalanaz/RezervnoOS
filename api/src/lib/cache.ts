import { redis } from './redis';

// ═══════════════════════════════════════════════════════════
//  لایه‌ی Cache مرکزی — الگوی cache-aside با Redis
//  برای کاهش بار دیتابیس در ترافیک بالا (۵۰۰ req/s).
//
//  استفاده:
//    const data = await cached('key', 60, async () => db.query(...));
//  باطل‌سازی:
//    await invalidate('restaurants:*');
// ═══════════════════════════════════════════════════════════

/**
 * cache-aside: اگر در cache بود برگردان، وگرنه fetch کن و ذخیره کن.
 * @param key کلید یکتا
 * @param ttlSec مدت اعتبار (ثانیه)
 * @param fetcher تابع گرفتن داده از منبع اصلی (دیتابیس)
 */
export async function cached<T>(key: string, ttlSec: number, fetcher: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(`cache:${key}`);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch { /* cache miss on error — به دیتابیس برو */ }

  const data = await fetcher();
  try {
    await redis.set(`cache:${key}`, JSON.stringify(data), 'EX', ttlSec);
  } catch { /* نوشتن cache شکست خورد — مهم نیست، داده را برگردان */ }
  return data;
}

/** باطل‌سازی یک کلید مشخص */
export async function invalidate(key: string): Promise<void> {
  try { await redis.del(`cache:${key}`); } catch { /* */ }
}

/**
 * باطل‌سازی با الگو (مثلاً 'restaurant:123:*').
 * از SCAN استفاده می‌کند (نه KEYS) تا Redis را در ترافیک بالا بلاک نکند.
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  let cursor = '0';
  let count = 0;
  try {
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `cache:${pattern}`, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) { await redis.del(...keys); count += keys.length; }
    } while (cursor !== '0');
  } catch { /* */ }
  return count;
}

/** بسته‌بندی: ساخت کلید cache از اجزا */
export function cacheKey(...parts: (string | number | undefined | null)[]): string {
  return parts.filter(p => p !== undefined && p !== null).join(':');
}
