import { NextResponse } from 'next/server';
import { verifyRefresh, signAccess, signRefresh } from '@/lib/jwt';
import { isRefreshRevoked, revokeRefreshToken, safeJson } from '@/lib/security';
import { errorResponse } from '@/lib/errors';

/**
 * POST /api/v1/auth/refresh
 * تمدید توکن با rotation: refresh قدیمی باطل و جدید صادر می‌شود.
 * اگر توکن باطل‌شده باشد (logout/سرقت)، رد می‌شود.
 */
export async function POST(req: Request) {
  try {
    const { refresh } = await safeJson(req);
    const { sub, jti } = verifyRefresh(refresh);
    // چک لیست سیاه — توکن باطل‌شده دیگر کار نمی‌کند
    if (await isRefreshRevoked(jti)) {
      return NextResponse.json({ ok: false, error: { code: 'TOKEN_REVOKED', message: 'نشست منقضی شده؛ دوباره وارد شوید' } }, { status: 401 });
    }
    // rotation: توکن قدیمی را باطل کن، جدید بده (در صورت سرقت، پنجره کوتاه می‌شود)
    if (jti) await revokeRefreshToken(jti);
    return NextResponse.json({
      access: signAccess({ sub, kind: 'customer' }),
      refresh: signRefresh(sub),
    });
  } catch (e) { return errorResponse(e); }
}
