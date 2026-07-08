// ═══ رزرونو — پنل business: کارکنان + مودال + اعلان + کش‌بک + init (Vanilla JS، بدون build، scope مشترک) ═══
function rStaff(){
  document.getElementById('v-staff').innerHTML=`
    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">کارکنان</div><div class="panel-sub">${fa(STAFF.length)} نفر · مدیریت دسترسی</div></div><button class="btn btn-primary btn-sm" onclick="toast('➕','دعوت کارمند جدید')">+ افزودن کارمند</button></div>
      ${STAFF.map(s=>`<div class="staff-row">
        <div class="staff-ava">${s.ava}</div>
        <div style="flex:1"><div style="font-size:14px;font-weight:700">${esc(s.name)}</div><div style="font-size:12px;color:var(--t2)">${esc(s.email)}</div></div>
        <span class="role-tag ${s.role}">${s.roleL}</span>
        <button class="btn btn-ghost btn-sm" onclick="toast('⚙️','تنظیم دسترسی '+${JSON.stringify(esc(s.name))})">دسترسی</button>
      </div>`).join('')}
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">شیفت امروز</div></div>
      <table class="tbl"><thead><tr><th>کارمند</th><th>نقش</th><th>شروع</th><th>پایان</th><th>وضعیت</th></tr></thead><tbody>
        <tr><td>سارا محمدی</td><td>مالک</td><td>۱۶:۰۰</td><td>۲۳:۰۰</td><td><span class="chip-status arrived">حاضر</span></td></tr>
        <tr><td>مینا تهرانی</td><td>گارسون</td><td>۱۷:۰۰</td><td>۰۰:۰۰</td><td><span class="chip-status arrived">حاضر</span></td></tr>
        <tr><td>علی نوری</td><td>گارسون</td><td>۱۸:۰۰</td><td>۰۱:۰۰</td><td><span class="chip-status confirmed">بزودی</span></td></tr>
      </tbody></table>
    </div>`;
}
// ═══════════ MODAL + TOAST + INIT ═══════════
function openModal(html){document.getElementById('modalBody').innerHTML=html;document.getElementById('modalBg').classList.add('show')}
function closeModal(){document.getElementById('modalBg').classList.remove('show')}
let tt;
function toast(icon,msg){document.getElementById('toastIcon').textContent=icon;document.getElementById('toastMsg').textContent=msg;const t=document.getElementById('toast');t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)}

// ═══════════ NOTIFICATIONS ═══════════
let NOTIFS=[
  {ic:'green',emoji:'✅',title:'رزرو جدید',text:'پارسا تهرانی برای امشب ساعت ۲۱:۳۰ میز رزرو کرد',time:'۲ دقیقه پیش',unread:true},
  {ic:'amber',emoji:'⚠️',title:'هشدار ریزش',text:'مریم احمدی ۳۵ روزه نیومده — ریسک ریزش ۸۲٪',time:'۱ ساعت پیش',unread:true},
  {ic:'blue',emoji:'⭐',title:'نظر جدید',text:'نیلوفر رضایی ۵ ستاره داد: «عالی بود، حتماً برمی‌گردم»',time:'۳ ساعت پیش',unread:true},
  {ic:'green',emoji:'🔄',title:'مشتری بازگشتی',text:'نیلوفر رضایی بعد از ۲ هفته دوباره رزرو کرد',time:'دیروز',unread:false},
];
function renderNotifList(){
  const el=document.getElementById('notifList');
  const unread=NOTIFS.filter(n=>n.unread).length;
  document.getElementById('notifPing').style.display=unread?'block':'none';
  if(!NOTIFS.length){el.innerHTML='<div class="notif-empty">اعلانی نیست 🌙</div>';return}
  el.innerHTML=NOTIFS.map((n,i)=>`<div class="notif-item ${n.unread?'unread':''}" onclick="readNotif(${i})">
    ${n.unread?'<span class="notif-dot"></span>':''}
    <div class="notif-ic ${n.ic}">${n.emoji}</div>
    <div class="notif-body"><div class="notif-title">${n.title}</div><div class="notif-text">${n.text}</div><div class="notif-time">${n.time}</div></div>
  </div>`).join('');
}
function toggleNotif(e){e&&e.stopPropagation();const pop=document.getElementById('notifPop');pop.classList.toggle('show')}
function readNotif(i){NOTIFS[i].unread=false;renderNotifList()}
function clearNotif(){NOTIFS.forEach(n=>n.unread=false);renderNotifList();toast('✓','همه خوانده شد')}
document.addEventListener('click',e=>{const pop=document.getElementById('notifPop');if(pop&&!pop.contains(e.target)&&!e.target.closest('.tb-icon'))pop.classList.remove('show')});
function popup(emoji,title,text){
  document.getElementById('popupIc').textContent=emoji;
  document.getElementById('popupTitle').textContent=title;
  document.getElementById('popupText').textContent=text;
  const p=document.getElementById('popup');p.classList.add('show');
  clearTimeout(p._t);p._t=setTimeout(()=>p.classList.remove('show'),4200);
}
function pushNotif(n){NOTIFS.unshift(n);renderNotifList();popup(n.emoji,n.title,n.text)}


