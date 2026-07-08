import { createHash, randomInt } from 'crypto';
import { db } from './db';
import { redis } from './redis';
import { Err } from './errors';
import { enqueueSms } from './sms';

const hash = (s: string) => createHash('sha256').update(s + process.env.JWT_SECRET).digest('hex');

export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (/^09\d{9}$/.test(d)) return '+98' + d.slice(1);
  if (/^989\d{9}$/.test(d)) return '+' + d;
  if (/^\+989\d{9}$/.test(raw)) return raw;
  throw Err.validation('شماره موبایل معتبر نیست (مثال: 09123456789)');
}

export async function requestOtp(rawPhone: string): Promise<{ devCode?: string }> {
  const phone = normalizePhone(rawPhone);
  // rate limit: ۳ درخواست در ۱۰ دقیقه per phone
  const rl = await redis.incr(`otp:rl:${phone}`);
  if (rl === 1) await redis.expire(`otp:rl:${phone}`, 600);
  if (rl > 3) throw Err.rateLimited();

  const code = String(randomInt(100000, 1000000)); // ۶ رقمی (۹۰۰هزار فضا — مقاوم‌تر در برابر brute-force)
  await db.otpCode.upsert({
    where: { phone },
    create: { phone, codeHash: hash(code), expiresAt: new Date(Date.now() + 2 * 60_000) },
    update: { codeHash: hash(code), expiresAt: new Date(Date.now() + 2 * 60_000), attempts: 0 },
  });
  await enqueueSms({ to: phone, template: 'otp', tokens: [code] });
  return process.env.OTP_DEV_MODE === 'true' ? { devCode: code } : {};
}

export async function verifyOtp(rawPhone: string, code: string): Promise<string /* userId */> {
  const phone = normalizePhone(rawPhone);
  const rec = await db.otpCode.findUnique({ where: { phone } });
  if (!rec || rec.expiresAt < new Date() || rec.attempts >= 5) throw Err.otpInvalid();
  if (rec.codeHash !== hash(code)) {
    await db.otpCode.update({ where: { phone }, data: { attempts: { increment: 1 } } });
    throw Err.otpInvalid();
  }
  await db.otpCode.delete({ where: { phone } });
  const user = await db.user.upsert({ where: { phone }, create: { phone }, update: {} });
  return user.id;
}
