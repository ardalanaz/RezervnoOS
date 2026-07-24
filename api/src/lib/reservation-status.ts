// ═══════════════════════════════════════════════════════════
//  منبع واحد حقیقت برای مجموعه‌های وضعیت رزرو
//
//  چرا این فایل وجود دارد (باگ بحرانی C1):
//  قبلاً لیست «وضعیت‌های فعالِ اشغال‌کننده‌ی میز» به‌صورت
//  ('pending','confirmed','arrived','seated') در چند جا کپی شده بود
//  (EXCLUDE constraint، ایندکس GiST، کوئری تداخل موتور رزرو، availability،
//   merge، گارد حذف میز). اما enum وضعیت‌ها شامل وضعیت‌های فعالِ دیگری هم
//  هست (auto_confirmed, preparing, checked_in, running_late, dining) که در
//  آن لیست نبودند → یک میز می‌توانست در آن وضعیت‌ها دوباره رزرو شود (double-booking).
//
//  حالا تنها یک لیست تعریف می‌شود و همه‌جا از همین استفاده می‌کنند.
//  هر تغییر در چرخه‌ی حیات فقط اینجا اعمال می‌شود.
// ═══════════════════════════════════════════════════════════

/**
 * وضعیت‌هایی که یعنی رزرو «زنده» است و میز را در بازه‌ی زمانی‌اش اشغال می‌کند.
 * این مجموعه باید با WHERE کانسترینت EXCLUDE در دیتابیس کاملاً یکی باشد
 * (به migration 016 و EXTRA-after-prisma-migrate.sql مراجعه شود).
 *
 * شامل وضعیت‌های قدیمی (arrived) برای سازگاری با داده‌ی موجود.
 */
export const ACTIVE_RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'auto_confirmed',
  'preparing',
  'checked_in',
  'running_late',
  'arrived',        // قدیمی = معادل checked_in
  'seated',
  'dining',
] as const;

export type ActiveReservationStatus = (typeof ACTIVE_RESERVATION_STATUSES)[number];

/** همان مجموعه به‌صورت رشته‌ی SQL برای استفاده در $queryRaw: 'a','b','c' */
export const ACTIVE_STATUSES_SQL = ACTIVE_RESERVATION_STATUSES.map((s) => `'${s}'`).join(',');

/** آرایه‌ی قابل‌استفاده در Prisma `status: { in: [...] }` (کپی تازه تا mutate نشود). */
export function activeStatusList(): string[] {
  return [...ACTIVE_RESERVATION_STATUSES];
}
