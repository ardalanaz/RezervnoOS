import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRestaurantAuth } from '@/lib/with-restaurant-auth';
import { Err } from '@/lib/errors';

const TRIGGERS = ['birthday', 'winback', 'post_visit', 'vip_milestone', 'no_show_followup'];

export const GET = withRestaurantAuth({ permission: 'canManageCampaigns' }, async (_req, ctx) => {
  const items = await db.marketingAutomation.findMany({ where: { restaurantId: ctx.restaurant.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({
    items: items.map(a => ({
      id: a.id, name: a.name, trigger: a.trigger, trigger_config: a.triggerConfig,
      message_template: a.messageTemplate, coupon_id: a.couponId, is_active: a.isActive,
      last_run_at: a.lastRunAt, sent_count: a.sentCount, converted_count: a.convertedCount,
      conversion_rate_pct: a.sentCount ? Math.round((a.convertedCount / a.sentCount) * 100) : 0,
    })),
  });
});

// POST — ساخت قانون خودکار جدید · بدنه: { name, trigger, trigger_config?, message_template, coupon_id? }
export const POST = withRestaurantAuth({ rateLimit: 'auth', permission: 'canManageCampaigns' }, async (req, ctx) => {
  const b = await req.json();
  if (!TRIGGERS.includes(b.trigger)) throw Err.validation('نوع trigger نامعتبر است');
  if (!b.name || !b.message_template) throw Err.validation('نام و متن پیام الزامی است');

  const automation = await db.marketingAutomation.create({
    data: {
      restaurantId: ctx.restaurant.id, name: b.name, trigger: b.trigger,
      triggerConfig: b.trigger_config || {}, messageTemplate: b.message_template,
      couponId: b.coupon_id || null,
    },
  });
  return NextResponse.json({ id: automation.id }, { status: 201 });
});
