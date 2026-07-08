import { NextResponse } from 'next/server';
import { dbRead as db } from '@/lib/db';
import { cached, cacheKey } from '@/lib/cache';
import { errorResponse } from '@/lib/errors';

// ═══════════════════════════════════════════════════════════
//  GET /api/v1/restaurants — لیست رستوران‌ها
//  بهینه‌شده برای ۱۰۰هزار رستوران و ۵۰۰ req/s:
//   • Pagination با cursor (نه offset — در جدول بزرگ offset کند است)
//   • Cache با Redis (لیست رستوران‌ها کم تغییر می‌کند → TTL کوتاه)
//   • select محدود (فقط فیلدهای لازم برای کارت)
// ═══════════════════════════════════════════════════════════

const PAGE_SIZE = 24; // اندازه‌ی صفحه (مناسب grid موبایل)

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const vibe = url.searchParams.get('vibe');
    const cursor = url.searchParams.get('cursor'); // id آخرین آیتم صفحه‌ی قبل

    // کلید cache بر اساس فیلتر و صفحه
    const key = cacheKey('restaurants', vibe || 'all', cursor || 'first');

    // cache 60 ثانیه — لیست رستوران‌ها لحظه‌ای تغییر نمی‌کند
    const result = await cached(key, 60, async () => {
      const items = await db.restaurant.findMany({
        where: { isOpen: true, ...(vibe ? { vibes: { has: vibe } } : {}) },
        select: { id: true, slug: true, name: true, cuisine: true, vibes: true, priceBand: true, cbBasePct: true },
        orderBy: { id: 'desc' },           // ترتیب پایدار برای cursor
        take: PAGE_SIZE + 1,                // یکی بیشتر بگیر تا بفهمی صفحه‌ی بعد هست
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > PAGE_SIZE;
      const page = hasMore ? items.slice(0, PAGE_SIZE) : items;
      const nextCursor = hasMore ? page[page.length - 1].id : null;

      return { items: page, next_cursor: nextCursor, has_more: hasMore };
    });

    return NextResponse.json(result);
  } catch (e) { return errorResponse(e); }
}