// ═══════════ CASHBACK ═══════════
let CB={base:8,pre:12,vip:18,wb:20};
let CB_DRAFT={...CB};
let _cbLoaded=false;
async function rCashback(){
  if(!_cbLoaded && API.getToken()){
    const res=await API.get('/restaurant/cashback');
    if(res.ok){ CB={base:res.data.base_pct,pre:res.data.preorder_pct,vip:res.data.vip_pct,wb:res.data.winback_pct}; }
    _cbLoaded=true;
  }
  CB_DRAFT={...CB};
  const cards=[['base','کش‌بک پایه','برای تمام رزروها',20],['pre','پیش‌سفارش','رزرو همراه با منو',25],['vip','مشتری VIP','اعضای سطح طلایی و بالاتر',30],['wb','بازگشت (Winback)','مشتری ناراضی یا در خطر ریزش',40]];
  document.getElementById('v-cashback').innerHTML=`
    <div class="section-head"><div><div class="section-title">تنظیم درصد کش‌بک</div><div class="section-sub">درصدها بعد از تأیید برای همه‌ی مشتریان اعمال می‌شن</div></div></div>
    <div class="cb-dirty" id="cbDirty">⚠️ تغییرات هنوز ذخیره نشده — برای اعمال، تأیید کن</div>
    <div class="cb-sliders">
      ${cards.map(([k,n,d,mx])=>`<div class="cb-slider-card"><div class="cb-slider-top"><div class="cb-slider-name">${n}</div><div class="cb-slider-pct" id="cbVal-${k}">${fa(CB[k])}٪</div></div><div class="cb-slider-desc">${d}</div><input type="range" class="cb-range" min="0" max="${mx}" value="${CB[k]}" oninput="cbChange('${k}',this.value)"></div>`).join('')}
    </div>
    <div class="cb-preview">
      <div class="cb-prev-label">پیش‌نمایش از دید مشتری</div>
      <div class="cb-prev-row"><span>رزرو معمولی</span><b id="pv-base">${fa(CB.base)}٪</b></div>
      <div class="cb-prev-row"><span>با پیش‌سفارش</span><b id="pv-pre">${fa(CB.pre)}٪</b></div>
      <div class="cb-prev-row"><span>مشتری VIP</span><b id="pv-vip">${fa(CB.vip)}٪</b></div>
      <div class="cb-prev-row"><span>بازگشت</span><b id="pv-wb">${fa(CB.wb)}٪</b></div>
    </div>
    <button class="btn btn-primary btn-block" id="cbSave" style="margin-top:16px;opacity:.5;pointer-events:none" onclick="cbConfirm()">تأیید و اعمال تغییرات</button>`;
}
// ═══ قیمت‌گذاری هوشمند (AI Pricing) ═══
let PRICE_STATE={rules:[],base:0,suggestions:[],hasData:false};
async function rPricing(){
  // پیش‌فرض نمونه (وقتی API نیست) — تا پنل بدون بک‌اند هم دمو داشته باشد
  let P={base:0,rules:[],suggestions:[
    {label:'شب‌های آخر هفته',dows:[4,5],from:'19:00',to:'23:00',min_toman:650000,occupancy_pct:88,
     reason:'پنجشنبه و جمعه شب‌ها شلوغ‌ترین زمانِ شماست؛ حداقل مبلغِ بالاتر، تقاضای بالا را متعادل می‌کند و درآمد هر میز را افزایش می‌دهد.'},
    {label:'شب‌های وسطِ هفته',dows:[0,1,2,3,6],from:'19:00',to:'22:30',min_toman:400000,occupancy_pct:55,
     reason:'شب‌های وسطِ هفته تقاضای متوسطی دارند؛ حداقل مبلغِ پایه تعادلِ خوبی بین پر شدنِ میزها و درآمد ایجاد می‌کند.'},
    {label:'ناهارِ وسطِ هفته (خلوت)',dows:[0,1,2,3,6],from:'12:00',to:'15:00',min_toman:200000,occupancy_pct:22,
     reason:'این بازه خلوت است؛ حداقل مبلغِ پایین‌تر مشتری‌های حساس به قیمت را جذب می‌کند و میزهای خالی را پر می‌کند — درآمدِ اضافه از ظرفیتِ بلااستفاده.'}
  ],hasData:false};
  if(API.getToken()){
    const res=await API.get('/restaurant/pricing');
    if(res.ok && res.data){
      API.online=true;
      P={base:res.data.base_min_spend_toman||0,rules:res.data.current_rules||[],
         suggestions:res.data.suggestions||[],hasData:!!res.data.has_data};
    } else { API.online=false; }
  }
  PRICE_STATE=P;
  const toman=n=>fa(Math.round(n/1000).toLocaleString('en-US'))+'هزار';
  const occColor=p=>p>=70?'linear-gradient(90deg,#F97316,#EF4444)':p>=45?'linear-gradient(90deg,#6A4BFF,#B23BFF)':'linear-gradient(90deg,#60A5FA,#3B82F6)';
  const dowLbl=['ی','د','س','چ','پ','ج','ش'];
  const sugCard=(s,i)=>{
    const hot=s.occupancy_pct>=70, cold=s.occupancy_pct<40;
    const tag=hot?'<span class="pr-tag hot">🔥 شلوغ‌ترین</span>':cold?'<span class="pr-tag cold">❄️ خلوت</span>':'';
    const dir=cold?'<span class="pr-down">↓</span>':'<span class="pr-up">↑</span>';
    const daysTxt=(s.dows||[]).map(d=>dowLbl[d]).join('،')+` · ${s.from}–${s.to}`;
    return `<div class="pr-sug">${tag}
      <div class="pr-sug-top"><div><div class="pr-sug-label">${s.label}</div><div class="pr-sug-days">${daysTxt}</div></div>
        <div class="pr-sug-amt"><div class="pr-sug-amt-v">${toman(s.min_toman)}</div><div class="pr-sug-amt-l">حداقل مبلغ ${dir}</div></div></div>
      <div class="pr-occ"><span style="font-size:11px;color:var(--t3);font-weight:700">اشغال</span><div class="pr-occ-track"><div class="pr-occ-fill" style="width:${s.occupancy_pct}%;background:${occColor(s.occupancy_pct)}"></div></div><span class="pr-occ-pct">${fa(s.occupancy_pct)}٪</span></div>
      <div class="pr-reason">💬 ${s.reason}</div>
      <div class="pr-actions"><button class="btn btn-primary" style="flex:1" id="prAcc-${i}" onclick="pricingAccept(${i})">✓ قبول این پیشنهاد</button></div>
    </div>`;
  };
  document.getElementById('v-pricing').innerHTML=`
    <div class="section-head"><div><div class="section-title">قیمت‌گذاری هوشمند</div><div class="section-sub">پیشنهادِ حداقل مبلغِ رزرو بر اساس شلوغیِ واقعیِ رستورانت</div></div></div>
    ${dataSourceNote()}
    <div class="pr-banner"><h3>✨ پیشنهاد بر اساس داده‌ی شما</h3><p>${P.hasData?'این پیشنهادها از الگوی شلوغیِ ۹۰ روز اخیرِ خودت ساخته شدن — نه حدس.':'هنوز داده‌ی کافی نداری؛ این‌ها پیشنهادِ اولیه‌ست. با ثبت رزروها دقیق‌تر می‌شن.'} هر کدوم رو می‌تونی قبول کنی. کنترل کاملش دستِ توئه.</p></div>
    <div id="prSugs">${(P.suggestions.length?P.suggestions:[]).map(sugCard).join('')||'<div class="pr-empty">فعلاً پیشنهادی نیست. با ثبت رزروِ بیشتر، سیستم الگوها رو پیدا می‌کنه.</div>'}</div>
    ${P.rules.length?`<div class="pr-active"><div class="pr-active-h">✓ قواعدِ فعالِ فعلی</div>${P.rules.map(r=>`<div class="pr-active-row"><span>${r.label||((r.dows||[]).map(d=>dowLbl[d]).join('،'))}</span><b>${toman(r.min_toman)} تومان</b></div>`).join('')}</div>`:''}
    <div class="pr-note">💡 رقبا مثل SevenRooms این رو «قیمت‌گذاری پویا» می‌گن و بابتش پول می‌گیرن. با یه نگاه می‌بینی کجا پول از دست می‌دی (میز خالی) و کجا می‌تونی بیشتر دربیاری (شب شلوغ).</div>`;
}
function pricingAccept(i){
  const s=PRICE_STATE.suggestions[i]; if(!s) return;
  // به قواعدِ فعال اضافه کن (بدونِ تکرارِ همان بازه)
  const exists=PRICE_STATE.rules.some(r=>r.from===s.from&&r.to===s.to&&JSON.stringify(r.dows)===JSON.stringify(s.dows));
  if(!exists) PRICE_STATE.rules.push({dows:s.dows,from:s.from,to:s.to,min_toman:s.min_toman,label:s.label});
  const btn=document.getElementById('prAcc-'+i); if(btn){btn.textContent='✓ اعمال شد';btn.classList.add('pr-done');}
  if(navigator.vibrate)navigator.vibrate(12);
  pricingSave();
}
async function pricingSave(){
  if(!API.getToken()){ toast&&toast('پیش‌نمایش: در حالت واقعی ذخیره می‌شود'); return; }
  const res=await API.request('/restaurant/pricing',{method:'PUT',body:JSON.stringify({rules:PRICE_STATE.rules,base_min_spend_toman:PRICE_STATE.base})});
  if(res.ok){ toast&&toast('قواعد قیمت ذخیره شد ✓'); }
}
function cbChange(k,v){
  CB_DRAFT[k]=+v;
  document.getElementById('cbVal-'+k).textContent=fa(+v)+'٪';
  document.getElementById('pv-'+k).textContent=fa(+v)+'٪';
  const dirty=JSON.stringify(CB)!==JSON.stringify(CB_DRAFT);
  document.getElementById('cbDirty').classList.toggle('show',dirty);
  const btn=document.getElementById('cbSave');
  btn.style.opacity=dirty?'1':'.5';btn.style.pointerEvents=dirty?'auto':'none';
}
function cbConfirm(){
  openModal(`<div style="text-align:center">
      <div style="width:64px;height:64px;border-radius:16px;background:var(--blue-50);display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 16px">💰</div>
      <div class="modal-title" style="text-align:center">از تغییر کش‌بک مطمئنی؟</div>
      <div class="modal-sub" style="text-align:center">این درصدها بلافاصله برای همه‌ی مشتریان اعمال و در اپ مشتری نمایش داده می‌شه.</div>
      <div class="cb-preview" style="text-align:right;margin-bottom:18px">
        <div class="cb-prev-row"><span>کش‌بک پایه</span><b>${fa(CB_DRAFT.base)}٪</b></div>
        <div class="cb-prev-row"><span>پیش‌سفارش</span><b>${fa(CB_DRAFT.pre)}٪</b></div>
        <div class="cb-prev-row"><span>VIP</span><b>${fa(CB_DRAFT.vip)}٪</b></div>
        <div class="cb-prev-row"><span>بازگشت</span><b>${fa(CB_DRAFT.wb)}٪</b></div>
      </div>
      <button class="btn btn-primary btn-block" onclick="cbApply()">بله، اعمال کن</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="closeModal()">انصراف</button>
    </div>`);
}
async function cbApply(){
  CB={...CB_DRAFT};closeModal();
  document.getElementById('cbDirty').classList.remove('show');
  const btn=document.getElementById('cbSave');btn.style.opacity='.5';btn.style.pointerEvents='none';
  // ارسال به API اگر توکن staff داریم
  if(API.getToken()){
    const res=await API.patch('/restaurant/cashback',{
      base_pct:CB.base, preorder_pct:CB.pre, vip_pct:CB.vip, winback_pct:CB.wb,
    });
    if(res.ok){
      toast('✓','کش‌بک در سرور ذخیره شد');
    } else if(res.offline){
      toast('✓','کش‌بک اعمال شد (محلی)');
    } else {
      toast('⚠️',res.error?.message||'خطا در ذخیره‌ی کش‌بک');
    }
  } else {
    toast('✓','درصدهای کش‌بک اعمال شد');
  }
  pushNotif({ic:'blue',emoji:'💰',title:'کش‌بک به‌روز شد',text:`کش‌بک پایه به ${fa(CB.base)}٪ تغییر کرد`,time:'همین الان',unread:true});
}

