import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';
import { enforceRateLimit, clientIp, RULES } from '@/lib/ratelimit';
import { Err, errorResponse } from '@/lib/errors';

/** GET /api/v1/me — اطلاعات کاربر فعلی */
export async function GET(req: Request) {
  try {
    const auth = authFromRequest(req);
    if (auth.kind !== 'customer') throw Err.forbidden();
    const user = await db.user.findUnique({
      where: { id: auth.sub },
      select: { id: true, phone: true, firstName: true, lastName: true, birthDate: true, avatarUrl: true },
    });
    if (!user) throw Err.notFound('کاربر');
    return NextResponse.json({ user });
  } catch (e) { return errorResponse(e); }
}

/**
 * PATCH /api/v1/me — به‌روزرسانی پروفایل (ثبت‌نام)
 * بدنه: { first_name, last_name?, birth_date? }
 */
export async function PATCH(req: Request) {
  try {
    await enforceRateLimit(clientIp(req), RULES.auth);
    const auth = authFromRequest(req);
    if (auth.kind !== 'customer') throw Err.forbidden();
    const b = await req.json();

    const firstName = (b.first_name ?? '').toString().trim();
    if (!firstName) throw Err.validation('نام الزامی است');
    if (firstName.length > 50) throw Err.validation('نام بیش از حد طولانی است');

    const data: { firstName: string; lastName?: string; birthDate?: Date } = { firstName };
    if (b.last_name != null) data.lastName = b.last_name.toString().trim().slice(0, 50);
    if (b.birth_date) {
      const d = new Date(b.birth_date);
      if (!isNaN(+d)) data.birthDate = d;
    }

    const user = await db.user.update({
      where: { id: auth.sub },
      data,
      select: { id: true, phone: true, firstName: true, lastName: true, birthDate: true, avatarUrl: true },
    });
    return NextResponse.json({ user });
  } catch (e) { return errorResponse(e); }
}
