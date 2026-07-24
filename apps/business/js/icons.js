/* ═══════════════════════════════════════════════════════════
   رزرونو — سیستم آیکون (Iconography)
   آیکون‌های خطیِ یکدست: viewBox 24×24، stroke 1.5، currentColor.
   جایگزینِ emoji در کلِ UI. بدونِ وابستگیِ خارجی.

   استفاده:
     icon('calendar')                     → رشته‌ی SVG
     icon('calendar', { size: 20 })       → اندازه‌ی سفارشی
     icon('calendar', { class: 'nav-ic' })→ کلاسِ سفارشی
     el.innerHTML = icon('search');
   ═══════════════════════════════════════════════════════════ */

const PATHS = {
  // ناوبری و عمومی
  home:      '<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search:    '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  filter:    '<path d="M3 5h18M6 12h12M10 19h4"/>',
  menu:      '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close:     '<path d="M18 6 6 18M6 6l12 12"/>',
  chevronL:  '<path d="m15 18-6-6 6-6"/>',
  chevronR:  '<path d="m9 18 6-6-6-6"/>',
  chevronD:  '<path d="m6 9 6 6 6-6"/>',
  arrowR:    '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowL:    '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  plus:      '<path d="M12 5v14M5 12h14"/>',
  check:     '<path d="M20 6 9 17l-5-5"/>',
  more:      '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',

  // رستوران / رزرو
  calendar:  '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock:     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users:     '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  mapPin:    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  utensils:  '<path d="M3 2v7a3 3 0 0 0 3 3v10M6 2v6M9 2v10M17 2c-1.5 0-3 1.5-3 5s1.5 5 3 5v10"/>',
  star:      '<path d="M12 2l3 6.5 7 .9-5 4.7 1.3 7L12 17.8 5.7 21l1.3-7-5-4.7 7-.9z"/>',
  heart:     '<path d="M19 5.5a4.5 4.5 0 0 0-6.4 0l-.6.6-.6-.6A4.5 4.5 0 1 0 5 12l7 7 7-7a4.5 4.5 0 0 0 0-6.4z"/>',

  // ارتباط
  message:   '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/>',
  bell:      '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  phone:     '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',

  // مالی / تحلیل
  wallet:    '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><circle cx="16" cy="14" r="1"/>',
  chart:     '<path d="M3 3v18h18"/><path d="M7 15l3-4 3 2 4-6"/>',
  trending:  '<path d="M22 7 13.5 15.5l-4-4L2 19"/><path d="M16 7h6v6"/>',
  creditCard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',

  // وضعیت / سیستم
  settings:  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  user:      '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  logout:    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  info:      '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  alert:     '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>',
  shield:    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  store:     '<path d="M3 9l1.5-5h15L21 9M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M3 9h18"/>',
  building:  '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  inbox:     '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  refresh:   '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  eye:       '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  flame:     '<path d="M12 2s4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.7-2.8 1.4-3.7C9 8 8 9.8 8 12a6 6 0 1 0 12 0c0-5-8-10-8-10z"/>',
  sparkle:   '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  gift:      '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/><path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5"/>',
  share:     '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  thumbsUp:  '<path d="M7 22H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3M7 12l4-9a3 3 0 0 1 3 3v4h5a2 2 0 0 1 2 2.4l-1.5 7A2 2 0 0 1 17.5 21H7z"/>',
  thumbsDown:'<path d="M7 2H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M7 12l4 9a3 3 0 0 0 3-3v-4h5a2 2 0 0 0 2-2.4l-1.5-7A2 2 0 0 0 17.5 3H7z"/>',
  moon:      '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  ticket:    '<path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
  mail:      '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
  lock:      '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  pin:       '<path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>',
  image:     '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  edit:      '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  upload:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
  trash:     '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  palette:   '<path d="M12 22a10 10 0 1 1 10-10c0 2-1.6 3-3.5 3H16a2 2 0 0 0-1.4 3.4c.3.3.4.7.4 1.1A2.5 2.5 0 0 1 12 22z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/>',
  crown:     '<path d="M3 18h18M4 18 3 7l5 4 4-6 4 6 5-4-1 11"/>',
  qr:        '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4"/>',
};

function icon(name, opts = {}) {
  const p = PATHS[name];
  if (!p) { console.warn('icon نامعتبر:', name); return ''; }
  const size = opts.size || 24;
  const cls = opts.class ? ` class="${opts.class}"` : '';
  const label = opts.label ? ` role="img" aria-label="${opts.label}"` : ' aria-hidden="true"';
  const fill = opts.fill ? 'currentColor' : 'none';
  const sw = opts.strokeWidth || 1.5;
  return `<svg${cls} width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${label}>${p}</svg>`;
}

// در دسترس برای اسکریپت‌های کلاسیک (business/company) هم
if (typeof window !== 'undefined') window.icon = icon;

if (typeof window !== "undefined") window.ICON_NAMES = Object.keys(PATHS);
