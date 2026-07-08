import { NextResponse } from 'next/server';
import { verifyOtp, normalizePhone } from '@/lib/otp';
import { signAccess, signRefresh } from '@/lib/jwt';
import { db } from '@/lib/db';
import { enforceRateLimit, clientIp, RULES } from '@/lib/ratelimit';
import { Err, errorResponse } from '@/lib/errors';

/** POST — تأیید کد و صدور توکن staff (با نقش و tenant) */
export async function POST(req: Request) {
  try {
    await enforceRateLimit(clientIp(req), RULES.otpVerify);
    const { phone, code } = await req.json();
    if (!phone || !code) throw Err.validation('شماره و کد لازم است');
    const normalized = normalizePhone(phone);
    const staff = await db.staff.findFirst({
      where: { phone: normalized },
      include: { tenant: { select: { id: true, restaurants: { select: { id: true, name: true }, take: 1 } } } },
    });
    if (!staff) throw Err.forbidden('این شماره دسترسی پنل رستوران ندارد');
    await verifyOtp(normalized, code);
    const role = (staff.role === 'owner' || staff.role === 'manager' || staff.role === 'staff') ? staff.role : 'staff';
    const access = signAccess({ sub: staff.id, kind: 'staff', tenantId: staff.tenantId, role });
    const refresh = signRefresh(staff.id);
    return NextResponse.json({
      access, refresh,
      staff: { id: staff.id, role, tenant_id: staff.tenantId, restaurant_id: staff.tenant.restaurants[0]?.id || null, restaurant_name: staff.tenant.restaurants[0]?.name || null },
    });
  } catch (e) { return errorResponse(e); }
}
