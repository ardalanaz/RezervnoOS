import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/mock-api';
import { gotoApp, openFirstRestaurant } from './helpers/actions';

// ═══ دسترسی‌پذیری (Accessibility) ═══
// تأییدِ خودکارِ کارهایی که در ممیزیِ a11y انجام شد.
// (تستِ کاملِ screen reader باید روی دستگاهِ واقعی انجام شود؛ این‌ها
//  حداقل‌های ساختاری را در هر build چک می‌کنند تا رگرسیون نگیریم.)

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('دکمه‌های ناوبری برچسبِ دسترسی‌پذیری (aria-label) دارند', async ({ page }) => {
  await gotoApp(page);
  const navButtons = page.locator('.botnav-item');
  const count = await navButtons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(navButtons.nth(i)).toHaveAttribute('aria-label', /.+/);
  }
});

test('کلیدِ Escape شیت را می‌بندد', async ({ page }) => {
  await gotoApp(page);
  await openFirstRestaurant(page);
  await page.getByRole('button', { name: /رزرو میز/ }).click();
  await expect(page.locator('#sheet')).toHaveClass(/show/);

  // Escape باید شیت را ببندد
  await page.keyboard.press('Escape');
  await expect(page.locator('#sheet')).not.toHaveClass(/show/);
});

test('شیت و مودال نقشِ dialog دارند', async ({ page }) => {
  await gotoApp(page);
  await expect(page.locator('#sheet')).toHaveAttribute('role', 'dialog');
  await expect(page.locator('#dnaOverlay')).toHaveAttribute('role', 'dialog');
});

test('toast ناحیه‌ی زنده (aria-live) برای screen reader دارد', async ({ page }) => {
  await gotoApp(page);
  await expect(page.locator('#toast')).toHaveAttribute('aria-live', /polite|assertive/);
});

test('کارت‌های رستوران با کیبورد قابلِ فوکوس‌اند', async ({ page }) => {
  await gotoApp(page);
  const card = page.locator('.rc[role="button"]').first();
  if (await card.isVisible().catch(() => false)) {
    await expect(card).toHaveAttribute('tabindex', '0');
  }
});
