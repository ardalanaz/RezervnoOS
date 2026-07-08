import { createLogger } from './logger';

const log = createLogger('metrics');

// ═══════════════════════════════════════════════════════════════════════
//  لایه‌ی Metrics (سازگار با Prometheus)
//
//  چرا بدون وابستگی سنگین: prom-client عالی است، ولی برای کار در محیط
//  edge/serverless و بدون افزودن dependency، یک رجیستری سبک in-memory
//  می‌سازیم که خروجی فرمت متنی Prometheus را تولید می‌کند. اگر بعداً
//  prom-client اضافه شد، فقط همین فایل عوض می‌شود (نقطه‌ی واحد).
//
//  سه نوع متریک پایه:
//   • Counter — فقط بالا می‌رود (تعداد درخواست، تعداد خطا)
//   • Gauge   — بالا/پایین (اتصال‌های فعال، طول صف)
//   • Histogram — توزیع (latency درخواست) با bucketها
//
//  ⚠️ نکته‌ی مقیاس: این رجیستری per-instance است. در چند pod، Prometheus
//     هر pod را جدا scrape می‌کند و جمع‌بندی سمت Prometheus انجام می‌شود
//     (همان مدل استاندارد pull-based).
// ═══════════════════════════════════════════════════════════════════════

type Labels = Record<string, string>;

function labelKey(labels?: Labels): string {
  if (!labels || Object.keys(labels).length === 0) return '';
  return Object.keys(labels).sort().map((k) => `${k}="${labels[k]}"`).join(',');
}

class Counter {
  private values = new Map<string, number>();
  constructor(public name: string, public help: string) {}
  inc(labels?: Labels, by = 1) {
    const k = labelKey(labels);
    this.values.set(k, (this.values.get(k) ?? 0) + by);
  }
  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [k, v] of this.values) lines.push(`${this.name}${k ? `{${k}}` : ''} ${v}`);
    return lines.join('\n');
  }
}

class Gauge {
  private values = new Map<string, number>();
  constructor(public name: string, public help: string) {}
  set(value: number, labels?: Labels) { this.values.set(labelKey(labels), value); }
  inc(labels?: Labels, by = 1) { const k = labelKey(labels); this.values.set(k, (this.values.get(k) ?? 0) + by); }
  dec(labels?: Labels, by = 1) { this.inc(labels, -by); }
  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];
    for (const [k, v] of this.values) lines.push(`${this.name}${k ? `{${k}}` : ''} ${v}`);
    return lines.join('\n');
  }
}

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

class Histogram {
  private buckets = new Map<string, number[]>();
  private sums = new Map<string, number>();
  private counts = new Map<string, number>();
  constructor(public name: string, public help: string, private le = DEFAULT_BUCKETS) {}
  observe(value: number, labels?: Labels) {
    const k = labelKey(labels);
    if (!this.buckets.has(k)) this.buckets.set(k, new Array(this.le.length).fill(0));
    const arr = this.buckets.get(k)!;
    for (let i = 0; i < this.le.length; i++) if (value <= this.le[i]) arr[i]++;
    this.sums.set(k, (this.sums.get(k) ?? 0) + value);
    this.counts.set(k, (this.counts.get(k) ?? 0) + 1);
  }
  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    for (const [k, arr] of this.buckets) {
      const base = k ? `{${k}` : '{';
      for (let i = 0; i < this.le.length; i++) {
        lines.push(`${this.name}_bucket${base}${k ? ',' : ''}le="${this.le[i]}"} ${arr[i]}`);
      }
      lines.push(`${this.name}_bucket${base}${k ? ',' : ''}le="+Inf"} ${this.counts.get(k)}`);
      lines.push(`${this.name}_sum${k ? `{${k}}` : ''} ${this.sums.get(k)}`);
      lines.push(`${this.name}_count${k ? `{${k}}` : ''} ${this.counts.get(k)}`);
    }
    return lines.join('\n');
  }
}

// ── متریک‌های اصلی برنامه ──
export const metrics = {
  httpRequests: new Counter('rezervno_http_requests_total', 'تعداد کل درخواست‌های HTTP'),
  httpErrors: new Counter('rezervno_http_errors_total', 'تعداد پاسخ‌های خطا (۴xx/۵xx)'),
  httpDuration: new Histogram('rezervno_http_request_duration_seconds', 'مدت زمان درخواست HTTP بر حسب ثانیه'),
  reservationsCreated: new Counter('rezervno_reservations_created_total', 'تعداد رزروهای موفق ساخته‌شده'),
  reservationConflicts: new Counter('rezervno_reservation_conflicts_total', 'تعداد رد رزرو به‌خاطر تداخل (double-booking جلوگیری‌شده)'),
  smsQueueDepth: new Gauge('rezervno_sms_queue_depth', 'تعداد پیام‌های در صف SMS'),
  smsSent: new Counter('rezervno_sms_sent_total', 'تعداد پیامک‌های ارسال‌شده'),
  rateLimitHits: new Counter('rezervno_rate_limit_hits_total', 'تعداد دفعات فعال‌شدن rate-limit'),
  authFailures: new Counter('rezervno_auth_failures_total', 'تعداد شکست احراز هویت (سیگنال امنیتی)'),
  activeRequests: new Gauge('rezervno_active_requests', 'تعداد درخواست‌های در حال پردازش'),
  jobsPending: new Gauge('rezervno_jobs_pending', 'تعداد job‌های در انتظار در صف'),
  jobsDead: new Gauge('rezervno_jobs_dead', 'تعداد job‌های dead-letter (شکست دائمی)'),
  jobsProcessed: new Counter('rezervno_jobs_processed_total', 'تعداد job‌های پردازش‌شده (با label: kind/outcome)'),
};

/** خروجی متنی همه‌ی متریک‌ها در فرمت Prometheus. */
export function renderMetrics(): string {
  return Object.values(metrics).map((m) => m.render()).join('\n\n') + '\n';
}

/** اندازه‌گیری یک درخواست HTTP — در middleware/wrapper صدا زده می‌شود. */
export function recordHttp(method: string, route: string, status: number, durationSec: number) {
  const labels = { method, route, status: String(status) };
  metrics.httpRequests.inc(labels);
  metrics.httpDuration.observe(durationSec, { method, route });
  if (status >= 400) metrics.httpErrors.inc(labels);
}
