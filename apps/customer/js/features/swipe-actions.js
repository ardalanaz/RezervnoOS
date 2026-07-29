// ═══════════════════════════════════════════════════════════
//  رزرونو — Swipe-actions روی کارت‌های رزرو (C16)
//  کشیدنِ افقیِ لمسیِ یک کارتِ رزرو (.trip-card.has-swipe) لایه‌ی اکشن را نمایان
//  می‌کند و در عبور از آستانه، «همان دکمه‌ی سیم‌کشی‌شده» ([data-swipe-action]) را
//  کلیک می‌کند (لغو رزرو / رزرو مجدد) — پس هیچ منطقِ جدید/تکراری نمی‌سازد و
//  رفتار (از جمله Undoِ لغو) دقیقاً همان دکمه است. demo-safe و client-side.
//
//  ایمنی (تا اسکرولِ عمودی و e2e نشکند):
//   • تشخیصِ افقی-در-برابر-عمودی: اگر حرکت عمودی غالب شود، ژست لغو و اسکرول آزاد است.
//   • listenerِ touchmove فقط «حین» یک کشیدنِ کاندید اضافه و در پایان حذف می‌شود.
//   • preventDefault فقط پس از قطعی‌شدنِ کشیدنِ افقی.
//   • احترام به prefers-reduced-motion.
// ═══════════════════════════════════════════════════════════

const THRESHOLD = 88;   // px برای فعال‌شدنِ اکشن
const MAX       = 120;  // سقفِ جابه‌جایی
const DECIDE    = 8;    // px برای تصمیمِ جهت

let _card = null, _inner = null, _btn = null;
let _x0 = 0, _y0 = 0, _dir = 0; // 0=نامشخص، 1=افقی، -1=عمودی(لغو)
let _dx = 0, _busy = false;

function reduced(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch{ return false; } }

function reset(animate){
  if(_inner){
    if(reduced() || !animate){ _inner.style.transition='none'; }
    else { _inner.style.transition=''; }
    _inner.style.transform='';
  }
  if(_card) _card.classList.remove('swiping','ready');
  _card=_inner=_btn=null; _dir=0; _dx=0;
}

function onMove(e){
  if(!_card) return;
  const tp = e.touches && e.touches[0]; if(!tp) return;
  const dx = tp.clientX - _x0;
  const dy = tp.clientY - _y0;
  if(_dir===0){
    if(Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > DECIDE){ // عمودی → بی‌خیالِ ژست، اسکرول آزاد
      document.removeEventListener('touchmove', onMove, { passive:false });
      reset(false); return;
    }
    if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > DECIDE){ _dir=1; _card.classList.add('swiping'); }
    else return;
  }
  if(_dir!==1) return;
  if(e.cancelable) e.preventDefault();
  _dx = Math.max(-MAX, Math.min(MAX, dx));
  _inner.style.transform = `translateX(${_dx}px)`;
  _card.classList.toggle('ready', Math.abs(_dx) >= THRESHOLD);
}

function onEnd(){
  document.removeEventListener('touchmove', onMove, { passive:false });
  if(!_card){ return; }
  const fire = _dir===1 && Math.abs(_dx) >= THRESHOLD && _btn;
  const btn = _btn, card = _card, inner = _inner;
  if(fire){
    // انیمیشنِ کوتاهِ خروج، سپس کلیکِ همان دکمه‌ی موجود
    if(!reduced()){ inner.style.transition=''; inner.style.transform = `translateX(${_dx>0?MAX:-MAX}px)`; }
    _card=_inner=_btn=null; _dir=0; _dx=0;
    setTimeout(()=>{
      try{ if(btn && typeof btn.click==='function') btn.click(); }catch(e){}
      // اگر کارت هنوز هست (اکشنی که DOM را عوض نکرد)، برگردان
      try{ if(inner && inner.isConnected){ inner.style.transition=''; inner.style.transform=''; card.classList.remove('swiping','ready'); } }catch(e){}
    }, reduced()?0:160);
  } else {
    reset(true);
  }
}

function onStart(e){
  if(_busy || _card) return;
  const tp = e.touches && e.touches[0]; if(!tp || e.touches.length!==1) return;
  const card = e.target && e.target.closest && e.target.closest('.trip-card.has-swipe');
  if(!card) return;
  const inner = card.querySelector('.trip-card-inner');
  const btn = card.querySelector('[data-swipe-action]');
  if(!inner || !btn) return;
  // اگر روی خودِ دکمه‌ها شروع شد، بگذار کلیکِ عادی کار کند (ژست را شروع نکن)
  if(e.target.closest && e.target.closest('.trip-card-actions')) return;
  _card=card; _inner=inner; _btn=btn; _x0=tp.clientX; _y0=tp.clientY; _dir=0; _dx=0;
  document.addEventListener('touchmove', onMove, { passive:false });
  document.addEventListener('touchend', onEnd, { once:true });
  document.addEventListener('touchcancel', onEnd, { once:true });
}

try{ document.addEventListener('touchstart', onStart, { passive:true }); }catch(e){}
