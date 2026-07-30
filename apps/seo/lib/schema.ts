// ساختِ JSON-LD (schema.org) از دادهٔ واقعیِ رستوران — تابعِ خالص و قابل‌تست.
// فقط فیلدهایی که داده دارند emit می‌شوند (بدونِ null/خالی → schemaِ معتبر).
import type { RestaurantDetail } from './api';

const SITE = 'https://rezervno.ir';

/** price_band (۱..۴) → رشته‌ی priceRange به‌سبکِ schema.org. */
function priceRange(band: number): string {
  const n = Math.min(4, Math.max(1, band || 2));
  return '$'.repeat(n);
}

/**
 * @graph شاملِ Restaurant (+ PostalAddress/GeoCoordinates/AggregateRating/Menu) و
 * BreadcrumbList. pageUrl آدرسِ کاملِ همین صفحه است (canonical).
 */
export function restaurantJsonLd(r: RestaurantDetail, pageUrl: string): object {
  const restaurant: Record<string, unknown> = {
    '@type': 'Restaurant',
    '@id': `${pageUrl}#restaurant`,
    name: r.name,
    url: pageUrl,
  };

  if (r.cuisine) restaurant.servesCuisine = r.cuisine;
  restaurant.priceRange = priceRange(r.price_band);

  // آدرس (schema.org PostalAddress) — فقط اگر دستِ‌کم شهر یا آدرس باشد.
  const loc = r.location;
  if (loc.address || loc.city) {
    const addr: Record<string, unknown> = { '@type': 'PostalAddress', addressCountry: loc.country || 'IR' };
    if (loc.address) addr.streetAddress = loc.address;
    if (loc.city) addr.addressLocality = loc.city;
    if (loc.district) addr.addressRegion = loc.district;
    if (loc.postal_code) addr.postalCode = loc.postal_code;
    restaurant.address = addr;
  }

  // مختصات (GeoCoordinates) — فقط اگر هر دو موجود باشند.
  if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    restaurant.geo = { '@type': 'GeoCoordinates', latitude: loc.latitude, longitude: loc.longitude };
  }

  // امتیازِ تجمیعی — فقط اگر دستِ‌کم یک نظرِ منتشرشده باشد.
  if (r.rating != null && r.reviews_count > 0) {
    restaurant.aggregateRating = {
      '@type': 'AggregateRating', ratingValue: r.rating, reviewCount: r.reviews_count,
      bestRating: 5, worstRating: 1,
    };
  }

  // تصاویر
  if (r.photos.length) restaurant.image = r.photos.map((p) => p.url);

  // منو (schema.org Menu) — فقط اگر آیتم داشته باشد.
  if (r.menu.length) {
    restaurant.hasMenu = {
      '@type': 'Menu',
      hasMenuSection: {
        '@type': 'MenuSection',
        hasMenuItem: r.menu.map((m) => ({
          '@type': 'MenuItem',
          name: m.name,
          offers: { '@type': 'Offer', price: m.price_toman, priceCurrency: 'IRR' },
        })),
      },
    };
  }

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'رزرونو', item: `${SITE}/` },
      ...(loc.city
        ? [{ '@type': 'ListItem', position: 2, name: loc.city, item: `${SITE}/city/${encodeURIComponent(loc.city)}` }]
        : []),
      { '@type': 'ListItem', position: loc.city ? 3 : 2, name: r.name, item: pageUrl },
    ],
  };

  return { '@context': 'https://schema.org', '@graph': [restaurant, breadcrumb] };
}