// ═══════════ ورود کارمند (فاز ۳ تکه ۷) ═══════════
let _staffPhone = '';
let STAFF_INFO = null;
function showStaffLoginPhone(){
  document.getElementById('loginCard').innerHTML = `
    <div class="login-logo">🍽️</div>
    <div class="login-title">پنل رستوران رزرونو</div>
    <div class="login-sub">برای ورود، شماره موبایل ثبت‌شده‌ی رستورانت رو وارد کن</div>
    <label class="login-field-label">شماره موبایل</label>
    <input class="login-inp" id="staffPhone" inputmode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" onkeydown="if(event.key==='Enter')staffSendOtp()">
    <button class="login-btn" id="staffSendBtn" onclick="staffSendOtp()">ارسال کد ورود</button>
    <div class="login-foot">فقط شماره‌هایی که به‌عنوان مدیر یا کارمند ثبت شده‌اند دسترسی دارند</div>`;
  setTimeout(()=>document.getElementById('staffPhone')?.focus(),200);
}
async function staffSendOtp(){
  const el = document.getElementById('staffPhone');
  const phone = (el?.value||'').trim();
  const normalized = phone.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\D/g,'');
  if (!/^09\d{9}$/.test(normalized)) { toast('⚠️','شماره موبایل معتبر وارد کن'); return; }
  _staffPhone = normalized;
  const btn = document.getElementById('staffSendBtn');
  if (btn){ btn.disabled = true; btn.textContent = 'در حال ارسال...'; }
  const res = await API.requestStaffOtp(normalized);
  if (!res.ok && !res.offline){
    // خطای واقعی (مثلاً شماره staff نیست)
    toast('⚠️', res.error?.message || 'این شماره دسترسی ندارد');
    if (btn){ btn.disabled = false; btn.textContent = 'ارسال کد ورود'; }
    return;
  }
  const devCode = res.data?.devCode || (res.offline ? '۱۲۳۴' : null);
  showStaffLoginCode(devCode, res.offline);
}
function showStaffLoginCode(devCode, offline){
  document.getElementById('loginCard').innerHTML = `
    <div class="login-logo">✉️</div>
    <div class="login-title">کد ورود رو وارد کن</div>
    <div class="login-sub">کد ۴ رقمی به شماره‌ی ${toFaDigits(_staffPhone)} ارسال شد</div>
    <label class="login-field-label">کد ورود</label>
    <input class="login-inp code" id="staffCode" inputmode="numeric" maxlength="4" placeholder="····" onkeydown="if(event.key==='Enter')staffConfirmOtp()">
    <button class="login-btn" id="staffVerifyBtn" onclick="staffConfirmOtp()">ورود به پنل</button>
    <button class="login-back" onclick="showStaffLoginPhone()">تغییر شماره</button>
    ${devCode ? `<div class="login-hint">${offline?'🔌 حالت دمو (بک‌اند متصل نیست):':'🔑 حالت توسعه:'} کد ورود <b>${toFaDigits(devCode)}</b> است</div>` : ''}`;
  setTimeout(()=>document.getElementById('staffCode')?.focus(),200);
}
async function staffConfirmOtp(){
  const el = document.getElementById('staffCode');
  const code = (el?.value||'').trim().replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  if (!/^\d{4}$/.test(code)) { toast('⚠️','کد ۴ رقمی رو کامل وارد کن'); return; }
  const btn = document.getElementById('staffVerifyBtn');
  if (btn){ btn.disabled = true; btn.textContent = 'در حال بررسی...'; }
  const res = await API.verifyStaffOtp(_staffPhone, code);
  if (res.ok && res.data?.staff){
    STAFF_INFO = res.data.staff;
    enterPanel();
  } else if (res.offline){
    // حالت دمو: کد ۱۲۳۴
    if (code === '1234'){ STAFF_INFO = { role:'owner', restaurant_name:'کافه‌رستوران ویستا' }; enterPanel(true); }
    else { toast('⚠️','در حالت دمو، کد ۱۲۳۴ است'); if (btn){ btn.disabled=false; btn.textContent='ورود به پنل'; } }
  } else {
    toast('⚠️', res.error?.message || 'کد اشتباه است');
    if (btn){ btn.disabled=false; btn.textContent='ورود به پنل'; }
  }
}
function enterPanel(demo){
  document.getElementById('loginOverlay').classList.add('hidden');
  renderNotifList();
  rOverview();
  initLiveUpdates();
  if(API.getToken() && !demo){
    loadTables().then(()=>{ if(document.getElementById('v-floor')?.classList.contains('active')) rFloor(); });
    Heartbeat.start();           // رستوران را در اپ مشتری آنلاین نگه می‌دارد
    Outbox.sync();               // اگر عملیات آفلاینِ در انتظار هست، همگام کن
  }
  toast('✅', `خوش اومدی${STAFF_INFO?.restaurant_name?' · '+STAFF_INFO.restaurant_name:''}`);
}
async function staffLogout(){
  Heartbeat.stop();                   // توقف heartbeat هنگام خروج
  await API.doLogout();               // باطل‌سازی سمت سرور + پاکسازی محلی
  STAFF_INFO = null;
  document.getElementById('loginOverlay').classList.remove('hidden');
  showStaffLoginPhone();
  toast('👋','از پنل خارج شدی');
}
// نشست منقضی و تمدید هم جواب نداد → برگشت به صفحه‌ی ورود
function onStaffSessionExpired(){
  STAFF_INFO = null;
  document.getElementById('loginOverlay').classList.remove('hidden');
  showStaffLoginPhone();
  toast('🔒','نشست منقضی شد، دوباره وارد شو');
}

// init — نشست را از localStorage بازیابی کن، بعد ورود را چک کن
API.restoreSession();
Net.init();                    // فعال‌سازی تشخیص آنلاین/آفلاین + همگام‌سازی صف
Outbox._updateBadge();         // نمایش تعداد عملیات در انتظار (اگر از قبل هست)
if (API.getToken()) {
  // توکن ذخیره‌شده هست → مستقیم پنل (اگر منقضی باشد، اولین درخواست refresh می‌کند)
  document.getElementById('loginOverlay').classList.add('hidden');
  renderNotifList();
  rOverview();
  loadTables();
  Heartbeat.start();           // شروع ارسال heartbeat (رستوران را در اپ مشتری آنلاین نگه می‌دارد)
} else {
  // نیاز به ورود
  showStaffLoginPhone();
}
