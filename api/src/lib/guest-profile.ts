import { db } from './db';
import { createLogger } from './logger';

const log = createLogger('guest-profile');

// ═══════════════════════════════════════════════════════════════════════
//  GuestProfile سراسری — نمای cross-restaurant مشتری
//
//  شکاف ساختاری که حل می‌کند: CustomerInsight per-restaurant است، پس هیچ
//  نمای واحدی از یک مهمان در کل پلتفرم نبود. این لایه همه‌ی insightهای یک
//  کاربر را در رستوران‌های مختلف تجمیع می‌کند → CLV کل، رستوران ترجیحی،
//  VIP در هر جا. (الگوی SevenRooms: یک مهمان، یک پروفایل.)
//
//  تست‌شده روی PostgreSQL واقعی: sum/bool_or/array_agg درست کار می‌کنند.
// ═══════════════════════════════════════════════════════════════════════

/**
 * پروفایل سراسری همه‌ی مهمانان را از CustomerInsightها بازمی‌سازد (upsert).
 * با یک کوئری تجمیعی + ON CONFLICT. توسط cron روزانه (بعد از insights) صدا زده می‌شود.
 */
export async function rebuildGuestProfiles(): Promise<{ profiles: number }> {
  const result = await db.$executeRaw`
    INSERT INTO guest_profiles (
      user_id, global_visits, global_spend_toman, global_clv_toman,
      restaurants_visited, last_visit_anywhere, is_vip_anywhere,
      preferred_restaurant_id, updated_at
    )
    SELECT
      user_id,
      sum(total_visits),
      sum(total_spend_toman),
      sum(predicted_clv_toman),
      count(DISTINCT restaurant_id),
      max(last_visit_at),
      bool_or(is_vip),
      (array_agg(restaurant_id ORDER BY total_visits DESC))[1],  -- رستوران با بیشترین بازدید
      now()
    FROM customer_insights
    GROUP BY user_id
    ON CONFLICT (user_id) DO UPDATE SET
      global_visits = EXCLUDED.global_visits,
      global_spend_toman = EXCLUDED.global_spend_toman,
      global_clv_toman = EXCLUDED.global_clv_toman,
      restaurants_visited = EXCLUDED.restaurants_visited,
      last_visit_anywhere = EXCLUDED.last_visit_anywhere,
      is_vip_anywhere = EXCLUDED.is_vip_anywhere,
      preferred_restaurant_id = EXCLUDED.preferred_restaurant_id,
      updated_at = now()
  `;
  log.info('پروفایل‌های سراسری بازسازی شد', { profiles: result });
  return { profiles: result };
}

/** پروفایل سراسری یک مهمان (نمای ۳۶۰ درجه). */
export async function getGuestProfile(userId: string) {
  const profile = await db.guestProfile.findUnique({ where: { userId } });
  if (!profile) return null;
  // رستوران‌های بازدیدشده برای نمای کامل
  const breakdown = await db.customerInsight.findMany({
    where: { userId },
    select: {
      restaurantId: true, totalVisits: true, totalSpendToman: true,
      lastVisitAt: true, isVip: true, rfmSegment: true,
    },
    orderBy: { totalVisits: 'desc' },
  });
  return { ...profile, restaurants: breakdown };
}
