import { NextResponse } from 'next/server';
import { requestOtp } from '@/lib/otp';
import { errorResponse } from '@/lib/errors';
import { parseBody, zPhone, z } from '@/lib/schemas';

const schema = z.object({ phone: zPhone });

export async function POST(req: Request) {
  try {
    const { phone } = await parseBody(req, schema);
    const r = await requestOtp(phone);
    return NextResponse.json(r, { status: r.devCode ? 200 : 204 });
  } catch (e) { return errorResponse(e); }
}
