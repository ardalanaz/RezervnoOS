// ═══════════════════════════════════════════════════════════
//  رزرونو — نوارِ زنده‌ی فیدِ کشف (live-strip) — با دادهٔ واقعی
//  منبع: GET /api/v1/restaurants/live-stats (شمارشِ واقعی از دیتابیس).
//  اصلِ «بدونِ دادهٔ جعلی»: پیش از این نوار اعداد hard-codedِ ساختگی داشت
//  («۱۲ رستوران در حال پر شدن»، «کش‌بک ۷٪»...). حالا:
//    • اگر endpoint در دسترس باشد → pillها از اعدادِ واقعیِ سرور ساخته می‌شوند
//      (فقط مقادیرِ غیرِصفر نمایش داده می‌شوند).
//    • اگر نباشد (دمو/آفلاین) → fallbackِ صادقانه از حالتِ واقعیِ کلاینت:
//      تعدادِ رستوران‌های بارگذاری‌شده (همان منطقِ C4). هیچ عددِ ثابتِ ساختگی نه.
// ═══════════════════════════════════════════════════════════
import { API } from '../api.js';
import { R } from '../init.js';
import { fmtFa } from '../data/discover.js';

function pill(inner){ return `<div class="live-pill">${inner}</div>`; }

export async function refreshLiveStrip(){
  const el = document.getElementById('liveStrip');
  if(!el) return;
  let out = '';
  try{
    const res = await API.get('/restaurants/live-stats');
    if(res && res.ok && res.data){
      const d = res.data;
      if(Number(d.fillingUp) > 0)
        out += pill(`<span class="live-dot-sm"></span><b>${fmtFa(d.fillingUp)} رستوران</b> الان در حال پر شدن`);
      if(Number(d.openRestaurants) > 0)
        out += pill(`<b>${fmtFa(d.openRestaurants)} رستوران</b> باز و آنلاین`);
      if(Number(d.activeReservations) > 0)
        out += pill(`🔥 <b>${fmtFa(d.activeReservations)} رزرو</b> فعالِ امروز`);
    }
  }catch(e){}
  if(!out){
    // fallbackِ صادقانه: تعدادِ واقعیِ رستوران‌های بارگذاری‌شده در کلاینت (نه عددِ ثابت)
    const n = Array.isArray(R) ? R.length : 0;
    if(n > 0) out = pill(`<b>${fmtFa(n)} رستوران</b> فعال`);
  }
  el.innerHTML = out; // اگر چیزی نبود → نوارِ خالی (حالتِ خالیِ صادقانه)
}

// بعد از رندرِ اولیه‌ی اپ یک بار به‌روزرسانی کن
try{
  const boot = ()=> setTimeout(refreshLiveStrip, 400);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}catch(e){}

try{ window.refreshLiveStrip = refreshLiveStrip; }catch(e){}
