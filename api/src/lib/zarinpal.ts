import { createLogger } from './logger';
import { getZarinpalConfig } from './platform-settings';
import { Err } from './errors';

const log = createLogger('zarinpal');

// ⚠️ همگام‌سازی‌شده با DB زنده (migration 019_payments_deposit).
//
// درگاه زرین‌پال — نه Stripe (در ایران کار نمی‌کند). REST API نسخه‌ی ۴.
// merchant_id و sandbox از platform_settings خوانده می‌شوند (نه فقط env)
// تا owner بتواند از پنل شرکت بدون ری‌دیپلوی تنظیم کند.

function baseUrl(sandbox: boolean): string {
  return sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
}

export type RequestResult = { authority: string; redirectUrl: string };

/**
 * ساختِ یک تراکنشِ پرداخت. amountToman باید کل مبلغ به تومان باشد.
 * ⚠️ نکته‌ی حیاتی: اگر فیلد currency صریحاً 'IRT' نباشد، API زرین‌پال به‌صورت
 * پیش‌فرض amount را ریال تفسیر می‌کند — یعنی مبلغِ واقعاً دریافتی ۱/۱۰ِ
 * چیزی می‌شود که سیستم فکر می‌کند دریافت کرده (طبق مستندات رسمی زرین‌پال).
 */
export async function requestPayment(opts: {
  amountToman: number;
  description: string;
  callbackUrl: string;
  mobile?: string;
}): Promise<RequestResult> {
  const { merchantId, sandbox } = await getZarinpalConfig();
  if (!merchantId) throw Err.validation('merchant_id زرین‌پال تنظیم نشده — از پنل شرکت وارد کنید');

  const res = await fetch(`${baseUrl(sandbox)}/pg/v4/payment/request.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: merchantId,
      amount: opts.amountToman,
      currency: 'IRT', // صریحاً تومان — بدون این، API پیش‌فرض را ریال در نظر می‌گیرد (۱۰ برابر تفاوت!)
      description: opts.description,
      callback_url: opts.callbackUrl,
      metadata: opts.mobile ? { mobile: opts.mobile } : undefined,
    }),
  });
  const json = await res.json().catch(() => null);
  const authority: string | undefined = json?.data?.authority;
  const code: number | undefined = json?.data?.code;
  if (!res.ok || !authority || code !== 100) {
    log.error('درخواست پرداخت زرین‌پال ناموفق', { status: res.status, body: json });
    throw Err.validation('ایجاد تراکنش پرداخت ناموفق بود؛ دوباره تلاش کنید');
  }
  return { authority, redirectUrl: `${baseUrl(sandbox)}/pg/StartPay/${authority}` };
}

export type VerifyResult = { success: boolean; refId?: string; cardPan?: string };

/** تأیید تراکنش بعد از بازگشتِ کاربر از درگاه (callback). amountToman باید دقیقاً همان مبلغِ درخواستِ اولیه باشد. */
export async function verifyPayment(opts: { authority: string; amountToman: number }): Promise<VerifyResult> {
  const { merchantId, sandbox } = await getZarinpalConfig();
  if (!merchantId) throw Err.validation('merchant_id زرین‌پال تنظیم نشده');

  const res = await fetch(`${baseUrl(sandbox)}/pg/v4/payment/verify.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchant_id: merchantId, amount: opts.amountToman, currency: 'IRT', authority: opts.authority }),
  });
  const json = await res.json().catch(() => null);
  const code: number | undefined = json?.data?.code;
  // 100 = تأیید موفق تازه؛ 101 = قبلاً verify شده (idempotent — نباید خطا حساب شود)
  if (code === 100 || code === 101) {
    return { success: true, refId: String(json.data.ref_id ?? ''), cardPan: json.data.card_pan };
  }
  log.warn('تأیید پرداخت زرین‌پال ناموفق', { code, body: json });
  return { success: false };
}
