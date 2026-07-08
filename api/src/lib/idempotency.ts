import { db } from './db';
import { createLogger } from './logger';

const log = createLogger('idempotency');

// ═══════════════════════════════════════════════════════════════════════
//  Idempotency سطح HTTP — جلوگیری از double-submit
//
//  مشکل: کاربر روی «رزرو» دوبار می‌زند (یا شبکه retry می‌کند) → دو تلاش.
//  EXCLUDE constraint از double-booking روی یک میز جلوگیری می‌کند، ولی
//  دو رزرو روی میزهای مختلف یا دو پرداخت همچنان ممکن است.
//
//  راه‌حل: کلاینت یک هدر `Idempotency-Key` می‌فرستد. اگر همان کلید قبلاً
//  دیده شده باشد، پاسخ اولِ cache‌شده برمی‌گردد (بدون اجرای دوباره).
//  تست‌شده روی PostgreSQL واقعی.
// ═══════════════════════════════════════════════════════════════════════

type IdempotentResult<T> =
  | { replayed: true; response: T }
  | { replayed: false; commit: (response: T) => Promise<void> };

/**
 * تلاش برای claim یک کلید idempotency.
 * - اگر کلید جدید باشد: claim می‌کند و یک `commit` برمی‌گرداند که پاسخ را ذخیره می‌کند.
 * - اگر کلید تکراری و کامل باشد: پاسخ cache‌شده را با `replayed: true` برمی‌گرداند.
 * - اگر کلید تکراری ولی هنوز in_progress باشد: خطای ۴۰۹ (درخواست همزمان).
 *
 * اگر کلاینت هدر نفرستد (key undefined)، idempotency رد می‌شود (commit بی‌اثر).
 */
export async function withIdempotency<T>(
  key: string | undefined,
  scope: string,
): Promise<IdempotentResult<T>> {
  if (!key) {
    // بدون کلید → بدون محافظت؛ commit کاری نمی‌کند
    return { replayed: false, commit: async () => {} };
  }

  // تلاش برای claim اتمیک (insert با ON CONFLICT DO NOTHING)
  const claimed = await db.$queryRaw<{ key: string }[]>`
    INSERT INTO idempotency_keys (key, scope, status, expires_at)
    VALUES (${key}, ${scope}, 'in_progress', now() + interval '24 hours')
    ON CONFLICT (key) DO NOTHING
    RETURNING key
  `;

  if (claimed.length > 0) {
    // اولین بار — اجازه‌ی اجرا، سپس ذخیره‌ی پاسخ
    return {
      replayed: false,
      commit: async (response: T) => {
        await db.idempotencyKey.update({
          where: { key },
          data: { status: 'done', response: response as object },
        }).catch((e) => log.warn('ذخیره‌ی پاسخ idempotency ناموفق', (e as Error).message));
      },
    };
  }

  // کلید تکراری — وضعیتش را بخوان
  const existing = await db.idempotencyKey.findUnique({ where: { key } });
  if (existing?.status === 'done' && existing.response !== null) {
    log.debug('replay idempotent', { key, scope });
    return { replayed: true, response: existing.response as T };
  }

  // هنوز in_progress = درخواست همزمان با همان کلید
  throw Object.assign(new Error('درخواست تکراری در حال پردازش است'), { statusCode: 409, code: 'IDEMPOTENCY_CONFLICT' });
}

/** پاک‌سازی کلیدهای منقضی (توسط cron نگه‌داری صدا زده می‌شود). */
export async function cleanupIdempotencyKeys(): Promise<number> {
  const res = await db.idempotencyKey.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return res.count;
}
