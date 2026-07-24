// ═══════════════════════════════════════════════════════════
//  Reservation Helpers — توابعِ کمکیِ خالصِ رزرو
//
//  جدا شده از reservation-engine برای خوانایی و تست‌پذیری بهتر:
//   • computeRanges     — محاسبه‌ی بازه‌ی رزرو + بازه‌ی بلاک (validation)
//   • genReservationCode — کد رزروِ امن و غیرقابل‌حدس
//   • isConflictError    — تشخیصِ خطای تداخل/exclusion دیتابیس (conflicts)
//   • isSerializationError — تشخیصِ خطای serialization/deadlock
//
//  این‌ها توابعِ خالص‌اند (بدونِ side-effect، بدونِ DB) — قابلِ تستِ واحدِ ساده.
// ═══════════════════════════════════════════════════════════
import { Prisma } from '@prisma/client';
import { zonedTimeToUtc } from './hours';
import { randomBytes } from 'crypto';
import { Err } from './errors';

export interface TimingConfig {
  slotMinutes: number;
  bufferMinutes: number;
  cleaningMinutes: number;
  holdMinutes: number;
}

/** محاسبه‌ی بازه‌ی رزرو + بازه‌ی بلاک (شامل نظافت/بافر). */
export function computeRanges(date: string, time: string, cfg: TimingConfig, durationOverride?: number, timezone = 'Asia/Tehran') {
  const start = zonedTimeToUtc(date, time, timezone);
  if (isNaN(+start)) throw Err.validation('تاریخ یا ساعت نامعتبر است');
  const duration = durationOverride ?? cfg.slotMinutes;
  const end = new Date(+start + duration * 60_000);
  // بازه‌ی بلاک = مدت رزرو + زمان نظافت + بافر ایمنی
  const blockBufferMin = cfg.cleaningMinutes + cfg.bufferMinutes;
  const blockEnd = new Date(+end + blockBufferMin * 60_000);
  return { start, end, blockEnd, duration, blockBufferMin };
}

// کد رزرو امن و غیرقابل‌حدس (نیاز امنیتی): 8 کاراکتر Base32 از منبع تصادفی امن.
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون 0/O/1/I برای خوانایی
/** کد رزروِ تصادفیِ امن (RZ + 7 کاراکتر). */
export function genReservationCode(): string {
  const bytes = randomBytes(8);
  let out = 'RZ';
  for (let i = 0; i < 7; i++) out += B32[bytes[i] % 32];
  return out;
}

/** تشخیص خطاهای تداخل/exclusion/serialization دیتابیس (برای retry). */
export function isConflictError(e: unknown): boolean {
  // 23P01 = exclusion_violation (EXCLUDE constraint ما)
  // 40001 = serialization_failure ، 40P01 = deadlock_detected
  const code = (e as { code?: string })?.code;
  if (code === '23P01' || code === '40001' || code === '40P01') return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2010') {
      const inner = (e.meta as { code?: string } | undefined)?.code;
      return inner === '23P01' || inner === '40001' || inner === '40P01';
    }
    if (e.code === 'P2034') return true; // write conflict / deadlock در Prisma
  }
  return false;
}

/** تشخیصِ خطای serialization/deadlock (زیرمجموعه‌ی conflict، برای retry با backoff). */
export function isSerializationError(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  if (code === '40001' || code === '40P01') return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') return true;
  return false;
}
