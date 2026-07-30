import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchRestaurant } from '@/lib/api';
import { restaurantJsonLd } from '@/lib/schema';

// ISR: صفحه هر ۵ دقیقه در پس‌زمینه تازه می‌شود (کاتالوگِ بزرگ بدونِ rebuildِ کامل).
export const revalidate = 300;

const SITE = 'https://rezervno.ir';
const pageUrl = (slug: string) => `${SITE}/r/${encodeURIComponent(slug)}`;

const BAND = ['', 'اقتصادی', 'متوسط', 'گران', 'لوکس'];

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const r = await fetchRestaurant(params.slug);
  if (!r) return { title: 'رستوران یافت نشد' };
  const parts = [r.cuisine, r.location.city].filter(Boolean).join('، ');
  const description = `رزرو آنلاین میز در ${r.name}${parts ? ` — ${parts}` : ''}. مشاهده‌ی منو، عکس‌ها، ساعتِ کاری و امتیاز.`;
  const url = pageUrl(params.slug);
  return {
    title: `${r.name} — رزرو آنلاین`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website', title: r.name, description, url,
      images: r.photos[0]?.url ? [r.photos[0].url] : undefined,
    },
  };
}

export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  const r = await fetchRestaurant(params.slug);
  if (!r) notFound();

  const url = pageUrl(params.slug);
  const jsonLd = restaurantJsonLd(r, url);
  const locLine = [r.location.district, r.location.city].filter(Boolean).join('، ');

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '24px 20px', lineHeight: 1.9 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="مسیر" style={{ fontSize: 13, color: '#666' }}>
        <a href={`${SITE}/`}>رزرونو</a>
        {r.location.city ? <> · <a href={`${SITE}/city/${encodeURIComponent(r.location.city)}`}>{r.location.city}</a></> : null}
        {' · '}<span>{r.name}</span>
      </nav>

      <h1 style={{ marginBottom: 4 }}>{r.name}</h1>
      <p style={{ color: '#555', marginTop: 0 }}>
        {[r.cuisine, locLine, BAND[Math.min(4, Math.max(1, r.price_band))]].filter(Boolean).join(' · ')}
        {r.rating != null && r.reviews_count > 0 ? ` · ★ ${r.rating} (${r.reviews_count} نظر)` : ''}
      </p>

      {r.location.address ? <p><strong>نشانی:</strong> {r.location.address}</p> : null}

      <a
        href={`${SITE}/`}
        style={{ display: 'inline-block', background: '#2563EB', color: '#fff', padding: '12px 22px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, margin: '8px 0 20px' }}
      >
        رزرو میز در اپ رزرونو
      </a>

      {r.photos.length ? (
        <section aria-label="گالری" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {r.photos.slice(0, 6).map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p.url} alt={p.caption || r.name} loading="lazy" style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 10 }} />
          ))}
        </section>
      ) : null}

      {r.menu.length ? (
        <section aria-label="منو">
          <h2>منو</h2>
          <ul>
            {r.menu.map((m, i) => (
              <li key={i}>{m.emoji ? `${m.emoji} ` : ''}{m.name} — {m.price_toman.toLocaleString('fa-IR')} تومان</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
