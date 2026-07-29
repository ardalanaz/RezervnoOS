// ═══════════════════════════════════════════════════════════
//  رزرونو — Command Palette + جست‌وجوی سراسری (C6)
//  الهام از Linear/Raycast/Notion. کاملاً client-side (روی R محلی) → demo-safe،
//  بدونِ نیازِ بک‌اند. باز شدن: Ctrl/⌘+K یا دکمه‌ی جست‌وجوی نوار بالا یا openPalette().
//  a11y: role=dialog/listbox/option، ناوبریِ کیبورد (بالا/پایین/Enter/Esc)، فوکوس.
// ═══════════════════════════════════════════════════════════
import { R } from '../init.js';
import { openRest } from '../data/detail.js';
import { go } from '../data/discover.js';
import { icon } from '../icons.js';
import { esc } from '../auth.js';

const RECENT_KEY = 'rz_recent_search';
let _sel = 0, _items = [];

function recents(){ try{ return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }catch{ return []; } }
function pushRecent(q){ try{ const r=recents().filter(x=>x!==q); r.unshift(q); localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0,6))); }catch{} }

// فرمان‌های ناوبریِ سریع
const COMMANDS = [
  { t:'کشف رستوران‌ها', ic:'search',   run:()=>go('discover') },
  { t:'رزروهای من',      ic:'calendar', run:()=>go('trips') },
  { t:'علاقه‌مندی‌ها',   ic:'heart',    run:()=>go('favorites') },
  { t:'باشگاه امتیازها', ic:'crown',    run:()=>go('loyalty') },
  { t:'پروفایل',         ic:'user',     run:()=>go('profile') },
];

function ensureEl(){
  let ov = document.getElementById('cmdk');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'cmdk'; ov.className = 'cmdk-overlay'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-label','جست‌وجو و فرمان‌ها');
  ov.innerHTML =
    '<div class="cmdk" role="document">' +
      '<div class="cmdk-row">' + icon('search',{size:18}) +
        '<input class="cmdk-input" id="cmdkInput" type="text" autocomplete="off" placeholder="جست‌وجوی رستوران یا فرمان..." aria-label="جست‌وجو" aria-controls="cmdkList" role="combobox" aria-expanded="true">' +
        '<kbd class="cmdk-esc">Esc</kbd>' +
      '</div>' +
      '<ul class="cmdk-list" id="cmdkList" role="listbox" aria-label="نتایج"></ul>' +
    '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', e=>{ if(e.target===ov) closePalette(); });
  ov.querySelector('#cmdkInput').addEventListener('input', e=>render(e.target.value));
  ov.querySelector('#cmdkInput').addEventListener('keydown', onKey);
  return ov;
}

function itemHTML(it, i){
  return `<li class="cmdk-item ${i===_sel?'sel':''}" role="option" id="cmdk-opt-${i}" aria-selected="${i===_sel}" data-i="${i}">`+
    `<span class="cmdk-ic">${icon(it.ic||'search',{size:16})}</span>`+
    `<span class="cmdk-t">${esc(it.t)}</span>`+
    (it.sub?`<span class="cmdk-sub">${esc(it.sub)}</span>`:'')+
  `</li>`;
}

function render(q){
  q = (q||'').trim();
  const list = document.getElementById('cmdkList');
  _items = [];
  if(!q){
    recents().forEach(r=>_items.push({ t:r, ic:'clock', run:()=>{ const inp=document.getElementById('cmdkInput'); inp.value=r; render(r); } }));
    COMMANDS.forEach(c=>_items.push(c));
  } else {
    const ql = q.toLowerCase();
    COMMANDS.filter(c=>c.t.toLowerCase().includes(ql)).forEach(c=>_items.push(c));
    (Array.isArray(R)?R:[]).filter(r=>
        (r.n&&r.n.includes(q)) || (r.cuisine&&r.cuisine.includes(q)) || (r.vibes&&r.vibes.some(v=>v.includes(q)))
      ).slice(0,8).forEach(r=>_items.push({ t:r.n, sub:r.cuisine, ic:'utensils', run:()=>{ pushRecent(q); openRest(r.id); } }));
  }
  _sel = 0;
  list.innerHTML = _items.length ? _items.map(itemHTML).join('') : '<li class="cmdk-empty">چیزی پیدا نشد</li>';
  list.querySelectorAll('.cmdk-item').forEach(li=>{
    li.addEventListener('click', ()=>runItem(+li.dataset.i));
    li.addEventListener('mousemove', ()=>{ _sel=+li.dataset.i; paintSel(); });
  });
}

function paintSel(){
  const list = document.getElementById('cmdkList'); if(!list) return;
  list.querySelectorAll('.cmdk-item').forEach((li,i)=>{ li.classList.toggle('sel', i===_sel); li.setAttribute('aria-selected', String(i===_sel)); });
  const cur = list.querySelector('.cmdk-item.sel'); if(cur) cur.scrollIntoView({block:'nearest'});
  const inp = document.getElementById('cmdkInput'); if(inp && list.querySelector('.cmdk-item.sel')) inp.setAttribute('aria-activedescendant','cmdk-opt-'+_sel);
}

function runItem(i){
  const it = _items[i]; if(!it) return;
  closePalette();
  try{ it.run && it.run(); }catch(e){}
}

function onKey(e){
  if(e.key==='ArrowDown'){ e.preventDefault(); _sel=Math.min(_sel+1,_items.length-1); paintSel(); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); _sel=Math.max(_sel-1,0); paintSel(); }
  else if(e.key==='Enter'){ e.preventDefault(); runItem(_sel); }
  else if(e.key==='Escape'){ e.preventDefault(); closePalette(); }
}

export function openPalette(){
  const ov = ensureEl();
  ov.classList.add('show');
  const inp = document.getElementById('cmdkInput');
  if(inp){ inp.value=''; render(''); setTimeout(()=>inp.focus(),20); }
}
export function closePalette(){
  const ov = document.getElementById('cmdk'); if(ov) ov.classList.remove('show');
}

// باز شدن با Ctrl/⌘+K
try{
  addEventListener('keydown', e=>{
    if((e.metaKey||e.ctrlKey) && (e.key==='k'||e.key==='K')){ e.preventDefault(); openPalette(); }
  });
}catch{}

try{ window.openPalette = openPalette; window.closePalette = closePalette; }catch{}
