// ═══════════════════════════════════════════════════════════
//  رزرونو — بهبودهای دسترس‌پذیری (WCAG 2.2 AA) — C11
//  divهای کلیک‌پذیر (کارت‌های مناسبت، ناحیه‌های تپِ Food-DNA) با کیبورد
//  عملیاتی می‌شوند: role=button + tabindex + Enter/Space → click.
//  حلقه‌ی فوکوسِ عمومی در app.css تعریف شده (:focus-visible).
// ═══════════════════════════════════════════════════════════
function upgrade(){
  try{
    document.querySelectorAll('.occ-card').forEach(el=>{
      if(!el.hasAttribute('role')){ el.setAttribute('role','button'); el.setAttribute('tabindex','0'); }
    });
    const taps = document.querySelectorAll('.dna-tap > div');
    if(taps[0]){ taps[0].setAttribute('role','button'); taps[0].setAttribute('tabindex','0'); taps[0].setAttribute('aria-label','اسلاید قبلی'); }
    if(taps[1]){ taps[1].setAttribute('role','button'); taps[1].setAttribute('tabindex','0'); taps[1].setAttribute('aria-label','اسلاید بعدی'); }
  }catch(e){}
}

// Enter/Space روی هر عنصرِ role=button+tabindex → click (معادلِ رفتارِ دکمه)
try{
  document.addEventListener('keydown', e=>{
    if(e.key!=='Enter' && e.key!==' ') return;
    const t = e.target;
    if(t && t.matches && t.matches('[role="button"][tabindex]') && !(t.closest && t.closest('input,textarea,select'))){
      e.preventDefault();
      if(typeof t.click==='function') t.click();
    }
  });
}catch(e){}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', upgrade);
else setTimeout(upgrade, 0);
