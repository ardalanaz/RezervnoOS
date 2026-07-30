/* ═══════════════════════════════════════════════════════════
   رزرونو — هسته‌ی مشترکِ HTTP (transport) — منبعِ واحد
   این فایل منبعِ حقیقت است؛ tools/sync-design-system.sh آن را به اپ‌ها می‌سازد
   (customer نسخه‌ی ESM عیناً؛ در آینده پنل‌ها نسخه‌ی global).

   httpJson: یک fetchِ کم‌سطحِ بدونِ حالت — timeout، پارس JSON، envelope یکدست،
   و حالتِ offline. هیچ منطقِ auth/token/refresh اینجا نیست (آن سطح در هر اپ می‌ماند).
   خروجی:
     موفق   → { ok:true,  status, data }
     ناموفق → { ok:false, status, data, error }
     خطا/timeout → { ok:false, offline:true, error }
   ═══════════════════════════════════════════════════════════ */
async function httpJson(url, opts = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, data, error: data?.error || { message: `خطای ${res.status}` } };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, offline: true, error: { message: e.name === 'AbortError' ? 'زمان درخواست تمام شد' : 'اتصال به سرور برقرار نشد' } };
  }
}

if (typeof window !== "undefined") window.httpJson = httpJson;
