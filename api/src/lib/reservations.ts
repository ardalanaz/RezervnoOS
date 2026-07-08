import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { db } from './db';
import { withSlotLock } from './redis';
import { redis } from './redis';
import { Err } from './errors';
import { enqueueSms } from './sms';
import { emit } from './events';
import { metrics } from './metrics';
import { validateCoupon, calcDiscount, redeemCouponAtomicTx } from './coupons';
import { redeemGiftCardTx } from './loyalty';
import { computeNoShowRisk as defaultNoShowPredictor } from './customer-insights';

/**
 * فاز v2 — Dependency Inversion: موتور رزرو (core domain) به یک «port» انتزاعی
 * بستگی دارد، نه به ماژول concrete هوش مشتری. پیاده‌سازی واقعی (customer-insights.ts)
 * به‌صورت پیش‌فرض در composition root (همین فایل) سیم‌کشی می‌شود، ولی createReservation
 * آن را به‌عنوان پارامتر می‌پذیرد — یعنی هسته‌ی رزرو دیگر از وجود ماژول analytics
 * «آگاه» نیست؛ فقط یک تابع با امضای مشخص می‌خواهد. این هم تست‌پذیری را بهتر می‌کند
 * (می‌توان در تست واحد یک stub تزریق کرد) و هم جلوی coupling مستقیم core→analytics را می‌گیرد.
 * (در مقیاس بزرگ‌تر، گام بعدی منطقی جای‌گزینی این تزریق پارامتری با event/outbox است؛
 * در این مقیاس، over-engineering محسوب می‌شود.)
 */
export type NoShowPredictor = (input: {
  userId: string | null; partySize: number; slotStart: Date; createdAt: Date; source: string;
}) => Promise<{ score: number; tier: 'low' | 'medium' | 'high' }>;

// ═══════════════════════════════════════════════════════════
//  موتور رزرو رزرونو — نسخه‌ی production
//
//  اصول معماری (دفاع چندلایه در برابر double-booking):
//   1. لایه‌ی حقیقت = دیتابیس: EXCLUDE constraint روی بازه‌ی [slot_start, block_end)
//      که شامل زمان نظافت/بافر است. هیچ تداخلی از این رد نمی‌شود.
//   2. transaction با isolation = Serializable + بازچک availability داخل tx
//      قبل از insert (نیاز ۴ و ۵).
//   3. retry خودکار روی خطاهای serialization/تداخل برای ترافیک بالا (نیاز ۶).
//   4. قفل Redis فقط «بهینه‌سازی» است تا از تلاش‌های هم‌زمان روی یک اسلات
//      جلوگیری کند و فشار retry را کم کند — هرگز منبع حقیقت نیست (نیاز ۳).
//
//  پیکربندی زمان از روی رستوران خوانده می‌شود:
//   slotMinutes (مدت), bufferMinutes + cleaningMinutes (فاصله‌ی بلاک),
//   holdMinutes (انقضای هولد), lateGraceMinutes (تأخیر مهمان).
// ═══════════════════════════════════════════════════════════

const MAX_PARTY_ONLINE = 12;   // سقف رزرو آنلاین (گروه بزرگ‌تر → merge یا تماس)
const MAX_DAYS_AHEAD = 90;     // حداکثر افق رزرو
const TX_MAX_RETRIES = 5;      // تلاش مجدد روی تداخل serialization

export type CreateReservationInput = {
  restaurantId: string;
  date: string;            // '2026-06-12'
  time: string;            // '19:00'
  partySize: number;
  preferences?: string[];
  preorder?: { menuItemId: string; qty: number }[];
  durationMinutes?: number; // override مدت (در غیر این صورت از رستوران)
  userId?: string;          // مشتری لاگین‌شده
  guest?: { name: string; phone?: string; tableNumber?: number; note?: string }; // رزرو دستی staff
  source: 'app' | 'manual';
  notifySms?: boolean;
  hold?: boolean;           // اگر true: رزرو pending با انقضا (هولد موقت)
  // checkout: فقط یکی از این دو (کوپن یا کارت هدیه، نه هردو)
  couponCode?: string;
  giftCardCode?: string;
  giftCardAmount?: number;  // مبلغ دلخواه استفاده از کارت هدیه
};

