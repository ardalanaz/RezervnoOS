// ═══════════════════════════════════════════════════════════
//  Reservation Lifecycle Ops — عملیاتِ پس‌زمینه‌ی چرخه‌ی حیاتِ رزرو
//
//  جدا از reservation-engine (نوشتنِ رزرو) چون این‌ها cron/maintenance اند،
//  نه بخشی از تراکنشِ رزرو. جداسازی برای خوانایی و کاهشِ merge-conflict در تیم.
//
//   • expireStaleHolds — هولدهای pending منقضی‌شده → expired (آزادسازیِ میز)
//   • markLateNoShows  — مهمانِ دیرکرده → no_show (از طریق state machine)
// ═══════════════════════════════════════════════════════════
import { db } from './db';
import { invalidateAvailability } from './availability-cache';

/** هولدهای pending که مهلتشان گذشته → expired. کش availability باطل می‌شود. */
export async function expireStaleHolds(): Promise<number> {
  // ابتدا رکوردهای متأثر را بگیر تا بتوانیم کش روز/رستوران مربوطه را باطل کنیم.
  const stale = await db.reservation.findMany({
    where: { status: 'pending', holdExpiresAt: { lt: new Date() } },
    select: { id: true, restaurantId: true, slotStart: true },
  });
  if (stale.length === 0) return 0;
  const res = await db.reservation.updateMany({
    where: { status: 'pending', holdExpiresAt: { lt: new Date() } },
    data: { status: 'expired' },
  });
  // باطل‌سازی کش availability برای هر (رستوران، تاریخ) متأثر — تا اسلات آزادشده دیده شود.
  const seen = new Set<string>();
  for (const s of stale) {
    const date = s.slotStart.toISOString().slice(0, 10);
    const key = `${s.restaurantId}:${date}`;
    if (!seen.has(key)) {
      seen.add(key);
      await invalidateAvailability(s.restaurantId, date);
    }
  }
  return res.count;
}

// ═══════════════════════════════════════════════════════════
//  علامت‌زدن مهمانان دیرکرده به‌عنوان no_show (نیاز ۱۰)
//  رزروهایی که زمان شروع + مهلت تأخیر گذشته و هنوز نرسیده‌اند.
//
//  به‌جای updateMany مستقیم (که audit/notification را دور می‌زد)، هر رزرو
//  از طریق state machine چرخه‌ی حیات منتقل می‌شود تا رویداد audit ثبت و در صورت
//  لزوم اعلان ارسال شود. انتقال‌های نامعتبر امن نادیده گرفته می‌شوند.
// ═══════════════════════════════════════════════════════════
export async function markLateNoShows(restaurantId: string): Promise<number> {
  const r = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { lateGraceMinutes: true } });
  const grace = r?.lateGraceMinutes ?? 15;
  const cutoff = new Date(Date.now() - grace * 60_000);
  const candidates = await db.reservation.findMany({
    where: {
      restaurantId,
      status: { in: ['pending', 'confirmed', 'auto_confirmed', 'running_late'] },
      slotStart: { lt: cutoff },
    },
    select: { id: true, slotStart: true },
  });
  if (candidates.length === 0) return 0;
  const { transitionReservation } = await import('./lifecycle');
  let count = 0;
  const seenDates = new Set<string>();
  for (const c of candidates) {
    try {
      await transitionReservation({ reservationId: c.id, to: 'no_show', actor: 'cron', isAutomatic: true });
      count++;
      const date = c.slotStart.toISOString().slice(0, 10);
      if (!seenDates.has(date)) { seenDates.add(date); await invalidateAvailability(restaurantId, date); }
    } catch {
      // انتقال نامعتبر (مثلاً قبلاً seated/completed شده) — امن رد شو.
    }
  }
  return count;
}
