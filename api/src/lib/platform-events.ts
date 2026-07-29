import { db } from './db';
import { createLogger } from './logger';

const log = createLogger('platform-events');

// ═══════════════════════════════════════════════════════════════════════
//  Data Platform · فاز ۱ — درجِ رویدادِ رفتاری
//
//  توجه: این ماژول با lib/events.ts فرق دارد. events.ts «رویدادِ دامنه →
//  تحویلِ webhook» است؛ این‌جا «رویدادِ رفتاری → جدولِ کانونیِ platform_events»
//  برای تحلیل/هوش است. عمداً جدا نگه داشته شد تا دو مفهوم قاطی نشوند.
//
//  اصولِ کلیدی:
//   • append-only: فقط insert، هرگز update/delete.
//   • هرگز مسیرِ اصلی را نمی‌شکند: خطا فقط log می‌شود (رویداد از دست می‌رود،
//     نه اینکه رزرو/جست‌وجو fail شود).
//   • زمینه اختیاری است (رویدادِ ناشناس هم پذیرفته می‌شود).
//  معماری: docs/INTELLIGENCE-PLATFORM-ARCHITECTURE.md
// ═══════════════════════════════════════════════════════════════════════

/** منبعِ رویداد — از کدام سطحِ سیستم منتشر شد. */
export type EventSource = 'customer' | 'business' | 'company' | 'backend' | 'cron';

export interface PlatformEventInput {
  type: string;                              // نامِ نام‌فضادار: "search.performed"
  occurredAt?: Date | string;                // پیش‌فرض: اکنون
  source: EventSource;
  tenantId?: string | null;
  restaurantId?: string | null;
  userId?: string | null;
  staffId?: string | null;
  sessionId?: string | null;
  correlationId?: string | null;
  device?: Record<string, unknown> | null;
  geo?: Record<string, unknown> | null;
  payload?: Record<string, unknown>;
  schemaVersion?: number;
}

function toRow(e: PlatformEventInput) {
  const occurred = e.occurredAt ? new Date(e.occurredAt) : new Date();
  return {
    type: e.type,
    // اگر occurredAt نامعتبر بود، به اکنون برگرد (هرگز NaN درج نکن)
    occurredAt: isNaN(occurred.getTime()) ? new Date() : occurred,
    source: e.source,
    tenantId: e.tenantId ?? null,
    restaurantId: e.restaurantId ?? null,
    userId: e.userId ?? null,
    staffId: e.staffId ?? null,
    sessionId: e.sessionId ?? null,
    correlationId: e.correlationId ?? null,
    device: (e.device ?? undefined) as object | undefined,
    geo: (e.geo ?? undefined) as object | undefined,
    payload: (e.payload ?? {}) as object,
    schemaVersion: e.schemaVersion ?? 1,
  };
}

/**
 * درجِ یک رویدادِ رفتاری. غیرمسدودکننده از منظرِ درستیِ مسیرِ اصلی:
 * خطای درج فقط log می‌شود و پرتاب نمی‌شود.
 */
export async function recordEvent(e: PlatformEventInput): Promise<void> {
  try {
    await db.platformEvent.create({ data: toRow(e) });
  } catch (err) {
    log.warn('درجِ رویداد ناموفق', { type: e.type, error: (err as Error).message });
  }
}

/**
 * درجِ دسته‌ایِ رویدادها (برای ingestِ batch از کلاینت). تعدادِ پذیرفته‌شده
 * را برمی‌گرداند. مثلِ recordEvent، هرگز پرتاب نمی‌کند.
 */
export async function recordEvents(events: PlatformEventInput[]): Promise<number> {
  if (!events.length) return 0;
  try {
    const res = await db.platformEvent.createMany({ data: events.map(toRow) });
    return res.count;
  } catch (err) {
    log.warn('درجِ دسته‌ایِ رویداد ناموفق', { count: events.length, error: (err as Error).message });
    return 0;
  }
}
