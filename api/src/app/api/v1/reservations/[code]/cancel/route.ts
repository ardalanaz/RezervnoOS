import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { Err, errorResponse } from '@/lib/errors';

/** POST { reason } — برای staff دلیل اجباری است (فیچر ۷) */
export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const auth = authFromRequest(req);
    const { reason } = await req.json().catch(() => ({}));

    const resv = await db.reservation.findUnique({
      where: { code: params.code },
      include: { restaurant: { select: { tenantId: true } } },
    });
    if (!resv) throw Err.notFound('رزرو');

    let status: 'cancelled_by_user' | 'cancelled_by_restaurant';
    if (auth.kind === 'staff') {
      if (resv.restaurant.tenantId !== auth.tenantId) throw Err.forbidden();
      if (!reason?.trim()) throw Err.validation('دلیل لغو برای رستوران الزامی است');
      status = 'cancelled_by_restaurant';
    } else {
      if (resv.userId !== auth.sub) throw Err.forbidden();
      status = 'cancelled_by_user';
    }

    // گارد وضعیت (اتمیک): رزروی که قبلاً پایانی شده (تکمیل، no-show، لغو، منقضی)
    // دیگر قابل لغو نیست — وگرنه مشتری می‌توانست no-show خودش را پاک کند یا رزرو
    // تکمیل‌شده را لغو کند. updateMany با گارد، رقابت همزمان را هم امن می‌کند.
    const TERMINAL = [
      'completed', 'no_show', 'rejected', 'expired',
      'cancelled', 'auto_cancelled', 'cancelled_by_user', 'cancelled_by_restaurant',
    ];
    const upd = await db.reservation.updateMany({
      where: { id: resv.id, status: { notIn: TERMINAL } },
      data: { status, cancelReason: reason?.trim() || null },
    });
    if (upd.count === 0) throw Err.validation('این رزرو در وضعیت فعلی قابل لغو نیست');
    await redis.del(`avail:${resv.restaurantId}:${resv.slotStart.toISOString().slice(0,10)}`);
    return NextResponse.json({ code: resv.code, status });
  } catch (e) { return errorResponse(e); }
}
