// ═══════════════════════════════════════════════════════════
//  منطق مشترک چت (مشتری ↔ رستوران). هر دو سمت (customer route و
//  business route) از این استفاده می‌کنند تا منطق تکرار نشود.
// ═══════════════════════════════════════════════════════════
import { db } from './db';
import { Err } from './errors';

const MAX_BODY = 2000;

/** پیدا/ساختِ thread بین یک کاربر و یک رستوران (اختیاری per-reservation). */
export async function getOrCreateThread(opts: {
  restaurantId: string;
  userId: string;
  reservationId?: string | null;
}) {
  const reservationId = opts.reservationId ?? null;

  // اگر به رزرو لینک است، مطمئن شو رزرو متعلق به همین کاربر و همین رستوران است.
  if (reservationId) {
    const resv = await db.reservation.findUnique({
      where: { id: reservationId },
      select: { userId: true, restaurantId: true },
    });
    if (!resv || resv.restaurantId !== opts.restaurantId || resv.userId !== opts.userId) {
      throw Err.forbidden('این رزرو متعلق به شما/این رستوران نیست');
    }
  }

  const existing = await db.chatThread.findFirst({
    where: { restaurantId: opts.restaurantId, userId: opts.userId, reservationId },
  });
  if (existing) return existing;

  try {
    return await db.chatThread.create({
      data: { restaurantId: opts.restaurantId, userId: opts.userId, reservationId },
    });
  } catch {
    // race: یک درخواستِ موازی همزمان ساخت — دوباره بخوان
    const again = await db.chatThread.findFirst({
      where: { restaurantId: opts.restaurantId, userId: opts.userId, reservationId },
    });
    if (again) return again;
    throw Err.validation('ساخت گفتگو ناموفق بود، دوباره تلاش کن');
  }
}

/** ارسال پیام + به‌روزرسانی شمارنده‌ها و lastMessageAt به‌صورت اتمیک. */
export async function postMessage(opts: {
  threadId: string;
  sender: 'user' | 'staff';
  staffId?: string;
  body: string;
}) {
  const body = opts.body.trim();
  if (!body) throw Err.validation('متن پیام خالی است');
  if (body.length > MAX_BODY) throw Err.validation(`پیام حداکثر ${MAX_BODY} کاراکتر`);

  // شمارنده‌ی خوانده‌نشده برای طرفِ مقابل زیاد می‌شود.
  const unreadField = opts.sender === 'user' ? 'unreadForStaff' : 'unreadForUser';

  const [msg] = await db.$transaction([
    db.chatMessage.create({
      data: { threadId: opts.threadId, sender: opts.sender, staffId: opts.staffId ?? null, body },
    }),
    db.chatThread.update({
      where: { id: opts.threadId },
      data: { lastMessageAt: new Date(), [unreadField]: { increment: 1 } },
    }),
  ]);
  return msg;
}

/** علامت‌زدن پیام‌های طرفِ مقابل به‌عنوان خوانده‌شده + صفرکردن شمارنده‌ی خودِ خواننده. */
export async function markRead(threadId: string, reader: 'user' | 'staff') {
  // خواننده = user → پیام‌های staff را خوانده می‌کند و unreadForUser صفر می‌شود.
  const otherSender = reader === 'user' ? 'staff' : 'user';
  const myUnread = reader === 'user' ? 'unreadForUser' : 'unreadForStaff';
  await db.$transaction([
    db.chatMessage.updateMany({
      where: { threadId, sender: otherSender, readAt: null },
      data: { readAt: new Date() },
    }),
    db.chatThread.update({ where: { id: threadId }, data: { [myUnread]: 0 } }),
  ]);
}

/** فرمتِ یکدستِ یک پیام برای پاسخِ API. */
export function serializeMessage(m: {
  id: string; sender: string; body: string; createdAt: Date; readAt: Date | null;
}) {
  return {
    id: m.id,
    sender: m.sender,          // 'user' | 'staff'
    body: m.body,
    created_at: m.createdAt,
    read: m.readAt !== null,
  };
}
