import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recomputeAllForRestaurant } from '@/lib/customer-insights';
import { recomputeRfmForRestaurant } from '@/lib/rfm';
import { rebuildGuestProfiles } from '@/lib/guest-profile';
import { runAllDueAutomations } from '@/lib/automation';
import { invalidatePattern } from '@/lib/cache';
import { guardMaintenance } from '@/lib/maintenance-auth';
import { errorResponse } from '@/lib/errors';

/**
 * POST /api/v1/maintenance/customer-insights — cron شبانه (هر روز یک‌بار کافی است).
 * ۱) CLV/سگمنت/ریسک هر مشتری را برای همه‌ی رستوران‌ها بازمحاسبه می‌کند
 * ۲) RFM (Recency/Frequency/Monetary) را برای کل کوهورت هر رستوران محاسبه می‌کند
 * ۳) automation های due (birthday/winback/...) را اجرا می‌کند
 * در crontab با فاصله‌ی روزانه (نه هر ۲-۵ دقیقه مثل بقیه‌ی maintenance) ثبت شود.
 */
export async function POST(req: Request) {
  try {
    const denied = guardMaintenance(req);
    if (denied) return denied;

    const restaurants = await db.restaurant.findMany({ select: { id: true } });
    let totalUsers = 0;
    for (const r of restaurants) {
      totalUsers += await recomputeAllForRestaurant(r.id);
      // RFM بعد از insights — چون به lastVisit/totalVisits/totalSpend به‌روز نیاز دارد
      await recomputeRfmForRestaurant(r.id).catch(() => {});
      await invalidatePattern(`customers:${r.id}:*`);
      await invalidatePattern(`ai-recs:${r.id}`);
    }
    const automationResult = await runAllDueAutomations();

    // پروفایل سراسری مهمانان را از insightهای به‌روز بازسازی کن (cross-restaurant)
    const guestProfiles = await rebuildGuestProfiles().catch(() => ({ profiles: 0 }));

    return NextResponse.json({ ok: true, restaurants: restaurants.length, users_recomputed: totalUsers, guest_profiles: guestProfiles.profiles, ...automationResult });
  } catch (e) { return errorResponse(e); }
}
