// ═══ رزرونو — پنل business: مسیریابی بین صفحات (Vanilla JS، بدون build، scope مشترک) ═══
function nav(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById('v-'+v).classList.add('active');
  document.querySelectorAll('.sb-item').forEach(i=>i.classList.toggle('active',i.dataset.v===v));
  document.getElementById('tbTitle').textContent=TITLES[v];
  ({overview:rOverview,reservations:rReservations,waitlist:rWaitlist,floor:rFloor,profile:rProfile,customers:rCustomers,loyalty:rLoyalty,analytics:rAnalytics,cashback:rCashback,staff:rStaff,pricing:rPricing})[v]();
  if(window.innerWidth<=768)closeSidebar();
  document.querySelector('.content').scrollTop=0;
}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sbOverlay').classList.toggle('show')}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sbOverlay').classList.remove('show')}
function toggleStatus(){
  const b=document.getElementById('tbStatus'),open=b.classList.contains('open');
  b.classList.toggle('open');b.classList.toggle('closed');
  document.getElementById('tbStatusText').textContent=open?'بسته':'باز';
  toast(open?'🔴':'🟢',open?'رستوران بسته شد':'رستوران باز شد');
}

// ═══════════ OVERVIEW ═══════════
