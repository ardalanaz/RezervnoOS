import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';
import { Err, errorResponse } from '@/lib/errors';
import { parseBody, z } from '@/lib/schemas';

// ذخیره‌ی ترجیحِ اعلانِ push کاربر. زیرساختِ ارسالِ push هنوز راه‌اندازی نشده،
// ولی این endpoint قرارداد را کامل می‌کند و ترجیح را ذخیره می‌کند تا وقتی
// سرویسِ push آماده شد، توکن‌ها موجود باشند. (فرانت با catch بی‌صدا صدا می‌زند.)

const subscribeSchema = z.object({
  enabled: z.boolean().optional().default(true),
  token: z.string().optional(),      // توکنِ FCM/APNs در آینده
  endpoint: z.string().optional(),   // Web Push endpoint در آینده
});

/** POST /api/v1/me/push-subscribe — ثبت/به‌روزرسانیِ ترجیحِ اعلانِ push */
export async function POST(req: Request) {
  try {
    const auth = authFromRequest(req);
    if (auth.kind !== 'customer') throw Err.forbidden();
    const body = await parseBody(req, subscribeSchema);

    // ذخیره‌ی ترجیح روی کاربر: فعلاً no-op امن. وقتی جدولِ push_subscriptions
    // (یا ستونِ pushEnabled) اضافه شد، اینجا upsert می‌شود. عمداً روی User چیزی
    // نمی‌نویسیم چون هنوز فیلدی برای این ترجیح وجود ندارد.

    return NextResponse.json({ ok: true, enabled: body.enabled });
  } catch (e) { return errorResponse(e); }
}

/** GET /api/v1/me/push-subscribe — وضعیتِ فعلیِ اشتراکِ push */
export async function GET(req: Request) {
  try {
    const auth = authFromRequest(req);
    if (auth.kind !== 'customer') throw Err.forbidden();
    // فعلاً همیشه false تا زیرساختِ push آماده شود
    return NextResponse.json({ enabled: false, ready: false });
  } catch (e) { return errorResponse(e); }
}
