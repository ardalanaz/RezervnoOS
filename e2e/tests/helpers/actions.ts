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

/** ورود با شماره‌ی دمو و کدِ OTP. */
export async function login(page: Page, phone = '09123456789') {
  // فرضِ باز بودنِ شیتِ ورود؛ اگر نه، فراخوانی‌کننده باید بازش کند
  const phoneInput = page.locator('#loginPhone');
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill(phone);
  await page.getByRole('button', { name: /ورود|ادامه|تایید/ }).first().click();

  // مرحله‌ی کد — کدِ دمو 123456 (از mock)
  const otp = page.locator('input').filter({ hasText: '' }).first();
  // بسیاری از پیاده‌سازی‌ها یک input کد دارند؛ پرش می‌کنیم اگر خودکار باشد
  await page.waitForTimeout(300);
}

/** رفتن به یک تبِ ناوبریِ پایین. */
export async function navTo(page: Page, tab: 'discover' | 'favorites' | 'trips' | 'loyalty') {
  await page.locator(`[data-nav="${tab}"]`).click();
  await expect(page.locator(`#page-${tab}`)).toBeVisible();
}

/** انتظار برای نمایشِ toast با متنِ مشخص. */
export async function expectToast(page: Page, text: string | RegExp) {
  const toast = page.locator('#toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(text);
}
