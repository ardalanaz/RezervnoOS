import { redis } from './redis';
import { Err } from './errors';

// ═══════════════════════════════════════════════════════════
//  ابزارهای امنیتی — Refresh revocation + Input validation
//  طبق OWASP: A01 (Access Control), A03 (Injection), A07 (Auth)
// ═══════════════════════════════════════════════════════════

// ── لیست سیاه refresh token (revocation) ──
// وقتی کاربر logout می‌کند یا توکن مشکوک است، jti بلاک می‌شود.
export async function revokeRefreshToken(jti: string, ttlSec = 30 * 86_400): Promise<void> {
  await redis.set(`revoked:${jti}`, '1', 'EX', ttlSec);
}
export async function isRefreshRevoked(jti?: string): Promise<boolean> {
  if (!jti) return false;
  const v = await redis.get(`revoked:${jti}`);
  return v === '1';
}

// ── اعتبارسنجی ورودی (دفاع در عمق برابر injection و داده‌ی بدفرم) ──
export const Validate = {
  // رشته‌ی متنی با سقف طول (جلوگیری از DoS با ورودی بزرگ)
  str(v: unknown, field: string, opts: { min?: number; max?: number } = {}): string {
    if (typeof v !== 'string') throw Err.validation(`${field} باید رشته باشد`);
    const s = v.trim();
    const { min = 0, max = 500 } = opts;
    if (s.length < min) throw Err.validation(`${field} خیلی کوتاه است`);
    if (s.length > max) throw Err.validation(`${field} خیلی بلند است (حداکثر ${max} کاراکتر)`);
    return s;
  },
  // عدد صحیح در بازه
  int(v: unknown, field: string, opts: { min?: number; max?: number } = {}): number {
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (!Number.isInteger(n)) throw Err.validation(`${field} باید عدد صحیح باشد`);
    const { min = -Infinity, max = Infinity } = opts;
    if (n < min || n > max) throw Err.validation(`${field} خارج از محدوده‌ی مجاز است`);
    return n;
  },
  // شناسه‌ی UUID (جلوگیری از تزریق در پارامتر مسیر)
  uuid(v: unknown, field: string): string {
    const s = String(v);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
      throw Err.validation(`${field} نامعتبر است`);
    }
    return s;
  },
  // تاریخ ISO (YYYY-MM-DD)
  dateStr(v: unknown, field: string): string {
    const s = String(v);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Err.validation(`${field} باید تاریخ معتبر باشد`);
    return s;
  },
  // ساعت (HH:MM)
  timeStr(v: unknown, field: string): string {
    const s = String(v);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw Err.validation(`${field} باید ساعت معتبر باشد`);
    return s;
  },
  // آرایه با سقف طول
  array<T>(v: unknown, field: string, maxLen = 100): T[] {
    if (!Array.isArray(v)) throw Err.validation(`${field} باید آرایه باشد`);
    if (v.length > maxLen) throw Err.validation(`${field} بیش از حد بزرگ است`);
    return v as T[];
  },
};

// ── محدودیت اندازه‌ی بدنه‌ی درخواست (جلوگیری از DoS) ──
const MAX_BODY_BYTES = 100 * 1024; // 100KB
export async function safeJson(req: Request): Promise<any> {
  const len = req.headers.get('content-length');
  if (len && parseInt(len, 10) > MAX_BODY_BYTES) {
    throw Err.validation('حجم درخواست بیش از حد مجاز است');
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw Err.validation('حجم درخواست بیش از حد مجاز است');
  try { return text ? JSON.parse(text) : {}; }
  catch { throw Err.validation('بدنه‌ی JSON نامعتبر است'); }
}