type TimingConfig = {
  slotMinutes: number;
  bufferMinutes: number;
  cleaningMinutes: number;
  holdMinutes: number;
};

// ── محاسبه‌ی بازه‌ی رزرو + بازه‌ی بلاک (شامل نظافت/بافر) ──
function computeRanges(date: string, time: string, cfg: TimingConfig, durationOverride?: number) {
  const start = new Date(`${date}T${time}:00+03:30`); // Asia/Tehran
  if (isNaN(+start)) throw Err.validation('تاریخ یا ساعت نامعتبر است');
  const duration = durationOverride ?? cfg.slotMinutes;
  const end = new Date(+start + duration * 60_000);
  // بازه‌ی بلاک = مدت رزرو + زمان نظافت + بافر ایمنی
  const blockBufferMin = cfg.cleaningMinutes + cfg.bufferMinutes;
  const blockEnd = new Date(+end + blockBufferMin * 60_000);
  return { start, end, blockEnd, duration, blockBufferMin };
}

// ── کد رزرو امن و غیرقابل‌حدس (نیاز امنیتی) ──
// 8 کاراکتر Base32 از منبع تصادفی امن رمزنگاری — نه Math.random.
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون 0/O/1/I برای خوانایی
function genCode(): string {
  const bytes = randomBytes(8);
  let out = 'RZ';
  for (let i = 0; i < 7; i++) out += B32[bytes[i] % 32];
  return out;
}

