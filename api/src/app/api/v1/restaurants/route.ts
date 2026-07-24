import { NextResponse } from 'next/server';
import { dbRead as db } from '@/lib/db';
import { cached, cacheKey } from '@/lib/cache';
import { errorResponse } from '@/lib/errors';
import { parseQuery, zUuid, z } from '@/lib/schemas';

// ═══════════════════════════════════════════════════════════
//  GET /api/v1/restaurants — لیست رستوران‌ها
//  بهینه‌شده برای ۱۰۰هزار رستوران و ۵۰۰ req/s:
//   • Pagination با cursor (نه offset — در جدول بزرگ offset کند است)
//   • Cache با Redis (لیست رستوران‌ها کم تغییر می‌کند → TTL کوتاه)
//   • select محدود (فقط فیلدهای لازم برای کارت)
// ═══════════════════════════════════════════════════════════

const PAGE_SIZE = 24; // اندازه‌ی صفحه (مناسب grid موبایل)

const querySchema = z.object({
  vibe: z.string().min(1).max(50).optional(),
  cursor: zUuid.optional(),
});

export async function GET(req: Request) {
  try {
    const { vibe, cursor } = parseQuery(req, querySchema);

    // کلید cache بر اساس فیلتر و صفحه
    const key = cacheKey('restaurants', vibe || 'all', cursor || 'first');

    // cache 60 ثانیه — لیست رستوران‌ها لحظه‌ای تغییر نمی‌کند
    // (تغییر وضعیت آنلاین/آفلاین حداکثر ظرف ۶۰ ثانیه در اپ مشتری دیده می‌شود)
    const result = await cached(key, 60, async () => {
      // آستانه‌ی آنلاین‌بودن: heartbeat باید در ۹۰ ثانیه‌ی اخیر باشد.
      const onlineThreshold = new Date(Date.now() - 90_000);
      const items = await db.restaurant.findMany({
        where: {
          isOpen: true,
          ...(vibe ? { vibes: { has: vibe } } : {}),
          // اتصال: یا gating خاموش است، یا اخیراً heartbeat داشته (آنلاین است).
          // رستورانی که اینترنتش قطع شده از لیست مشتری پنهان می‌شود تا رزرو آنلاینِ
          // متضاد با ثبت حضوریِ آفلاین پیش نیاید.
          OR: [
            { onlineGating: false },
            { lastSeenAt: { gte: onlineThreshold } },
          ],
        },
        select: { id: true, slug: true, name: true, cuisine: true, vibes: true, priceBand: true, cbBasePct: true },
        orderBy: { id: 'desc' },           // ترتیب پایدار برای cursor
        take: PAGE_SIZE + 1,                // یکی بیشتر بگیر تا بفهمی صفحه‌ی بعد هست
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > PAGE_SIZE;
      const page = hasMore ? items.slice(0, PAGE_SIZE) : items;
      const nextCursor = hasMore ? page[page.length - 1].id : null;

      // امتیاز واقعی از جدول reviews — فقط برای همین صفحه (یک کوئری گروهی، scale-safe)
      const ids = page.map(p => p.id);
      const ratingRows = ids.length
        ? await db.review.groupBy({
            by: ['restaurantId'],
            where: { restaurantId: { in: ids }, isPublished: true },
            _avg: { rating: true }, _count: true,
          })
        : [];
      const ratingMap = new Map(ratingRows.map(r => [r.restaurantId, { avg: r._avg.rating, count: r._count }]));

      const pageWithRatings = page.map(p => {
        const rt = ratingMap.get(p.id);
        return {
          ...p,
          rating: rt?.avg ? Math.round(rt.avg * 10) / 10 : null,
          reviews_count: rt?.count ?? 0,
        };
      });

      return { items: pageWithRatings, next_cursor: nextCursor, has_more: hasMore };
    });

    return NextResponse.json(result);
  } catch (e) { return errorResponse(e); }
}
