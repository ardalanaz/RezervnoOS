import { NextResponse } from 'next/server';
import { requestOtp, normalizePhone } from '@/lib/otp';
import { db } from '@/lib/db';
import { enforceRateLimit, clientIp, RULES } from '@/lib/ratelimit';
import { Err, errorResponse } from '@/lib/errors';

/** POST — درخواست کد ورود کارمند (فقط شماره‌های ثبت‌شده در جدول Staff) */
export async function POST(req: Request) {
  try {
    await enforceRateLimit(clientIp(req), RULES.otpVerify);
    const { phone } = await req.json();
    if (!phone) throw Err.validation('شماره موبایل لازم است');
    const normalized = normalizePhone(phone);
    const staff = await db.staff.findFirst({ where: { phone: normalized } });
    if (!staff) throw Err.forbidden('این شماره دسترسی پنل رستوران ندارد');
    const r = await requestOtp(normalized);
    return NextResponse.json(r, { status: r.devCode ? 200 : 204 });
  } catch (e) { return errorResponse(e); }
}
