import { db } from './db';
import { enqueue } from './queue';
import { assertPublicHttpUrl } from './security';
import { createLogger } from './logger';

const log = createLogger('events');

// ═══════════════════════════════════════════════════════════════════════
//  Event Bus سبک + Webhook خروجی
//
//  چرا: تا الان همه‌چیز نقطه‌به‌نقطه صدا زده می‌شد. این لایه یک نقطه‌ی
//  واحد برای انتشار رویدادهای دامنه می‌دهد، و مصرف‌کننده‌ها (وب‌هوک‌های
//  شخص ثالث: POS، حسابداری، Zapier) بدون تغییر کد منبع subscribe می‌کنند.
//
//  معماری: emit() رویداد را در DB ثبت و برای هر webhook فعالِ آن رویداد،
//  یک job در صف می‌گذارد. تحویل از طریق صف Job انجام می‌شود → retry/DLQ/
//  backoff رایگان. (به‌جای ساختن سیستم تحویل جدا.)
// ═══════════════════════════════════════════════════════════════════════

export type DomainEvent =
  | 'reservation.created' | 'reservation.cancelled' | 'reservation.completed' | 'reservation.no_show'
  | 'waitlist.joined' | 'waitlist.seated'
  | 'customer.vip_reached' | 'coupon.redeemed';

type EmitOptions = {
  event: DomainEvent;
  restaurantId: string;
  payload: Record<string, unknown>;
};

/**
 * انتشار یک رویداد دامنه. webhookهای مشترکِ آن رویداد در صف قرار می‌گیرند
 * (تحویل async با retry). اگر هیچ webhookی نباشد، فقط لاگ می‌شود.
 */
export async function emit(opts: EmitOptions): Promise<void> {
  log.debug(`event: ${opts.event}`, { restaurantId: opts.restaurantId });
  try {
    // webhookهای فعالِ این رستوران که این رویداد را می‌خواهند
    const hooks = await db.webhook.findMany({
      where: {
        restaurantId: opts.restaurantId,
        isActive: true,
        events: { has: opts.event },
      },
      select: { id: true, url: true, secret: true },
    });

    for (const hook of hooks) {
      // هر تحویل یک job جدا — با idempotencyKey تا تکراری نشود
      await enqueue({
        kind: 'webhook' as any,
        payload: {
          webhookId: hook.id,
          url: hook.url,
          secret: hook.secret,
          event: opts.event,
          data: opts.payload,
          restaurantId: opts.restaurantId,
        },
        priority: 4,
      });
    }
  } catch (e) {
    // انتشار رویداد نباید مسیر اصلی را بشکند
    log.warn('انتشار رویداد ناموفق', { event: opts.event, error: (e as Error).message });
  }
}

/**
 * تحویل واقعی یک webhook (توسط worker صدا زده می‌شود).
 * امضای HMAC در هدر تا گیرنده صحت را تأیید کند.
 */
export async function deliverWebhook(payload: {
  webhookId: string; url: string; secret: string | null;
  event: string; data: Record<string, unknown>; restaurantId: string;
}): Promise<void> {
  const body = JSON.stringify({
    event: payload.event,
    restaurant_id: payload.restaurantId,
    data: payload.data,
    timestamp: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Rezervno-Event': payload.event,
  };
  // امضای HMAC-SHA256 برای تأیید صحت (مثل Stripe/GitHub)
  if (payload.secret) {
    const { createHmac } = await import('crypto');
    const sig = createHmac('sha256', payload.secret).update(body).digest('hex');
    headers['X-Rezervno-Signature'] = `sha256=${sig}`;
  }

  // گارد SSRF: قبل از fetch مطمئن شو URL به شبکه‌ی داخلی/metadata اشاره نمی‌کند.
  await assertPublicHttpUrl(payload.url);
  const res = await fetch(payload.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`webhook ${payload.url} پاسخ ${res.status} داد`); // worker retry می‌کند
  }
  log.info('webhook تحویل شد', { event: payload.event, url: payload.url });
}
