import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';
import { signAccess, signRefresh } from '@/lib/jwt';
import { db } from '@/lib/db';
import { errorResponse } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();
    const userId = await verifyOtp(phone, code);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, firstName: true, lastName: true, avatarUrl: true },
    });
    return NextResponse.json({
      access: signAccess({ sub: userId, kind: 'customer' }),
      refresh: signRefresh(userId),
      user,
      // کاربر جدید = هنوز نام ثبت نکرده (برای نمایش فرم ثبت‌نام در فرانت)
      is_new: !user?.firstName,
    });
  } catch (e) { return errorResponse(e); }
}
