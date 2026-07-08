import { verifyAccess } from './jwt';
import { Err } from './errors';

/**
 * احراز هویت مدیر پلتفرم (پنل شرکت).
 * در فاز ۱، یک staff با role='owner' که به tenant پلتفرم تعلق دارد.
 * tenant(های) پلتفرم از env تعیین می‌شوند (PLATFORM_ADMIN_TENANT_ID).
 *
 * fail-closed: بدون allowlist صریح هیچ‌کس مدیر پلتفرم نیست. اگر متغیر
 * خالی/ست‌نشده باشد، دسترسی رد می‌شود — نه باز. چند تنانت با کاما جدا می‌شوند.
 */
export function adminAuthFromRequest(req: Request): { sub: string; tenantId: string } {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) throw Err.unauthorized();
  const payload = verifyAccess(h.slice(7));
  if (payload.kind !== 'staff' || payload.role !== 'owner') {
    throw Err.forbidden('دسترسی مدیر پلتفرم لازم است');
  }
  const allowlist = (process.env.PLATFORM_ADMIN_TENANT_ID ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (allowlist.length === 0) {
    // misconfiguration: هیچ تنانت پلتفرمی تعریف نشده — fail-closed.
    throw Err.forbidden('پنل شرکت پیکربندی نشده است');
  }
  if (!allowlist.includes(payload.tenantId)) {
    throw Err.forbidden('این حساب دسترسی پنل شرکت ندارد');
  }
  return { sub: payload.sub, tenantId: payload.tenantId };
}
