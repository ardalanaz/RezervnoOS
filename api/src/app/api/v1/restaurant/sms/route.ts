import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enqueueSms } from '@/lib/sms';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';

/**
 * POST /api/v1/restaurant/sms — پیامک کمپین/winback به اعضای باشگاه.
 * مهاجرت‌شده به wrapper. نیاز به دسترسی مدیریت کمپین (canManageCampaigns).
 */
export const POST = withRestaurantAuth(
  { permission: 'canManageCampaigns', rateLimit: 'auth' },
  async (req, ctx) => {
    const restaurant = ctx.restaurant;
    const b = await req.json();

    const kind: string = b.kind === 'winback' ? 'winback' : 'campaign';
    const template = kind === 'winback' ? 'winback_offer' : 'campaign';

    let targets: { phone: string; name: string }[] = [];
    if (Array.isArray(b.phones) && b.phones.length) {
      targets = b.phones.filter(Boolean).map((p: string) => ({ phone: p, name: '' }));
    } else {
      const tierFilter = ['gold', 'silver', 'bronze'].includes(b.segment) ? { tier: b.segment } : {};
      const members = await db.clubMember.findMany({
        where: { restaurantId: restaurant.id, ...tierFilter },
        include: { user: { select: { phone: true, firstName: true } } },
        take: 500,
      });
      targets = members
        .filter(m => m.user?.phone)
        .map(m => ({ phone: m.user.phone, name: m.user.firstName || '' }));
    }

    if (!targets.length) throw Err.validation('هیچ مخاطبی برای ارسال یافت نشد');

    const discount = (b.discount_code || '').toString().slice(0, 20);
    let queued = 0;
    for (const t of targets) {
      const tokens = kind === 'winback'
        ? [t.name || 'مهمان', discount || 'WELCOME', restaurant.name]
        : [t.name || 'مهمان', restaurant.name];
      await enqueueSms({ to: t.phone, template: template as 'welcome_visit', tokens, restaurantId: restaurant.id });
      queued++;
    }

    // ثبت در تاریخچه‌ی کمپین (تا در پنل قابل‌مشاهده باشد) — شکست لاگ نباید ارسال را خراب کند
    try {
      await db.campaignLog.create({
        data: {
          restaurantId: restaurant.id,
          segment: (b.segment || (Array.isArray(b.phones) ? 'custom' : 'all')).toString().slice(0, 40),
          message: (b.message || b.discount_code || kind).toString().slice(0, 500),
          recipientsCount: queued,
        },
      });
    } catch { /* لاگ‌نشدن تاریخچه نباید جلوی ارسال را بگیرد */ }

    return NextResponse.json({ queued, kind });
  },
);