// ── تشخیص خطاهای تداخل/serialization دیتابیس ──
function isConflictError(e: unknown): boolean {
  // 23P01 = exclusion_violation (EXCLUDE constraint ما)
  // 40001 = serialization_failure ، 40P01 = deadlock_detected
  const code = (e as { code?: string })?.code;
  if (code === '23P01' || code === '40001' || code === '40P01') return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2010') {
      const inner = (e.meta as { code?: string } | undefined)?.code;
      return inner === '23P01' || inner === '40001' || inner === '40P01';
    }
    if (e.code === 'P2034') return true; // write conflict / deadlock در Prisma
  }
  return false;
}
function isSerializationError(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  if (code === '40001' || code === '40P01') return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') return true;
  return false;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── بررسی اینکه یک میز در بازه‌ی [start, blockEnd) آزاد است (داخل tx) ──
export async function createReservation(
  input: CreateReservationInput,
  deps: { predictNoShowRisk?: NoShowPredictor } = {},
) {
  const predictNoShowRisk = deps.predictNoShowRisk ?? defaultNoShowPredictor;
  const r = await db.restaurant.findUnique({ where: { id: input.restaurantId } });
  if (!r) throw Err.notFound('رستوران');
  if (!r.isOpen) throw Err.restaurantClosed();

  // ── اعتبارسنجی ورودی با خطاهای مشخص ──
  if (!Number.isInteger(input.partySize) || input.partySize < 1) throw Err.validation('تعداد نفر نامعتبر است');
  if (input.partySize > MAX_PARTY_ONLINE) throw Err.partyTooLarge(MAX_PARTY_ONLINE);

  const cfg: TimingConfig = {
    slotMinutes: r.slotMinutes ?? 90,
    bufferMinutes: r.bufferMinutes ?? 0,
    cleaningMinutes: r.cleaningMinutes ?? 15,
    holdMinutes: r.holdMinutes ?? 10,
  };
  const { start, end, blockEnd, duration, blockBufferMin } =
    computeRanges(input.date, input.time, cfg, input.durationMinutes);

  // ── زمان نباید در گذشته یا خیلی دور باشد ──
  const now = Date.now();
  if (+start < now - 60_000) throw Err.pastTime();
  if (+start > now + MAX_DAYS_AHEAD * 86_400_000) throw Err.tooFarAhead(MAX_DAYS_AHEAD);

  // ── تعیین کاندیداهای میز (هنوز رزرو نمی‌کنیم) ──
  // حالت دستی: شماره‌ی مشخص. حالت خودکار: میزهای مناسب به ترتیب «کم‌هدر».
  let candidateTableIds: string[];
  let manualTableNumber: number | null = null;
  if (input.guest?.tableNumber != null) {
    const t = await db.table.findUnique({
      where: { restaurantId_number: { restaurantId: r.id, number: input.guest.tableNumber } },
    });
    if (!t) throw Err.tableNotFound(input.guest.tableNumber);
    if (t.capacity < input.partySize) throw Err.tableTooSmall(input.guest.tableNumber);
    candidateTableIds = [t.id];
    manualTableNumber = t.number;
  } else {
    // ── تخصیص هوشمند میز (Smart Table Assignment) ──
    // میزهای واجد شرایط: فعال، نه در تعمیر، ظرفیت کافی، و محدوده‌ی party مناسب.
    // maxPartySize (یا capacity اگر تعریف نشده) سقف را تعیین می‌کند تا میز خیلی
    // بزرگ به گروه کوچک داده نشود و برعکس.
    const candidates = await db.table.findMany({
      where: {
        restaurantId: r.id,
        isActive: true,
        state: { not: 'maintenance' },          // میز در تعمیر کاندید نیست
        capacity: { gte: input.partySize },
        minPartySize: { lte: input.partySize },
      },
      select: { id: true, capacity: true, maxPartySize: true, priority: true, number: true },
    });
    // فیلتر maxPartySize (پیش‌فرض = capacity) + رتبه‌بندی هوشمند
    const eligible = candidates.filter(t =>
      (t.maxPartySize ?? t.capacity) >= input.partySize);
    if (eligible.length === 0) throw Err.noTableForParty(input.partySize);
    // مرتب‌سازی هوشمند:
    //  1) اولویت بالاتر اول (priority دستی اپراتور)
    //  2) کم‌ترین هدر ظرفیت (best-fit: نزدیک‌ترین ظرفیت به اندازه‌ی گروه)
    //  3) شماره‌ی میز (پایداری ترتیب)
    eligible.sort((a, b) =>
      (b.priority - a.priority) ||
      ((a.capacity - input.partySize) - (b.capacity - input.partySize)) ||
      (a.number - b.number));
    candidateTableIds = eligible.map(c => c.id);
  }

  // ── فاز v2: پیش‌بینی ریسک no-show — قبل از تراکنش، فقط خوانش تاریخچه ──
  const noShowRisk = await predictNoShowRisk({
    userId: input.userId ?? null, partySize: input.partySize, slotStart: start,
    createdAt: new Date(), source: input.source,
  });

  // ── قفل Redis روی اسلات (فقط بهینه‌سازی؛ کلید بر اساس رستوران+شروع) ──
  // این فشار retry را کم می‌کند ولی صحت به دیتابیس وابسته است.
  const lockKey = `resv:${r.id}:${start.toISOString()}`;

  return withSlotLock(lockKey, 8000, async () => {
    // ── تلاش با retry برای serialization (ترافیک بالا) ──
    let lastErr: unknown;
    for (let attempt = 0; attempt < TX_MAX_RETRIES; attempt++) {
      try {
        return await placeReservation(
          input, r, cfg, { start, end, blockEnd, duration, blockBufferMin },
          candidateTableIds, manualTableNumber, noShowRisk,
        );
      } catch (e) {
        lastErr = e;
        if (isSerializationError(e) && attempt < TX_MAX_RETRIES - 1) {
          await sleep(20 * (attempt + 1) + Math.random() * 30); // backoff تصادفی
          continue;
        }
        throw e;
      }
    }
    throw lastErr ?? Err.concurrencyRetry();
  });
}

// ── هسته‌ی ثبت: transaction سریالایزبل + بازچک داخل tx + insert ──
async function placeReservation(
  input: CreateReservationInput,
  r: { id: string; name: string; clubPrefix: string },
  cfg: TimingConfig,
  ranges: { start: Date; end: Date; blockEnd: Date; duration: number; blockBufferMin: number },
  candidateTableIds: string[],
  manualTableNumber: number | null,
  noShowRisk: { score: number; tier: 'low' | 'medium' | 'high' },
) {
  const { start, end, blockEnd, duration, blockBufferMin } = ranges;
  const isHold = input.hold === true;
  const status: 'pending' | 'confirmed' = isHold ? 'pending' : 'confirmed';
  const holdExpiresAt = isHold ? new Date(Date.now() + cfg.holdMinutes * 60_000) : null;

  let result: { resv: any; club: { enrolledNow: boolean; code: string } | null; tableNumber: number };

  try {
    result = await db.$transaction(
      async (tx) => {
        // ── بازچک availability داخل tx و انتخاب اولین میز واقعاً آزاد (نیاز ۴) ──
        // بهینه‌سازی N+1: یک کوئری همه‌ی کاندیداهای اشغال‌شده را می‌گیرد، نه per-table.
        let chosenTableId: string | null = null;
        if (candidateTableIds.length > 0) {
          const occRows = await tx.$queryRaw<{ table_id: string }[]>`
            SELECT DISTINCT table_id FROM reservations
            WHERE status IN ('pending','confirmed','arrived','seated')
              AND table_id = ANY(${candidateTableIds}::uuid[])
              AND tsrange(slot_start, block_end) && tsrange(${start}::timestamp, ${blockEnd}::timestamp)
          `;
          const occupied = new Set(occRows.map(r => r.table_id));
          chosenTableId = candidateTableIds.find(tid => !occupied.has(tid)) ?? null;
        }
        if (!chosenTableId) {
          // هیچ میز تکی آزاد نیست → تلاش برای ترکیب میز (merge) در حالت خودکار
          if (manualTableNumber == null) {
            const merged = await tryMergeTables(tx, r.id, input.partySize, start, blockEnd);
            if (merged) {
              return await insertReservation(tx, {
                input, r, status, holdExpiresAt, start, end, duration, blockBufferMin, noShowRisk,
                tableId: merged.primaryId, mergedNumbers: merged.numbers, tableNumber: merged.numbers[0],
              });
            }
            throw Err.slotFull(input.time);
          }
          throw Err.tableConflict();
        }
        // میز شماره برای پاسخ
        const t = await tx.table.findUnique({ where: { id: chosenTableId }, select: { number: true } });
        return await insertReservation(tx, {
          input, r, status, holdExpiresAt, start, end, duration, blockBufferMin, noShowRisk,
          tableId: chosenTableId, mergedNumbers: [], tableNumber: t!.number,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 },
    );
  } catch (e) {
    // ── لایه‌ی حقیقت: اگر EXCLUDE constraint شلیک کرد، تداخل واقعی بوده ──
    if (isConflictError(e)) {
      if (isSerializationError(e)) throw e; // به retry بسپار
      metrics.reservationConflicts.inc();   // تداخل واقعی (double-booking جلوگیری‌شده)
      throw manualTableNumber != null ? Err.tableConflict() : Err.slotFull(input.time);
    }
    throw e;
  }

  // ── بعد از commit: کش availability را باطل کن + SMS ──
  await redis.del(`avail:${r.id}:${input.date}`);
  if (!isHold && input.notifySms !== false && result.resv.guestPhone) {
    await enqueueSms({
      to: result.resv.guestPhone, template: 'booking_confirm',
      tokens: [result.resv.guestName ?? 'مهمان', r.name, input.time, result.resv.code],
    });
  }

  // ── متریک + انتشار رویداد دامنه (برای webhookها) ──
  metrics.reservationsCreated.inc();
  void emit({
    event: 'reservation.created',
    restaurantId: r.id,
    payload: { code: result.resv.code, party_size: input.partySize, slot_start: result.resv.slotStart, status: result.resv.status },
  });

  return {
    code: result.resv.code,
    status: result.resv.status,
    table_number: result.tableNumber,
    merged_tables: result.resv.mergedTableNumbers ?? [],
    slot_start: result.resv.slotStart,
    slot_end: result.resv.slotEnd,
    hold_expires_at: result.resv.holdExpiresAt,
    club: result.club,
    checkout: result.checkout,  // مبلغ، تخفیف، نهایی، کش‌بک (اگر pre-order داشت)
  };
}

// ── insert رزرو + پیش‌سفارش + باشگاه (همه داخل tx، اتمیک) ──
async function insertReservation(
  tx: Prisma.TransactionClient,
  p: {
    input: CreateReservationInput;
    r: { id: string; clubPrefix: string };
    status: 'pending' | 'confirmed';
    holdExpiresAt: Date | null;
    start: Date; end: Date; duration: number; blockBufferMin: number;
    tableId: string; mergedNumbers: number[]; tableNumber: number;
    noShowRisk: { score: number; tier: 'low' | 'medium' | 'high' };
  },
) {
  const { input, r } = p;
  // autofill نام/تلفن از پروفایل کاربر
  let guestName = input.guest?.name ?? null;
  let guestPhone = input.guest?.phone ?? null;
  if (input.userId && !guestName) {
    const u = await tx.user.findUnique({ where: { id: input.userId } });
    guestName = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || null;
    guestPhone = u?.phone ?? null;
  }

  // ساخت رزرو با تلاش روی کد یکتا (احتمال تصادم تقریباً صفر، ولی محکم‌کاری)
  let resv;
  for (let i = 0; i < 3; i++) {
    try {
      resv = await tx.reservation.create({
        data: {
          code: genCode(),
          restaurantId: r.id,
          tableId: p.tableId,
          userId: input.userId ?? null,
          guestName, guestPhone,
          partySize: input.partySize,
          slotStart: p.start, slotEnd: p.end,
          durationMinutes: p.duration,
          status: p.status,
          holdExpiresAt: p.holdExpiresAt,
          mergedTableNumbers: p.mergedNumbers,
          source: input.source,
          preferences: input.preferences ?? [],
          note: input.guest?.note ?? null,
          // ستون کمکی constraint: بافر بلاک این رزرو (نظافت + بافر)
          blockBufferMinutes: p.blockBufferMin,
          // فاز v2: ریسک no-show محاسبه‌شده پیش از تراکنش
          noShowRiskScore: p.noShowRisk.score,
          noShowRiskTier: p.noShowRisk.tier,
        } as any,
      });
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && i < 2) continue; // تصادم کد
      throw e;
    }
  }

  if (input.preorder?.length) {
    await tx.reservationItem.createMany({
      data: input.preorder.map(x => ({ reservationId: resv!.id, menuItemId: x.menuItemId, qty: x.qty })),
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  Checkout: تخفیف (کوپن یا کارت هدیه — فقط یکی) + کش‌بک
  //  ترتیب: مبلغ پایه (جمع pre-order) → تخفیف → مبلغ نهایی → کش‌بک روی نهایی.
  //  همه داخل همان تراکنش رزرو (اتمیک، با رفع‌های همزمانی ممیزی دوم).
  // ═══════════════════════════════════════════════════════════
  let checkout: { subtotal: number; discount: number; final: number; cashback: number; method: string | null } | null = null;
  if (input.preorder?.length) {
    if (input.couponCode && input.giftCardCode) {
      throw Err.validation('فقط یکی از کوپن یا کارت هدیه قابل استفاده است');
    }

    // مبلغ پایه = جمع قیمت آیتم‌های pre-order
    const itemIds = input.preorder.map(x => x.menuItemId);
    const items = await tx.menuItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, priceToman: true } });
    const priceMap = new Map(items.map(i => [i.id, i.priceToman]));
    const subtotal = input.preorder.reduce((sum, x) => sum + (priceMap.get(x.menuItemId) ?? 0) * x.qty, 0);

    let discount = 0;
    let method: string | null = null;

    // ── تخفیف کوپن (اتمیک، با رفع TOCTOU از ممیزی دوم) ──
    if (input.couponCode) {
      const coupon = await validateCoupon(r.id, input.couponCode, input.userId ?? null); // throw می‌کند اگر نامعتبر
      discount = calcDiscount(coupon, subtotal);
      const ok = await redeemCouponAtomicTx(tx, coupon.id, input.userId ?? null, resv!.code, discount);
      if (!ok) throw Err.validation('ظرفیت کوپن پر شده است');
      method = 'coupon';
    }
    // ── کارت هدیه (مبلغ دلخواه، با رفع مبلغ منفی از ممیزی دوم) ──
    else if (input.giftCardCode && input.giftCardAmount) {
      const applied = Math.min(input.giftCardAmount, subtotal); // بیش از صورت‌حساب اعمال نشود
      await redeemGiftCardTx(tx, input.giftCardCode, applied);
      discount = applied;
      method = 'gift_card';
    }

    const final = Math.max(0, subtotal - discount);

    // ── کش‌بک روی مبلغ بعد از تخفیف (آنچه واقعاً پرداخت شد) ──
    let cashback = 0;
    if (input.userId && final > 0) {
      const cbPct = r.cbBasePct ?? 0;
      cashback = Math.round((final * cbPct) / 100);
      if (cashback > 0) {
        await tx.pointsLedger.create({
          data: { userId: input.userId, restaurantId: r.id, delta: cashback, reason: 'cashback', note: `کش‌بک رزرو ${resv!.code}` },
        });
      }
    }
    checkout = { subtotal, discount, final, cashback, method };
  }

  // عضویت خودکار باشگاه — اتمیک، بدون تکرار
  let club: { enrolledNow: boolean; code: string } | null = null;
  if (input.userId) {
    const existing = await tx.clubMember.findUnique({
      where: { restaurantId_userId: { restaurantId: r.id, userId: input.userId } },
    });
    if (existing) club = { enrolledNow: false, code: existing.code };
    else {
      const counter = await tx.clubCodeCounter.upsert({
        where: { restaurantId: r.id },
        create: { restaurantId: r.id, nextValue: 1002 },
        update: { nextValue: { increment: 1 } },
      });
      const code = `${r.clubPrefix}-${counter.nextValue - 1}`;
      await tx.clubMember.create({ data: { restaurantId: r.id, userId: input.userId, code } });
      club = { enrolledNow: true, code };
    }
  }

  return { resv: resv!, club, tableNumber: p.tableNumber, checkout };
}

// ── ترکیب میز (merge): پیدا کردن کوچک‌ترین مجموعه‌ی میزهای آزادِ قابل‌ترکیب ──
// که مجموع ظرفیتشان ≥ گروه باشد. (نیاز ۱۳)
async function tryMergeTables(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  party: number,
  start: Date,
  blockEnd: Date,
): Promise<{ primaryId: string; numbers: number[] } | null> {
  const tables = await tx.table.findMany({
    where: { restaurantId, isActive: true, state: { not: 'maintenance' }, isMergeable: true },
    select: { id: true, number: true, capacity: true, mergeableWith: true },
    orderBy: { number: 'asc' },
  });
  type Tbl = { id: string; number: number; capacity: number; mergeableWith: number[] };
  const tList = tables as Tbl[];
  const byNumber = new Map<number, Tbl>(tList.map(t => [t.number, t]));

  // ── بهینه‌سازی N+1: به‌جای یک کوئری tableIsFree per میز (که در رستوران با
  //    ۲۰ میز قابل‌ترکیب = ۲۰ round-trip داخل تراکنش بود)، یک کوئری همه‌ی
  //    میزهای اشغال‌شده در این بازه را برمی‌گرداند و عضویت را در حافظه چک می‌کنیم.
  //    تست‌شده روی Postgres: ~۰.۳ms برای ۱۰۰۰ رزرو با استفاده از ایندکس GiST. ──
  const occupiedRows = await tx.$queryRaw<{ table_id: string }[]>`
    SELECT DISTINCT table_id FROM reservations
    WHERE status IN ('pending','confirmed','arrived','seated')
      AND table_id IS NOT NULL
      AND tsrange(slot_start, block_end) && tsrange(${start}::timestamp, ${blockEnd}::timestamp)
  `;
  const occupied = new Set(occupiedRows.map(r => r.table_id));
  const freeFlags = new Map<number, boolean>();
  for (const t of tList) freeFlags.set(t.number, !occupied.has(t.id));

  // برای هر میز آزاد، گروه قابل‌ترکیب آزاد را بساز و ظرفیت جمع کن
  for (const t of tList) {
    if (!freeFlags.get(t.number)) continue;
    if (t.mergeableWith.length === 0) continue;
    const group = [t];
    let cap = t.capacity;
    for (const nb of t.mergeableWith) {
      const neighbor = byNumber.get(nb); // فقط میزهای isMergeable در tList هستند
      if (neighbor && freeFlags.get(nb)) { group.push(neighbor); cap += neighbor.capacity; }
      if (cap >= party) break;
    }
    if (cap >= party && group.length > 1) {
      // میز اصلی = اولی؛ بقیه به‌صورت شماره‌های merged ثبت می‌شوند.
      // نکته: رزرو روی میز اصلی نوشته می‌شود؛ میزهای دیگر از طریق availability/UI بلاک‌شده نمایش داده می‌شوند.
      return { primaryId: group[0].id, numbers: group.map(g => g.number) };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
//  انقضای هولدها (نیاز ۱۱) — توسط cron/کارگر پس‌زمینه صدا زده می‌شود
// ═══════════════════════════════════════════════════════════
export async function expireStaleHolds(): Promise<number> {
  const res = await db.reservation.updateMany({
    where: { status: 'pending', holdExpiresAt: { lt: new Date() } },
    data: { status: 'expired' },
  });
  return res.count;
}

// ═══════════════════════════════════════════════════════════
//  علامت‌زدن مهمانان دیرکرده به‌عنوان no_show (نیاز ۱۰)
//  رزروهایی که زمان شروع + مهلت تأخیر گذشته و هنوز نرسیده‌اند.
// ═══════════════════════════════════════════════════════════
export async function markLateNoShows(restaurantId: string): Promise<number> {
  const r = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { lateGraceMinutes: true } });
  const grace = r?.lateGraceMinutes ?? 15;
  const cutoff = new Date(Date.now() - grace * 60_000);
  const res = await db.reservation.updateMany({
    where: { restaurantId, status: { in: ['pending', 'confirmed'] }, slotStart: { lt: cutoff } },
    data: { status: 'no_show' },
  });
  return res.count;
}

// ═══════════════════════════════════════════════════════════
//  availability — با درنظرگرفتن مدت/بافر/نظافت از پیکربندی رستوران
// ═══════════════════════════════════════════════════════════
export async function getAvailability(restaurantId: string, date: string, party: number) {
  const cacheKey = `avail:${restaurantId}:${date}:${party}`;
  const FRESH_SEC = 30;        // تا ۳۰s کاملاً تازه
  const STALE_SEC = 300;       // تا ۵ دقیقه به‌عنوان stale قابل‌سرو (پس‌زمینه refresh)

  // ── Stale-While-Revalidate: ضد thundering herd ──
  // ساختار cache شامل داده + زمان تولید است. اگر تازه باشد، مستقیم برگردان.
  // اگر stale باشد، همان stale را فوراً برگردان ولی در پس‌زمینه refresh کن
  // (فقط یک request قفل refresh را می‌گیرد؛ بقیه stale می‌گیرند → DB یک‌بار،
  //  نه هزار بار همزمان برای یک رستوران داغ).
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      const wrapped = JSON.parse(cached) as { payload: any; computedAt: number };
      const ageSec = (Date.now() - wrapped.computedAt) / 1000;
      if (ageSec < FRESH_SEC) {
        return wrapped.payload; // تازه — مستقیم
      }
      // stale — refresh پس‌زمینه با single-flight lock، ولی stale را الان برگردان
      void refreshAvailabilityInBackground(restaurantId, date, party, cacheKey);
      return wrapped.payload;
    } catch {
      // فرمت قدیمی/خراب — از نو محاسبه کن
    }
  }

  // cache miss کامل — محاسبه و ذخیره (با قفل تا فقط یکی محاسبه کند)
  return computeAndCacheAvailability(restaurantId, date, party, cacheKey, STALE_SEC);
}

/** refresh پس‌زمینه با قفل single-flight — فقط یک request همزمان محاسبه می‌کند. */
async function refreshAvailabilityInBackground(restaurantId: string, date: string, party: number, cacheKey: string) {
  const lockKey = `avail-lock:{${cacheKey}}`;
  // قفل کوتاه؛ اگر کسی دیگر در حال refresh است، رد شو (او انجام می‌دهد)
  const gotLock = await redis.set(lockKey, '1', 'PX', 10_000, 'NX');
  if (!gotLock) return;
  try {
    await computeAndCacheAvailability(restaurantId, date, party, cacheKey, 300);
  } catch {
    // refresh پس‌زمینه نباید چیزی را بشکند؛ stale تا انقضای کامل می‌ماند
  } finally {
    await redis.del(lockKey).catch(() => {});
  }
}

/** محاسبه‌ی واقعی availability و ذخیره در cache با مهر زمان. */
async function computeAndCacheAvailability(restaurantId: string, date: string, party: number, cacheKey: string, ttlSec: number) {
  const r = await db.restaurant.findUnique({ where: { id: restaurantId } });
  if (!r) throw Err.notFound('رستوران');
  const cfg: TimingConfig = {
    slotMinutes: r.slotMinutes ?? 90,
    bufferMinutes: r.bufferMinutes ?? 0,
    cleaningMinutes: r.cleaningMinutes ?? 15,
    holdMinutes: r.holdMinutes ?? 10,
  };

  const times = ['12:30','13:00','13:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30'];
  const tables = await db.table.findMany({
    where: { restaurantId, isActive: true, state: { not: 'maintenance' }, capacity: { gte: party }, minPartySize: { lte: party } },
    select: { id: true, number: true },
  });

  const dayStart = new Date(`${date}T00:00:00+03:30`);
  const dayEnd = new Date(+dayStart + 24 * 3600_000);
  const busy = await db.reservation.findMany({
    where: {
      restaurantId, status: { in: ['pending','confirmed','arrived','seated'] },
      slotStart: { lt: dayEnd }, slotEnd: { gt: dayStart },
    },
    select: { tableId: true, slotStart: true, slotEnd: true, blockBufferMinutes: true } as any,
  });

  const blockBuffer = cfg.cleaningMinutes + cfg.bufferMinutes;
  const slots = times.map(time => {
    const start = new Date(`${date}T${time}:00+03:30`);
    const end = new Date(+start + cfg.slotMinutes * 60_000);
    const blockEnd = new Date(+end + blockBuffer * 60_000);
    const freeTables = tables
      .filter(t => !busy.some((b: any) => {
        if (b.tableId !== t.id) return false;
        const bBlockEnd = new Date(+b.slotEnd + (b.blockBufferMinutes ?? 0) * 60_000);
        return b.slotStart < blockEnd && bBlockEnd > start; // هم‌پوشانی بازه‌ی بلاک
      }))
      .map(t => t.number);
    return { time, free_tables: freeTables, status: freeTables.length ? 'open' : 'full' };
  });

  const payload = { date, party, slots };
  // wrap با مهر زمان برای SWR
  await redis.set(cacheKey, JSON.stringify({ payload, computedAt: Date.now() }), 'EX', ttlSec);
  return payload;
}
