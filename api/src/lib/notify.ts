import { createLogger } from './logger';
const log = createLogger('notify');
// ═══════════════════════════════════════════════════════════
//  اعلان Push و Email — رزرونو
//
//  این ماژول رابط یکپارچه‌ای برای اعلان‌های غیر-SMS فراهم می‌کند.
//  در حالت پیش‌فرض (بدون کلید ارائه‌دهنده) فقط لاگ می‌کند.
//  برای production، کلیدها را در env بگذار و منطق ارسال واقعی فعال می‌شود.
// ═══════════════════════════════════════════════════════════

/**
 * ارسال اعلان Push به کاربر.
 * Production: با FCM (Firebase) یا وب‌پوش. توکن دستگاه از جدول کاربر/دستگاه خوانده می‌شود.
 */
export async function sendPush(userId: string, title: string, body: string): Promise<void> {
  const fcmKey = process.env.FCM_SERVER_KEY;
  if (!fcmKey) {
    log.info(`[PUSH] → user:${userId} | ${title} — ${body}`);
    return;
  }
  // TODO(production): خواندن device tokenها از دیتابیس و ارسال به FCM
  // const tokens = await db.deviceToken.findMany({ where: { userId } });
  // await fetch('https://fcm.googleapis.com/fcm/send', { ... });
  try {
    // اسکلت ارسال واقعی — هنگام افزودن جدول device token تکمیل شود
    log.info(`[PUSH:FCM] → user:${userId} | ${title}`);
  } catch (e) {
    log.error(`[PUSH:خطا] user:${userId}:`, (e as Error).message);
  }
}

/**
 * ارسال ایمیل.
 * Production: با SMTP یا سرویس‌هایی مثل SendGrid/Mailgun/Postmark.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM || 'noreply@rezervno.ir';
  if (!apiKey) {
    log.info(`[EMAIL] → ${to} | ${subject}`);
    return;
  }
  try {
    // اسکلت ارسال واقعی — با ارائه‌دهنده‌ی انتخابی تکمیل شود
    // await fetch('https://api.sendgrid.com/v3/mail/send', { ... from, to, subject, body });
    log.info(`[EMAIL:ارسال] ${to} | ${subject} (from ${from})`);
  } catch (e) {
    log.error(`[EMAIL:خطا] ${to}:`, (e as Error).message);
  }
}

// ═══════════════════════════════════════════════════════════
//  نسخه‌های صف‌محور — برای مسیرهای غیرفوری، به‌جای ارسال همزمان
//  از صف Job استفاده کن (retry/DLQ/priority رایگان). worker با
//  sendEmail/sendPush بالا کار واقعی را انجام می‌دهد.
// ═══════════════════════════════════════════════════════════

/** صف‌بندی ایمیل (غیرمسدود). idempotencyKey اختیاری برای جلوگیری از ارسال تکراری. */
export async function queueEmail(to: string, subject: string, body: string, idempotencyKey?: string): Promise<void> {
  try {
    const { enqueue } = await import('./queue');
    await enqueue({ kind: 'email', payload: { to, subject, body }, idempotencyKey });
  } catch {
    await sendEmail(to, subject, body).catch(() => {}); // fallback
  }
}

/** صف‌بندی Push (غیرمسدود). */
export async function queuePush(userId: string, title: string, body: string, idempotencyKey?: string): Promise<void> {
  try {
    const { enqueue } = await import('./queue');
    await enqueue({ kind: 'push', payload: { userId, title, body }, idempotencyKey });
  } catch {
    await sendPush(userId, title, body).catch(() => {}); // fallback
  }
}
