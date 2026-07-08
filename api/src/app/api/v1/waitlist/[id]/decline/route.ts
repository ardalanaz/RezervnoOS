import { NextResponse } from 'next/server';
import { declineOffer } from '@/lib/waitlist';
import { verifyAccess } from '@/lib/jwt';
import { enforceRateLimit, clientIp, RULES } from '@/lib/ratelimit';
import { errorResponse } from '@/lib/errors';

function callerId(req: Request): string | undefined {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return undefined;
  try { const p = verifyAccess(h.slice(7)); return p.kind === 'customer' ? p.sub : undefined; }
  catch { return undefined; }
}

/** POST /api/v1/waitlist/:id/decline — رد آفر → آفر به نفر بعدی */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await enforceRateLimit(clientIp(req), RULES.auth);
    const result = await declineOffer(params.id, 'customer', callerId(req));
    return NextResponse.json(result);
  } catch (e) { return errorResponse(e); }
}
