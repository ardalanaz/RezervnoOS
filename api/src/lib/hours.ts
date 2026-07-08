// ═══════════════════════════════════════════════════════════
//  ساعتِ کاریِ رستوران — منطقِ خالص (مستقل از وب، قابل‌استفاده در موتور)
//
//  ساختار openingHours (JSON):
//    { "0": [], "1": [["12:00","16:00"],["19:00","23:30"]], ... }
//    کلید 0..6 = یکشنبه..شنبه (هماهنگ با Date.getDay در تایم‌زون رستوران)
//    [] = آن روز تعطیل   |   null کل فیلد = ساعتِ ساختارمند تعریف نشده (رفتار قدیمی: همیشه باز)
//
//  چرا این‌طور: چند شیفت در روز (ناهار+شام)، روزهای متفاوت، بدون join.
// ═══════════════════════════════════════════════════════════

export type Shift = [string, string];              // ["19:00","23:30"]
export type OpeningHours = Record<string, Shift[]>; // "1": [["12:00","16:00"]]

/** "HH:mm" → دقیقه از نیمه‌شب (برای مقایسه‌ی ساده). */
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** روزِ هفته‌ی یک تاریخ در تایم‌زونِ رستوران (0=یکشنبه..6=شنبه). */
export function weekdayInTz(dateISO: string, timezone: string): number {
  // dateISO مثل "2026-07-10"؛ ظهر را می‌گیریم تا مرزِ نیمه‌شبِ تایم‌زون مشکل‌ساز نشود
  const d = new Date(`${dateISO}T12:00:00`);
  const s = d.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short' });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[s] ?? d.getDay();
}

/**
 * آیا رستوران در این تاریخ اصلاً باز است؟ (نه تعطیلِ هفتگی، نه تعطیلِ خاص)
 * @param closureDates مجموعه‌ی تاریخ‌های تعطیلِ خاص ("YYYY-MM-DD")
 */
export function isOpenOnDate(
  openingHours: OpeningHours | null | undefined,
  dateISO: string,
  timezone: string,
  closureDates: Set<string>,
): boolean {
  if (closureDates.has(dateISO)) return false;         // تعطیلِ خاص
  if (!openingHours) return true;                       // ساعت تعریف نشده → رفتار قدیمی (باز)
  const wd = String(weekdayInTz(dateISO, timezone));
  const shifts = openingHours[wd];
  if (!Array.isArray(shifts)) return true;              // آن روز تعریف نشده → محتاطانه باز (رفتار قدیمی)
  return shifts.length > 0;                             // [] یعنی تعطیل
}

/**
 * آیا یک سانسِ مشخص ("HH:mm") داخلِ یکی از شیفت‌های آن روز است؟
 * سانس باید کاملاً داخلِ شیفت شروع شود (شروعِ سانس < پایانِ شیفت، و ≥ شروعِ شیفت).
 */
export function isTimeWithinHours(
  openingHours: OpeningHours | null | undefined,
  dateISO: string,
  time: string,
  timezone: string,
  closureDates: Set<string>,
): boolean {
  if (closureDates.has(dateISO)) return false;
  if (!openingHours) return true;                       // رفتار قدیمی
  const wd = String(weekdayInTz(dateISO, timezone));
  const shifts = openingHours[wd];
  if (!Array.isArray(shifts)) return true;
  if (shifts.length === 0) return false;               // تعطیل
  const t = toMin(time);
  return shifts.some(([open, close]) => {
    const o = toMin(open), c = toMin(close);
    // شیفتِ بعد از نیمه‌شب (مثلاً 19:00 تا 01:00) → close < open
    if (c <= o) return t >= o || t < c;
    return t >= o && t < c;
  });
}

/** فیلترِ آرایه‌ی سانس‌ها بر اساس ساعتِ کاری (برای موتورِ availability). */
export function filterTimesByHours(
  times: string[],
  openingHours: OpeningHours | null | undefined,
  dateISO: string,
  timezone: string,
  closureDates: Set<string>,
): string[] {
  if (!openingHours && closureDates.size === 0) return times; // مسیرِ سریعِ رفتار قدیمی
  return times.filter(t => isTimeWithinHours(openingHours, dateISO, t, timezone, closureDates));
}
