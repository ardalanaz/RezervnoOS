import { NextResponse } from 'next/server';
import { verifyRefresh } from '@/lib/jwt';
import { revokeRefreshToken, safeJson } from '@/lib/security';
import { errorResponse } from '@/lib/errors';

/** POST /api/v1/auth/logout — باطل‌کردن refresh token (لیست سیاه) */
export async function POST(req: Request) {
  try {
    const { refresh } = await safeJson(req);
    if (refresh) {
      try { const { jti } = verifyRefresh(refresh); if (jti) await revokeRefreshToken(jti); } catch {}
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
