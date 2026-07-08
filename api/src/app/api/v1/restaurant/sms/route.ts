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
      // restaurantId لازم است تا worker از موجودی SMS این رستوران کم کند (consumeSms).
      // بدون آن، پیامک کمپین بدون مصرف موجودی ارسال می‌شد و سیستم متر کردن بی‌اثر بود.
      await enqueueSms({ to: t.phone, template: template as 'welcome_visit', tokens, restaurantId: restaurant.id });
      queued++;
    }

    return NextResponse.json({ queued, kind });
  },
);
