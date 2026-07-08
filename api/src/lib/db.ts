import { PrismaClient } from '@prisma/client';
import { createLogger } from './logger';

const log = createLogger('db');

// ═══════════════════════════════════════════════════════════════════════
//  لایه‌ی اتصال دیتابیس — Connection Pooling + Read Replica Routing
//
//  چرا این فایل وجود دارد (مسئله‌ی واقعی):
//  PostgreSQL مدیریت‌شده معمولاً سقف اتصال پایینی دارد (در تست ما روی Supabase: ۶۰).
//  هر instance از API که مستقیم به Postgres وصل شود، چند connection می‌گیرد؛
//  با چند instance (scale افقی) خیلی زود به سقف می‌خوریم → ارور
//  "too many connections" و قطع سرویس. راه‌حل استاندارد دو لایه است:
//
//   ۱) Connection Pooling (PgBouncer / Supabase Pooler / RDS Proxy):
//      API به pooler وصل می‌شود، نه مستقیم به DB. Pooler صدها اتصال کلاینت را
//      روی چند اتصال واقعی DB multiplex می‌کند.
//      ⚠️ در حالت transaction pooling، prepared statementها کار نمی‌کنند؛
//         برای همین DATABASE_URL باید ?pgbouncer=true داشته باشد تا Prisma
//         prepared statement cache را غیرفعال کند.
//
//   ۲) Read Replica Routing:
//      کوئری‌های خواندنی سنگین (داشبورد، آنالیتیکس، گزارش، لیست) به replica
//      می‌روند؛ فقط نوشتن‌ها و تراکنش‌های حساس به primary. این بار را از
//      primary برمی‌دارد و ظرفیت همزمانی را چند برابر می‌کند.
//
//  متغیرهای محیطی:
//   DATABASE_URL          → primary، از طریق pooler (نوشتن + تراکنش)
//   DATABASE_REPLICA_URL  → read replica (اختیاری؛ اگر نبود، از primary می‌خواند)
//   DATABASE_DIRECT_URL   → اتصال مستقیم بدون pooler (فقط برای migrate/introspect)
// ═══════════════════════════════════════════════════════════════════════

const g = globalThis as unknown as {
  prismaPrimary?: PrismaClient;
  prismaReplica?: PrismaClient;
  shutdownHooked?: boolean;
};

function makeClient(url: string | undefined): PrismaClient {
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: [{ level: 'error', emit: 'event' }, { level: 'warn', emit: 'event' }],
  });
}

// ── Primary: نوشتن، تراکنش، قفل ردیف ──
export const db = g.prismaPrimary ?? makeClient(process.env.DATABASE_URL);

// ── Replica: فقط خواندن. اگر DATABASE_REPLICA_URL تنظیم نشده باشد،
//    به همان primary اشاره می‌کند (degrade تمیز، نه crash). ──
export const dbRead = g.prismaReplica
  ?? (process.env.DATABASE_REPLICA_URL ? makeClient(process.env.DATABASE_REPLICA_URL) : db);

if (process.env.NODE_ENV !== 'production') {
  g.prismaPrimary = db;
  if (dbRead !== db) g.prismaReplica = dbRead;
}

// ═══════════════════════════════════════════════════════════
//  راهنمای استفاده (الگوی read/write separation):
//
//    import { db, dbRead } from './db';
//
//    // خواندن سنگین (داشبورد/لیست/آنالیتیکس) → replica:
//    const items = await dbRead.restaurant.findMany({ ... });
//
//    // نوشتن یا هر چیزی که باید فوراً پیامد نوشتن خودش را ببیند → primary:
//    await db.reservation.create({ ... });
//
//  ⚠️ Replication lag: replica چند ده میلی‌ثانیه عقب است. بنابراین «بعد از
//     نوشتن، فوراً همان را بخوان» باید از primary (db) باشد، نه dbRead —
//     وگرنه ممکن است داده‌ی قدیمی برگردد (read-after-write inconsistency).
// ═══════════════════════════════════════════════════════════

// ── Graceful shutdown: هر دو client را می‌بندد ──
if (!g.shutdownHooked && typeof process !== 'undefined' && process.on) {
  g.shutdownHooked = true;
  const shutdown = async (signal: string) => {
    log.info(`دریافت ${signal} — بستن تمیز اتصال‌های دیتابیس`);
    try {
      await db.$disconnect();
      if (dbRead !== db) await dbRead.$disconnect();
    } catch (e) {
      log.error('خطا در بستن DB', (e as Error).message);
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
