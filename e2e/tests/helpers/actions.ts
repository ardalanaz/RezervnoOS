import { Page, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════
//  Helperهای مشترکِ E2E — کارهای تکراری در یک جا
//  (اگر UI عوض شود، فقط اینجا به‌روزرسانی می‌شود — نه در هر تست)
// ═══════════════════════════════════════════════════════════

/** باز کردنِ اپ و صبر تا آماده شدنِ صفحه‌ی کشف. */
export async function gotoApp(page: Page) {
  await page.goto('/');
  // صفحه‌ی کشف باید فعال باشد
  await expect(page.locator('#page-discover')).toBeVisible();
}

/** بازکردنِ اولین رستوران از فید. */
export async function openFirstRestaurant(page: Page) {
  // کارت‌های واقعیِ رستوران onclick دارند؛ اسکلت‌های بارگذاری (div.rc) ندارند —
  // پس روی [onclick] فیلتر می‌کنیم تا تا آمدنِ کارتِ واقعی صبر شود، نه اسکلت.
  const firstCard = page.locator('.rc[onclick]').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
  // صفحه‌ی جزئیاتِ رستوران باید باز شود
  await expect(page.locator('#page-rest')).toBeVisible();
}

/** ورود کامل با شماره و کدِ OTP (کدِ dev از mock = 123456).
 *  شیتِ ورود را با openLogin باز می‌کند، شماره و کد را پر می‌کند و منتظرِ
 *  ورودِ موفق می‌ماند؛ سپس هر شیتِ بازمانده (فرمِ ثبت‌نام) را با Escape می‌بندد. */
export async function login(page: Page, phone = '09123456789') {
  await page.evaluate(() => (window as unknown as { openLogin: () => void }).openLogin());
  const phoneInput = page.locator('#loginPhone');
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill(phone);
  await page.getByRole('button', { name: /ارسال کد ورود/ }).click();

  const otp = page.locator('#otpCode');
  await expect(otp).toBeVisible();
  await otp.fill('123456');
  await page.getByRole('button', { name: /تأیید و ورود|تایید و ورود/ }).click();

  // بعد از verify، USER ست می‌شود (isLoggedIn=true) حتی اگر فرمِ ثبت‌نام باز بماند.
  await page.waitForFunction(
    () => (window as unknown as { isLoggedIn?: () => boolean }).isLoggedIn?.() === true,
    undefined,
    { timeout: 8000 },
  );
  await page.keyboard.press('Escape').catch(() => {});
}

/** رفتن به یک تبِ ناوبری.
 *  نکته: data-nav هم روی navِ پایین (موبایل) و هم navِ بالا (دسکتاپ) هست و فقط یکی
 *  در هر ویوپورت دیده می‌شود؛ با :visible همان قابل‌مشاهده را می‌زنیم تا strict-mode
 *  نشکند و روی هر دو ویوپورت کار کند. */
export async function navTo(page: Page, tab: 'discover' | 'favorites' | 'trips' | 'loyalty') {
  await page.locator(`[data-nav="${tab}"]:visible`).first().click();
  await expect(page.locator(`#page-${tab}`)).toBeVisible();
}

/** انتظار برای نمایشِ toast با متنِ مشخص. */
export async function expectToast(page: Page, text: string | RegExp) {
  const toast = page.locator('#toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(text);
}
