import { NextResponse } from 'next/server';
import { requestOtp } from '@/lib/otp';
import { errorResponse } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    const r = await requestOtp(phone);
    return NextResponse.json(r, { status: r.devCode ? 200 : 204 });
  } catch (e) { return errorResponse(e); }
}
