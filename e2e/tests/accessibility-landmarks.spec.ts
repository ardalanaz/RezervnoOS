import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/mock-api';
import { gotoApp } from './helpers/actions';

// ═══════════════════════════════════════════════════════════
//  دسترسی‌پذیری — Landmarks / برچسب‌ها / رفتارِ دیالوگ (C18)
//  مکملِ accessibility.spec.ts: این‌جا ساختارِ سراسری (lang/dir، skip-link،
//  landmarkها، برچسبِ ناوبری) و رفتارِ کیبوردِ دیالوگ‌های جدید (Command Palette،
//  Notification Center) را در هر build چک می‌کنیم تا رگرسیونِ a11y نگیریم.
//  (تستِ کاملِ screen-reader باید روی دستگاهِ واقعی انجام شود.)
// ═══════════════════════════════════════════════════════════

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('صفحه زبان/جهتِ درست دارد (fa / rtl)', async ({ page }) => {
  await gotoApp(page);
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', /^fa/);
  await expect(html).toHaveAttribute('dir', 'rtl');
});

test('skip-link و landmarkِ main وجود دارند', async ({ page }) => {
  await gotoApp(page);
  const skip = page.locator('a.skip-link');
  await expect(skip).toHaveAttribute('href', '#app-main');
  await expect(skip).toHaveText(/.+/);
  // مقصدِ skip-link باید وجود داشته باشد و قابلِ فوکوس باشد
  const main = page.locator('#app-main');
  await expect(main).toHaveCount(1);
  await expect(main).toHaveAttribute('tabindex', '-1');
});

test('ناحیه‌های ناوبری برچسبِ دسترسی‌پذیری دارند', async ({ page }) => {
  await gotoApp(page);
  // نوارِ بالا و نوارِ پایین هر دو aria-label دارند
  const navs = page.locator('nav[aria-label]');
  expect(await navs.count()).toBeGreaterThanOrEqual(2);
  // دکمه‌های آیکنیِ نوارِ بالا (اعلان/جست‌وجو) باید نامِ دسترسی‌پذیر داشته باشند
  const iconBtns = page.locator('.nav-icn');
  const n = await iconBtns.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await expect(iconBtns.nth(i)).toHaveAttribute('aria-label', /.+/);
  }
});

test('Command Palette نقشِ dialog دارد و با Escape بسته می‌شود', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(() => (window as unknown as { openPalette?: () => void }).openPalette?.());
  const cmdk = page.locator('#cmdk');
  await expect(cmdk).toHaveClass(/show/);
  await expect(cmdk).toHaveAttribute('role', 'dialog');
  await expect(cmdk).toHaveAttribute('aria-modal', 'true');
  // هندلرِ Escapeِ پالت روی فیلدِ ورودی است — پس اول صبر تا فوکوس، بعد Escape
  await expect(page.locator('#cmdkInput')).toBeFocused();
  await page.locator('#cmdkInput').press('Escape');
  await expect(cmdk).not.toHaveClass(/show/);
});

test('Notification Center نقشِ dialog دارد و با Escape بسته می‌شود', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(() => (window as unknown as { openNotif?: () => void }).openNotif?.());
  const notif = page.locator('#notif');
  await expect(notif).toHaveClass(/show/);
  await expect(notif).toHaveAttribute('role', 'dialog');
  await expect(notif).toHaveAttribute('aria-modal', 'true');
  await page.keyboard.press('Escape');
  await expect(notif).not.toHaveClass(/show/);
});
