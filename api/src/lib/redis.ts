import Redis, { Cluster } from 'ioredis';

// ═══════════════════════════════════════════════════════════════════════
//  لایه‌ی Redis — آماده برای single-node و Cluster (مقیاس‌پذیری افقی)
//
//  چرا: در ۲۰۰هزار کاربر همزمان، یک نود Redis گلوگاه می‌شود (هر چک
//  rate-limit، قفل رزرو، و cache از آن عبور می‌کند). ioredis از حالت
//  Cluster پشتیبانی می‌کند که داده را روی چند نود shard می‌کند.
//
//  پیکربندی با env:
//   • تک‌نود:   REDIS_URL=redis://host:6379
//   • Cluster:  REDIS_CLUSTER_NODES=host1:6379,host2:6379,host3:6379
//     (اگر این تنظیم شود، حالت Cluster فعال می‌شود و REDIS_URL نادیده گرفته می‌شود)
//
//  ⚠️ نکته‌ی Cluster: کلیدهایی که باید با هم در یک تراکنش/اسکریپت Lua باشند
//     (مثل قفل رزرو) باید روی یک نود باشند. ioredis این را با hash-tag مدیریت
//     می‌کند: کلید `lock:{slot}` با آکولاد، تضمین می‌کند فقط بخش داخل {} برای
//     تعیین نود hash شود. قفل ما تک‌کلیدی است پس امن است.
// ═══════════════════════════════════════════════════════════════════════

const g = globalThis as unknown as { redis?: Redis | Cluster };

function makeRedis(): Redis | Cluster {
  const clusterNodes = process.env.REDIS_CLUSTER_NODES?.split(',').map(s => s.trim()).filter(Boolean);
  if (clusterNodes && clusterNodes.length > 0) {
    const nodes = clusterNodes.map(n => {
      const [host, port] = n.split(':');
      return { host, port: Number(port) || 6379 };
    });
    return new Cluster(nodes, {
      redisOptions: { maxRetriesPerRequest: 3 },
      // توزیع خواندن روی replicaها در صورت وجود (کاهش بار نود master)
      scaleReads: 'slave',
    });
  }
  return new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 3 });
}

export const redis = g.redis ?? makeRedis();
if (process.env.NODE_ENV !== 'production') g.redis = redis;

/** قفل کوتاه‌مدت رزرو — لایه اول جلوگیری از double-booking.
 *  از hash-tag {} استفاده می‌کنیم تا در حالت Cluster، کلید قفل روی یک نود پایدار بماند. */
export async function withSlotLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const token = crypto.randomUUID();
  const lockKey = `lock:{${key}}`; // hash-tag: فقط {key} برای تعیین نود hash می‌شود
  const ok = await redis.set(lockKey, token, 'PX', ttlMs, 'NX');
  if (!ok) throw (await import('./errors')).Err.lockTimeout();
  try { return await fn(); }
  finally {
    // فقط اگر هنوز مال خودمان است آزاد کن
    await redis.eval(
      `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`,
      1, lockKey, token,
    );
  }
}
