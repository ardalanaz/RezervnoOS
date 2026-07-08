import { redis } from './redis';
import { Err } from './errors';
import { createLogger } from './logger';
const log = createLogger('security');

/**
 * Rate Limiter — لایه‌ی دفاع در برابر سوءاستفاده و بخشی از دفاع DDoS
 * الگوریتم: Sliding Window Log با Redis sorted-set — دقیق‌تر از fixed-window
 * (مشکل مرز پنجره را ندارد) و همچنان سبک.
 */

export interface RateLimitRule {
  max: number;        // حداکثر درخواست مجاز در بازه
  windowMs: number;   // طول بازه (میلی‌ثانیه)
  prefix: string;     // پیشوند کلید
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;      // epoch ms
  retryAfterSec: number;
}

/**
 * هسته‌ی محدودکننده با Sliding Window Log.
 * sorted-set: هر درخواست یک عضو با score=timestamp.
 * اعضای قدیمی‌تر از پنجره حذف، سپس تعداد فعلی شمرده می‌شود.
 * تمام عملیات اتمیک در یک pipeline (MULTI).
 */
export async function rateLimit(
  identifier: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const key = `rl:${rule.prefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - rule.windowMs;
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

  const pipe = redis.multi();
  pipe.zremrangebyscore(key, 0, windowStart);   // ۱) حذف خارج از پنجره
  pipe.zadd(key, now, member);                  // ۲) افزودن درخواست فعلی
  pipe.zcard(key);                              // ۳) شمارش
  pipe.zrange(key, 0, 0, 'WITHSCORES');         // ۴) قدیمی‌ترین (برای resetAt)
  pipe.pexpire(key, rule.windowMs + 1000);      // ۵) TTL خودکار

  const res = await pipe.exec();
  if (!res) {
    // Redis در دسترس نبود: fail-open (سرویس قطع نشود) — باید آلارم شود
    return { allowed: true, remaining: rule.max - 1, resetAt: now + rule.windowMs, retryAfterSec: 0 };
  }

  const count = (res[2]?.[1] as number) ?? 1;
  const oldest = res[3]?.[1] as string[] | undefined;
  const oldestTs = oldest && oldest.length >= 2 ? Number(oldest[1]) : now;
  const resetAt = oldestTs + rule.windowMs;

  if (count > rule.max) {
    await redis.zrem(key, member); // این درخواست را حذف کن (منصفانه)
    const retryAfterSec = Math.max(1, Math.ceil((resetAt - now) / 1000));
    return { allowed: false, remaining: 0, resetAt, retryAfterSec };
  }

  return { allowed: true, remaining: Math.max(0, rule.max - count), resetAt, retryAfterSec: 0 };
}

/** نسخه‌ی پرتاب‌کننده: اگر از حد گذشت، خطای 429 پرتاب می‌کند. در ابتدای route صدا بزن. */
export async function enforceRateLimit(
  identifier: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const result = await rateLimit(identifier, rule);
  if (!result.allowed) throw Err.rateLimited(result.retryAfterSec);
  return result;
}

/**
 * استخراج IP کلاینت. پشت CDN، IP واقعی در X-Forwarded-For/X-Real-IP/CF-Connecting-IP.
 * هشدار: این هدرها قابل جعل‌اند مگر پشت پروکسی معتمد که آن‌ها را بازنویسی کند.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return 'unknown';
}

/** قوانین آماده. اعداد محافظه‌کارانه‌اند؛ بر اساس ترافیک واقعی تنظیم کن. */
export const RULES = {
  otpPerPhone:   { prefix: 'otp:phone', max: 3,   windowMs: 10 * 60_000 } as RateLimitRule,
  otpPerIp:      { prefix: 'otp:ip',    max: 15,  windowMs: 10 * 60_000 } as RateLimitRule,
  otpVerify:     { prefix: 'otpv',      max: 8,   windowMs: 10 * 60_000 } as RateLimitRule,
  reservation:   { prefix: 'resv',      max: 10,  windowMs: 60_000 } as RateLimitRule,
  search:        { prefix: 'srch',      max: 60,  windowMs: 60_000 } as RateLimitRule,
  globalPerIp:   { prefix: 'glob',      max: 120, windowMs: 60_000 } as RateLimitRule,
  auth:          { prefix: 'auth',      max: 20,  windowMs: 60_000 } as RateLimitRule,
} as const;

// ── سیستم بن خودکار: IP که زیاد ریت‌لیمیت بخورد، موقتاً کامل بلاک می‌شود ──
const BAN_THRESHOLD = 10;        // چند بار ریت‌لیمیت تا بن
const BAN_WINDOW_MS = 5 * 60_000; // در این بازه
const BAN_DURATION_S = 60 * 60;   // مدت بن: ۱ ساعت

/** آیا این IP بن شده؟ */
export async function isBanned(ip: string): Promise<boolean> {
  try {
    const banned = await redis.get(`ban:${ip}`);
    return banned !== null;
  } catch { return false; }
}

/** ثبت یک تخلف ریت‌لیمیت؛ اگر از حد گذشت، IP را بن کن. */
export async function recordViolation(ip: string): Promise<void> {
  try {
    const key = `viol:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.pexpire(key, BAN_WINDOW_MS);
    if (count >= BAN_THRESHOLD) {
      await redis.set(`ban:${ip}`, '1', 'EX', BAN_DURATION_S);
      await redis.del(key);
      log.warn(`IP بن شد: ${ip}`, { violations: count });
    }
  } catch { /* اگر redis نبود، بی‌صدا رد شو */ }
}

/** هدرهای استاندارد RateLimit برای پاسخ. */
export function rateLimitHeaders(r: RateLimitResult, rule: RateLimitRule): Record<string, string> {
  return {
    'RateLimit-Limit': String(rule.max),
    'RateLimit-Remaining': String(r.remaining),
    'RateLimit-Reset': String(Math.ceil((r.resetAt - Date.now()) / 1000)),
  };
}
