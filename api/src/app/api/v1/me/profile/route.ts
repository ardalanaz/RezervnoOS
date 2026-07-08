import { getGuestProfile } from '@/lib/guest-profile';
import { authFromRequest } from '@/lib/jwt';
import { Err, errorResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/me/profile — پروفایل سراسری مهمان (نمای ۳۶۰ درجه).
 * مشتری پروفایل خودش را می‌بیند: CLV کل، رستوران‌های بازدیدشده، VIP، سگمنت‌ها.
 */
export async function GET(req: Request) {
  try {
    const auth = authFromRequest(req);
    if (auth.kind !== 'customer') throw Err.forbidden();
    const profile = await getGuestProfile(auth.sub);
    if (!profile) {
      // هنوز پروفایلی محاسبه نشده (مشتری جدید بدون بازدید تکمیل‌شده)
      return NextResponse.json({ profile: null, message: 'هنوز سابقه‌ی کافی برای پروفایل وجود ندارد' });
    }
    return NextResponse.json({ profile });
  } catch (e) { return errorResponse(e); }
}
