import { db } from './db';
import { Err } from './errors';
import type { AccessPayload } from './jwt';

/**
 * رستورانِ فعالِ این staff را پیدا می‌کند — با پشتیبانیِ چندشعبه‌ای.
 *
 * ⚠️ رفع باگ (migration 018_staff_branch_scoping بود ولی این تابع هرگز
 * به‌روز نشده بود): قبلاً همیشه findFirst روی کل تنانت می‌زد و restaurant_id
 * روی Staff را کاملاً نادیده می‌گرفت — یعنی چندشعبه‌ای عملاً کار نمی‌کرد
 * (همیشه اولین رستورانِ تنانت برمی‌گشت، صرف‌نظر از اینکه staff به کدام شعبه
 * قفل شده یا چه شعبه‌ای از پنل انتخاب کرده).
 *
 * منطق:
 *  • اگر staff.restaurantId ست شده باشد (قفل به یک شعبه‌ی خاص) → همان شعبه،
 *    صرف‌نظر از هدر X-Restaurant-Id (کارمندِ محدود نمی‌تواند شعبه عوض کند).
 *  • اگر NULL باشد (owner/manager — دسترسی همه‌ی شعبه‌ها) و هدر
 *    X-Restaurant-Id داده شده باشد → همان شعبه، فقط اگر واقعاً متعلق به
 *    همین تنانت باشد (جلوگیری از دسترسی متقاطع تنانت‌ها — IDOR).
 *  • در غیر این صورت → اولین رستورانِ تنانت (سازگاری با تنانت‌های تک‌شعبه‌ای).
 */
export async function resolveStaffRestaurant(auth: AccessPayload, req?: Request) {
  if (auth.kind !== 'staff') throw Err.forbidden();

  const staff = await db.staff.findUnique({
    where: { id: auth.sub },
    select: { restaurantId: true },
  });
  if (!staff) throw Err.forbidden();

  const selectFields = { id: true, name: true, slug: true, clubPrefix: true, cbBasePct: true, cbPreorderPct: true, cbVipPct: true, cbWinbackPct: true };

  // قفل به یک شعبه‌ی خاص — هدر کلاینت را نادیده بگیر (امنیت: نباید بتواند override شود)
  if (staff.restaurantId) {
    const restaurant = await db.restaurant.findFirst({
      where: { id: staff.restaurantId, tenantId: auth.tenantId },
      select: selectFields,
    });
    if (!restaurant) throw Err.notFound('رستورانی برای این حساب یافت نشد');
    return restaurant;
  }

  // owner/manager: امکان انتخاب شعبه از طریق هدر (بدون نیاز به لاگین دوباره)
  const requestedId = req?.headers.get('x-restaurant-id');
  if (requestedId) {
    const restaurant = await db.restaurant.findFirst({
      where: { id: requestedId, tenantId: auth.tenantId }, // چک تنانت: جلوگیری از IDOR
      select: selectFields,
    });
    if (restaurant) return restaurant;
    // هدر نامعتبر/متعلق به تنانتِ دیگر → به fallback زیر می‌افتیم به‌جای خطا،
    // چون این می‌تواند یک شعبه‌ی حذف‌شده یا انتخابِ قدیمیِ کلاینت باشد.
  }

  const restaurant = await db.restaurant.findFirst({
    where: { tenantId: auth.tenantId },
    select: selectFields,
  });
  if (!restaurant) throw Err.notFound('رستورانی برای این حساب یافت نشد');
  return restaurant;
}

/** بازه‌ی زمانی N روز گذشته تا الان */
export function sinceDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
