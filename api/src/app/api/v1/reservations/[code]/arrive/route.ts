import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/jwt';
import { db } from '@/lib/db';
import { enqueueSms } from '@/lib/sms';
import { Err, errorResponse } from '@/lib/errors';

/** POST — staff می‌زند «رسید» → SMS خوش‌آمد با امتیاز/کش‌بک (فیچر ۶) */
export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const auth = authFromRequest(req);
    if (auth.kind !== 'staff') throw Err.forbidden();

    const resv = await db.reservation.findUnique({
      where: { code: params.code },
      include: { restaurant: { select: { tenantId: true, name: true } } },
    });
    if (!resv) throw Err.notFound('رزرو');
    if (resv.restaurant.tenantId !== auth.tenantId) throw Err.forbidden();
    if (resv.status !== 'confirmed' && resv.status !== 'pending')
      throw Err.validation(`رزرو در وضعیت ${resv.status} قابل تأیید حضور نیست`);

    const updated = await db.$transaction(async (tx) => {
      const u = await tx.reservation.update({ where: { id: resv.id }, data: { status: 'arrived' } });
      if (resv.userId) {
        await tx.clubMember.updateMany({
          where: { restaurantId: resv.restaurantId, userId: resv.userId },
          data: { points: { increment: 50 } },
        });
      }
      return u;
    });

    if (resv.guestPhone) {
      const member = resv.userId ? await db.clubMember.findUnique({
        where: { restaurantId_userId: { restaurantId: resv.restaurantId, userId: resv.userId } },
      }) : null;
      await enqueueSms({
        to: resv.guestPhone, template: 'welcome_visit',
        tokens: [resv.guestName ?? 'مهمان', String(member?.points ?? 0), '50', member?.tier ?? 'bronze'],
      });
    }
    return NextResponse.json({ code: updated.code, status: updated.status });
  } catch (e) { return errorResponse(e); }
}
