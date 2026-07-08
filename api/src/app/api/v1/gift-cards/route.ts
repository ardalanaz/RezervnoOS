import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { createGiftCard, checkGiftCard } from '@/lib/loyalty';
import { Err, errorResponse } from '@/lib/errors';
import { safeJson } from '@/lib/security';

/** GET /api/v1/gift-cards?code=GIFT... — بررسی موجودی کارت هدیه */
export async function GET(req: Request) {
  try {
    const code = new URL(req.url).searchParams.get('code');
    if (!code) throw Err.validation('کد الزامی است');
    return NextResponse.json(await checkGiftCard(code));
  } catch (e) { return errorResponse(e); }
}

/** POST — خرید کارت هدیه. بدنه: { amount_toman, recipient_name?, recipient_phone?, message?, restaurant_id? } */
export async function POST(req: Request) {
  try {
    let buyerId: string | undefined;
    try { const a = authFromRequest(req); if (a.kind === 'customer') buyerId = a.sub; } catch {}
    const b = await safeJson(req);
    if (!b.amount_toman) throw Err.validation('مبلغ الزامی است');
    const card = await createGiftCard({
      buyerId, amountToman: b.amount_toman,
      recipientName: b.recipient_name, recipientPhone: b.recipient_phone,
      message: b.message, restaurantId: b.restaurant_id,
    });
    return NextResponse.json(card);
  } catch (e) { return errorResponse(e); }
}
