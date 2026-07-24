import { db } from './db';
import { createLogger } from './logger';

const log = createLogger('rfm');

// ═══════════════════════════════════════════════════════════════════════
//  RFM Scoring — Recency, Frequency, Monetary
//
//  چرا کوهورتی: RFM ذاتاً نسبی است — امتیاز یک مشتری به توزیع کل مشتریان
//  آن رستوران بستگی دارد. پس باید کل کوهورت با هم با ntile(5) امتیازدهی
//  شوند (نه per-customer). تست‌شده روی PostgreSQL واقعی: ntile صدک‌ها را
//  به ۵ سطح درست تقسیم می‌کند.
//
//  امتیازها:
//   • R (Recency): اخیرترین بازدید = ۵ (بهترین)
//   • F (Frequency): بیشترین بازدید = ۵
//   • M (Monetary): بیشترین خرج = ۵
//
//  سگمنت‌ها از ترکیب R/F/M (الگوی استاندارد CRM).
// ═══════════════════════════════════════════════════════════════════════

/**
 * RFM را برای کل مشتریان یک رستوران محاسبه و ذخیره می‌کند.
 * با ntile(5) امتیاز نسبی می‌دهد و سگمنت RFM را تعیین می‌کند.
 * نیازمند داده‌ی موجود در customer_insights (lastVisitAt, totalVisits, totalSpendToman).
 */
export async function recomputeRfmForRestaurant(restaurantId: string): Promise<{ scored: number }> {
  // یک کوئری: امتیازدهی صدکی + تعیین سگمنت + به‌روزرسانی، همه با هم.
  // فقط مشتریانی که حداقل یک بازدید دارند (lastVisitAt غیر null) امتیاز می‌گیرند.
  const result = await db.$executeRaw`
    WITH scored AS (
      SELECT user_id,
        ntile(5) OVER (ORDER BY last_visit_at ASC NULLS FIRST)   AS r,
        ntile(5) OVER (ORDER BY total_visits ASC)                AS f,
        ntile(5) OVER (ORDER BY total_spend_toman ASC)           AS m
      FROM customer_insights
      WHERE restaurant_id = ${restaurantId}::uuid
        AND last_visit_at IS NOT NULL
    )
    UPDATE customer_insights ci
    SET r_score = s.r,
        f_score = s.f,
        m_score = s.m,
        rfm_segment = CASE
          WHEN s.r >= 4 AND s.f >= 4 AND s.m >= 4 THEN 'champions'
          WHEN s.r >= 4 AND s.f >= 2              THEN 'loyal'
          WHEN s.r >= 4 AND s.f <= 2              THEN 'new_promising'
          WHEN s.r = 3                            THEN 'needs_attention'
          WHEN s.r <= 2 AND s.f >= 3              THEN 'at_risk'
          WHEN s.r <= 2 AND s.f <= 2 AND s.m >= 4 THEN 'cant_lose'
          ELSE 'hibernating'
        END
    FROM scored s
    WHERE ci.user_id = s.user_id AND ci.restaurant_id = ${restaurantId}::uuid
  `;
  log.info('RFM محاسبه شد', { restaurantId, scored: result });
  return { scored: result };
}

/** توزیع سگمنت‌های RFM یک رستوران (برای داشبورد). */
export async function getRfmDistribution(restaurantId: string): Promise<{ segment: string; count: number }[]> {
  const rows = await db.$queryRaw<{ rfm_segment: string | null; count: bigint }[]>`
    SELECT rfm_segment, count(*) AS count
    FROM customer_insights
    WHERE restaurant_id = ${restaurantId}::uuid AND rfm_segment IS NOT NULL
    GROUP BY rfm_segment
    ORDER BY count DESC
  `;
  return rows.map((r) => ({ segment: r.rfm_segment ?? 'unknown', count: Number(r.count) }));
}
