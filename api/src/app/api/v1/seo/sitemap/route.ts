import { NextResponse } from 'next/server';
import { dbRead as db } from '@/lib/db';
import { cached, cacheKey } from '@/lib/cache';
import { errorResponse } from '@/lib/errors';

// ═══════════════════════════════════════════════════════════
//  GET /api/v1/seo/sitemap — دادهٔ خامِ sitemap برای اپِ apps/seo.
//  slugِ همه‌ی رستوران‌های فعال + شهرها و آشپزی‌های متمایز. عمومی، cache-شده.
//  اپِ SEO از این برای ساختِ sitemap.xml پویا استفاده می‌کند (/r، /city، /cuisine).
//
//  مقیاس: فعلاً یک پاسخِ واحد (کافی برای این مرحله). برای ۵۰k+ رستوران، گامِ بعدی
//  صفحه‌بندی + sitemap-index است (در sitemap.ts اپِ SEO با generateSitemaps).
// ═══════════════════════════════════════════════════════════

const MAX_RESTAURANTS = 50_000; // سقفِ ایمنی؛ فراتر از آن نیازِ sitemap-index است.

export async function GET() {
  try {
    const data = await cached(cacheKey('seo-sitemap'), 300, async () => {
      const [restaurants, cityRows, cuisineRows] = await Promise.all([
        db.restaurant.findMany({
          where: { isOpen: true },
          select: { slug: true, createdAt: true },
          orderBy: { id: 'desc' },
          take: MAX_RESTAURANTS,
        }),
        db.restaurant.findMany({
          where: { isOpen: true, city: { not: null } },
          select: { city: true }, distinct: ['city'],
        }),
        db.restaurant.findMany({
          where: { isOpen: true, cuisine: { not: null } },
          select: { cuisine: true }, distinct: ['cuisine'],
        }),
      ]);

      return {
        restaurants: restaurants.map((r) => ({ slug: r.slug, updated_at: r.createdAt })),
        cities: cityRows.map((c) => c.city).filter(Boolean),
        cuisines: cuisineRows.map((c) => c.cuisine).filter(Boolean),
      };
    });

    return NextResponse.json(data);
  } catch (e) { return errorResponse(e); }
}
