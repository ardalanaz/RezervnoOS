import { NextResponse } from 'next/server';
import { qrCheckIn } from '@/lib/tables';
import { Err, errorResponse } from '@/lib/errors';

/** POST /api/v1/checkin — مهمان با اسکن QR میز check-in می‌کند. بدنه: { qr_code } */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.qr_code) throw Err.validation('qr_code الزامی است');
    const result = await qrCheckIn(b.qr_code);
    return NextResponse.json(result);
  } catch (e) { return errorResponse(e); }
}
