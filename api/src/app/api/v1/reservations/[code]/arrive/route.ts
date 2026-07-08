import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { markArrival } from '@/lib/reservations';
import { Err, errorResponse } from '@/lib/errors';

/** POST — staff می‌زند «رسید» → وضعیت arrived + امتیاز + SMS خوش‌آمد.
 *  منطق در لایه‌ی سرویس (lib/reservations.ts → markArrival) است؛ این route لاغر است. */
export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const auth = authFromRequest(req);
    if (auth.kind !== 'staff') throw Err.forbidden();
    const result = await markArrival({ code: params.code, tenantId: auth.tenantId });
    return NextResponse.json(result);
  } catch (e) { return errorResponse(e); }
}
