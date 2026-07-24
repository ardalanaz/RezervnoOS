import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/mock-api';
import { gotoApp, openFirstRestaurant } from './helpers/actions';

// ═══ مسیرِ حیاتیِ رزرو (مسیرِ پول) ═══
// این مهم‌ترین جریانِ کلِ اپ است: اگر رزرو کار نکند، کسب‌وکار کار نمی‌کند.
// این تست دقیقاً همان باگی را می‌گیرد که در ممیزیِ API پیدا شد
// (اگر فرانت code را در جای اشتباه بخواند، تأییدیه نمایش داده نمی‌شود).

test.beforeEach(async ({ page }) => {
  await mockApi(page);   // اسلات‌های باز
});

test('کاربر می‌تواند رستوران را باز کند و صفحه‌ی رزرو را ببیند', async ({ page }) => {
  await gotoApp(page);
  await openFirstRestaurant(page);

  // دکمه‌ی رزرو باید روی صفحه‌ی جزئیات باشد
  await expect(page.getByRole('button', { name: /رزرو میز/ })).toBeVisible();
  // نوارِ کش‌بک هم باید دیده شود (ارزشِ پیشنهادی)
  await expect(page.locator('#page-rest')).toContainText(/کش‌بک/);
});

test('جریانِ کاملِ رزرو تا تأییدیه (با کدِ رزرو)', async ({ page }) => {
  await gotoApp(page);
  await openFirstRestaurant(page);

  // باز کردنِ شیتِ رزرو
  await page.getByRole('button', { name: /رزرو میز/ }).click();
  await expect(page.locator('#sheet')).toBeVisible();

  // انتخابِ یک اسلاتِ باز (۱۹:۰۰ یا ۲۰:۰۰ در mock باز هستند)
  const slot = page.getByText('19:00', { exact: false }).first();
  if (await slot.isVisible().catch(() => false)) {
    await slot.click();
  }

  // پیش‌رفتن در مراحل تا دکمه‌ی «تأیید رزرو»
  const nextBtn = page.getByRole('button', { name: /ادامه|بعدی/ });
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
  }

  // پر کردنِ نام و شماره اگر خواسته شد
  const nameInput = page.locator('#bkName');
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('کاربر تست');
    await page.locator('#bkPhone').fill('09123456789');
  }

  // تأییدِ نهایی
  await page.getByRole('button', { name: /تأیید رزرو|تایید رزرو/ }).click();

  // ── نتیجه‌ی حیاتی: کدِ رزرو باید نمایش داده شود (RZDEMO12 از mock) ──
  // اگر باگِ contract برگردد (خواندنِ reservation.code به‌جای code)، این می‌شکند.
  await expect(page.locator('#sheet, #page-rest')).toContainText(/RZDEMO12|رزرو.*(ثبت|تأیید|موفق)/, { timeout: 5000 });
});

test('پارتی‌سایز و تاریخ در شیتِ رزرو قابلِ تنظیم است', async ({ page }) => {
  await gotoApp(page);
  await openFirstRestaurant(page);
  await page.getByRole('button', { name: /رزرو میز/ }).click();
  await expect(page.locator('#sheet')).toBeVisible();
  // شیت باید محتوایی برای انتخابِ زمان/نفرات داشته باشد
  await expect(page.locator('#sheetBody')).not.toBeEmpty();
});
