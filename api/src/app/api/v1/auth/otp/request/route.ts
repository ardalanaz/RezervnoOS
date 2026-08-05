import { NextResponse } from 'next/server';
import { requestOtp } from '@/lib/otp';
import { enforceRateLimit, clientIp, RULES } from '@/lib/ratelimit';
import { errorResponse } from '@/lib/errors';
import { parseBody, zPhone, z } from '@/lib/schemas';

const schema = z.object({ phone: zPhone });

export async function POST(req: Request) {
  try {
    // ⚠️ محدودیتِ per-IP لازم است، نه فقط per-phone. requestOtp خودش هر شماره را به
    // ۳ درخواست در ۱۰ دقیقه محدود می‌کند، ولی مهاجم با چرخاندنِ شماره‌ها می‌توانست
    // نامحدود پیامک بفرستد — هم SMS-bombing روی شماره‌های واقعی، هم تخلیه‌ی اعتبارِ
    // پیامکِ رستوران‌ها. این سقفِ IP همان حفره را می‌بندد.
    await enforceRateLimit(clientIp(req), RULES.otpPerIp);
    const { phone } = await parseBody(req, schema);
    const r = await requestOtp(phone);
    return NextResponse.json(r, { status: r.devCode ? 200 : 204 });
  } catch (e) { return errorResponse(e); }
}
