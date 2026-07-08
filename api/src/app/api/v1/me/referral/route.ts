import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { getReferralStats, createReferral } from '@/lib/loyalty';
import { Err, errorResponse } from '@/lib/errors';
import { safeJson } from '@/lib/security';

/** GET — آمار و کد دعوت کاربر */
export async function GET(req: Request) {
  try {
    const auth = authFromRequest(req);
    if (auth.kind !== 'customer') throw Err.forbidden();
    return NextResponse.json(await getReferralStats(auth.sub));
  } catch (e) { return errorResponse(e); }
}

/** POST — دعوت دوست با شماره. بدنه: { phone } */
export async function POST(req: Request) {
  try {
    const auth = authFromRequest(req);
    if (auth.kind !== 'customer') throw Err.forbidden();
    const { phone } = await safeJson(req);
    if (!phone) throw Err.validation('شماره الزامی است');
    return NextResponse.json(await createReferral(auth.sub, phone));
  } catch (e) { return errorResponse(e); }
}
