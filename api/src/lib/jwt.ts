import jwt from 'jsonwebtoken';
import { Err } from './errors';

// ═══════════════════════════════════════════════════════════
//  JWT — سخت‌شده طبق OWASP
//   • الگوریتم صریح HS256 (جلوگیری از حمله‌ی algorithm confusion / alg:none)
//   • issuer/audience برای جلوگیری از استفاده‌ی توکن در سرویس اشتباه
//   • secretهای جدا برای access و refresh
// ═══════════════════════════════════════════════════════════

const ISS = 'rezervno';
const AUD = 'rezervno-api';
const ALG: jwt.Algorithm = 'HS256';

export type AccessPayload =
  | { sub: string; kind: 'customer' }
  | { sub: string; kind: 'staff'; tenantId: string; role: 'owner'|'manager'|'staff' };

// تأیید وجود secretها در زمان بارگذاری (fail-fast اگر env ناقص باشد)
function accessSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET باید حداقل ۳۲ کاراکتر باشد');
  return s;
}
function refreshSecret(): string {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_REFRESH_SECRET باید حداقل ۳۲ کاراکتر باشد');
  return s;
}

export function signAccess(p: AccessPayload) {
  return jwt.sign(p, accessSecret(), { expiresIn: '15m', algorithm: ALG, issuer: ISS, audience: AUD });
}
export function signRefresh(sub: string) {
  // jti: شناسه‌ی یکتای توکن — برای امکان revocation (لیست سیاه)
  const jti = `${sub}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  return jwt.sign({ sub, jti }, refreshSecret(), { expiresIn: '30d', algorithm: ALG, issuer: ISS, audience: AUD });
}
export function verifyAccess(token: string): AccessPayload {
  try {
    // الزام الگوریتم و iss/aud — توکن دستکاری‌شده رد می‌شود
    return jwt.verify(token, accessSecret(), { algorithms: [ALG], issuer: ISS, audience: AUD }) as AccessPayload;
  } catch { throw Err.unauthorized(); }
}
export function verifyRefresh(token: string): { sub: string; jti?: string } {
  try {
    return jwt.verify(token, refreshSecret(), { algorithms: [ALG], issuer: ISS, audience: AUD }) as { sub: string; jti?: string };
  } catch { throw Err.unauthorized(); }
}
/** از هدر Authorization: Bearer ... */
export function authFromRequest(req: Request): AccessPayload {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) throw Err.unauthorized();
  return verifyAccess(h.slice(7));
}
