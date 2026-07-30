// کلاینتِ سمتِ سرورِ اپِ SEO برای خواندن از api/ رزرونو.
// آدرسِ API از env می‌آید (SEO_API_BASE)، مثلِ https://api.rezervno.ir — بدونِ اسلشِ انتهایی.
// این ماژول در Server Components/Route Handlers استفاده می‌شود (نه در مرورگر).

const API_BASE = (process.env.SEO_API_BASE || '').replace(/\/$/, '');

export interface RestaurantDetail {
  id: string;
  slug: string;
  name: string;
  cuisine: string | null;
  vibes: string[];
  price_band: number;
  location: {
    address: string | null;
    city: string | null;
    district: string | null;
    postal_code: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  opening_hours: unknown;
  timezone: string;
  rating: number | null;
  reviews_count: number;
  menu: { name: string; emoji: string | null; price_toman: number }[];
  photos: { url: string; caption: string | null; category: string }[];
}

/**
 * جزئیاتِ یک رستوران را از API می‌گیرد (GET /api/v1/restaurants/{slug}).
 * برای ISR: نتیجه با revalidate کش می‌شود. نبودِ API یا 404 → null (صفحه 404 می‌دهد).
 */
export async function fetchRestaurant(slug: string, revalidateSec = 300): Promise<RestaurantDetail | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/restaurants/${encodeURIComponent(slug)}`, {
      next: { revalidate: revalidateSec },
    });
    if (!res.ok) return null;
    return (await res.json()) as RestaurantDetail;
  } catch {
    return null;
  }
}

export interface RestaurantListItem {
  id: string;
  slug: string;
  name: string;
  cuisine: string | null;
  city: string | null;
  vibes: string[];
  price_band?: number;
  priceBand?: number;
  rating: number | null;
  reviews_count: number;
}

/**
 * لیستِ رستوران‌ها با فیلترِ اختیاریِ شهر/آشپزی (GET /api/v1/restaurants?city=&cuisine=).
 * برای صفحاتِ /city/{c} و /cuisine/{c}. نبودِ API → آرایه‌ی خالی (صفحه گاردِ کیفیت را اعمال می‌کند).
 */
export async function fetchRestaurantList(
  filter: { city?: string; cuisine?: string },
  revalidateSec = 300,
): Promise<RestaurantListItem[]> {
  if (!API_BASE) return [];
  const qs = new URLSearchParams();
  if (filter.city) qs.set('city', filter.city);
  if (filter.cuisine) qs.set('cuisine', filter.cuisine);
  try {
    const res = await fetch(`${API_BASE}/api/v1/restaurants?${qs.toString()}`, {
      next: { revalidate: revalidateSec },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: RestaurantListItem[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}
