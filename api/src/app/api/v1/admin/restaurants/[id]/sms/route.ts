import { NextResponse } from 'next/server';
import { enforceRateLimit, clientIp, RULES } from '@/lib/ratelimit';
import { adminAuthFromRequest } from '@/lib/admin-auth';
import { topupSms, getSmsBalance } from '@/lib/sms-balance';
import { audit } from '@/lib/audit';
import { Err, errorResponse } from '@/lib/errors';

/**
 * GET — موجودی و تاریخچه‌ی SMS یک رستوران.
 * POST — شارژ موجودی SMS رستوران (توسط ادمین پلتفرم). ثبت در audit.
 *
 * body (POST): { amount: number, note?: string }
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await enforceRateLimit(clientIp(req), RULES.search);
    adminAuthFromRequest(req);
    const balance = await getSmsBalance(params.id);
    return NextResponse.json(balance);
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await enforceRateLimit(clientIp(req), RULES.auth);
    const admin = adminAuthFromRequest(req);
    const body = await req.json();
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw Err.validation('تعداد پیامک باید عددی مثبت باشد');
    }

    const result = await topupSms(params.id, amount, admin.sub, body.note);

    // ثبت عملیات مالی در audit
    await audit({
      action: 'admin.action', actorId: admin.sub, actorType: 'admin',
      targetId: params.id, restaurantId: params.id, ip: clientIp(req),
      detail: { operation: 'sms_topup', amount, new_balance: result.balance },
    });

    return NextResponse.json({ ok: true, balance: result.balance, added: amount });
  } catch (e) { return errorResponse(e); }
}
