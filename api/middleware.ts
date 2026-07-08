import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIp, rateLimitHeaders, RULES, isBanned, recordViolation, rateLimitInMemory } from '@/lib/ratelimit';

// ═══════════════════════════════════════════════════════════════════════
//  ⚠️ این middleware به ioredis (از طریق ratelimit/redis) وابسته است که به
//  سوکت TCP نیاز دارد و فقط در Node.js runtime کار می‌کند، نه Edge runtime.
//
//  این پروژه به‌صورت self-host با `next start` (سرور Node) اجرا می‌شود، پس
//  middleware در Node runtime اجرا می‌شود و ioredis کار می‌کند. اگر روی پلتفرم
//  Edge (مثل Vercel Edge) دیپلوی شود، باید این منطق به لایه‌ی route (که در Node
//  runtime اجرا می‌شود) منتقل شود یا از یک کلاینت Edge-compatible (مثل Upstash
//  REST) استفاده شود.
//
//  دفاع در عمق (باگ C7): همه‌ی فراخوان‌های وابسته به Redis در try/catch هستند و
//  در صورت خطا fail-open می‌شوند، تا حتی اگر Redis در دسترس نباشد یا محیط محدود
//  باشد، کل API با ۵۰۰ سقوط نکند (rate-limit در همان حالت توسط لایه‌ی route و
//  nginx همچنان اعمال می‌شود).
// ═══════════════════════════════════════════════════════════════════════

export const config = { matcher: '/api/:path*' };

// پاسخ بلاک استاندارد
function blocked(message: string, status = 429, retryAfter?: number) {
  const headers: Record<string, string> = {};
  if (retryAfter) headers['Retry-After'] = String(retryAfter);
  return NextResponse.json({ ok: false, error: { code: 'BLOCKED', message } }, { status, headers });
}

// ── هدرهای امنیتی روی همه‌ی پاسخ‌های API (دفاع در عمق) ──
function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');           // جلوگیری از MIME sniffing
  res.headers.set('X-Frame-Options', 'DENY');                     // ضد clickjacking
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-XSS-Protection', '0');                       // (CSP جای این را می‌گیرد)
  res.headers.set('Cache-Control', 'no-store');                   // پاسخ API کش نشود
  // HSTS: مرورگر را وادار می‌کند فقط HTTPS استفاده کند (ضد downgrade/SSL-strip).
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  // CSP سخت‌گیرانه برای پاسخ API: هیچ منبعی نباید اجرا/بارگذاری شود (این JSON است).
  res.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  // غیرفعال‌کردن APIهای حساس مرورگر روی دامنه‌ی API.
  res.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  return res;
}

export async function middleware(req: NextRequest) {
  const ip = clientIp(req);

  // ── لایه ۱: آیا IP بن شده؟ (سریع‌ترین چک) — fail-open در صورت خطای Redis ──
  try {
    if (await isBanned(ip)) {
      return applySecurityHeaders(blocked('دسترسی شما موقتاً مسدود شده است.', 403));
    }
  } catch { /* Redis در دسترس نبود → ادامه بده، nginx/route لایه‌ی بعدی‌اند */ }

  // ── لایه ۲: محافظت CSRF برای درخواست‌های تغییردهنده ──
  // API با JWT در هدر Authorization ذاتاً در برابر CSRF مقاوم است (کوکی نیست)،
  // اما چک Origin یک لایه‌ی دفاعی اضافه برای درخواست‌های mutating است.
  const method = req.method;
  if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
    const origin = req.headers.get('origin');
    const allowed = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
    // اگر لیست مجاز تعریف شده و Origin وجود دارد ولی مجاز نیست → رد.
    // نکته‌ی امنیتی: وقتی ALLOWED_ORIGINS تنظیم نشده، این چک skip می‌شود؛ در
    // production حتماً باید ALLOWED_ORIGINS ست شود (به docker-compose رجوع کن).
    if (allowed.length > 0 && origin && !allowed.includes(origin)) {
      await recordViolation(ip).catch(() => {});
      return applySecurityHeaders(blocked('منشأ درخواست مجاز نیست.', 403));
    }
  }

  // ── لایه ۳: ریت‌لیمیت سراسری — اگر Redis قطع شد، fallback به in-memory (نه fail-open کامل) ──
  let result: Awaited<ReturnType<typeof rateLimit>> | null = null;
  try {
    result = await rateLimit(ip, RULES.globalPerIp);
  } catch {
    // Redis در دسترس نبود → به‌جای عبورِ کامل، سقفِ حداقلیِ in-memory (ضدِ DDoS پایه)
    result = rateLimitInMemory(ip, RULES.globalPerIp);
  }
  if (result && !result.allowed) {
    await recordViolation(ip).catch(() => {});
    return applySecurityHeaders(blocked('تعداد درخواست بیش از حد مجاز. کمی صبر کن.', 429, result.retryAfterSec));
  }

  const res = applySecurityHeaders(NextResponse.next());
  if (result) {
    for (const [k, v] of Object.entries(rateLimitHeaders(result, RULES.globalPerIp))) {
      res.headers.set(k, v);
    }
  }
  // هدر trace-id برای ردیابی درخواست (handlerها و لاگ‌ها از آن استفاده می‌کنند)
  const traceId = req.headers.get('x-trace-id') || crypto.randomUUID().replace(/-/g, '');
  res.headers.set('x-trace-id', traceId);
  return res;
}
