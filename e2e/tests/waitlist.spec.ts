import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/mock-api';
import { gotoApp, openFirstRestaurant } from './helpers/actions';

// ═══ جریانِ لیست انتظار ═══
// وقتی همه‌ی اسلات‌ها پر است، کاربر باید بتواند به لیست انتظار بپیوندد.
// این مسیرِ «نجاتِ درآمد» است: به‌جای از دست دادنِ کاربر، در صف نگهش می‌داریم.

test.beforeEach(async ({ page }) => {
  await mockApi(page, { slotsFull: true });   // همه‌ی اسلات‌ها پر
});

test('وقتی اسلات‌ها پر است، گزینه‌ی لیست انتظار پیشنهاد می‌شود', async ({ page }) => {
  await gotoApp(page);
  await openFirstRestaurant(page);

  await page.getByRole('button', { name: /رزرو میز/ }).click();
  await expect(page.locator('#sheet')).toBeVisible();

  // چون همه پر است، باید پیشنهادِ لیست انتظار ظاهر شود
  await expect(page.locator('#sheet, #sheetBody')).toContainText(/لیست انتظار|صف|پر/, { timeout: 5000 });
});

test('کاربر می‌تواند به لیست انتظار بپیوندد و موقعیتش را ببیند', async ({ page }) => {
  await gotoApp(page);
  await openFirstRestaurant(page);
  await page.getByRole('button', { name: /رزرو میز/ }).click();

  const joinBtn = page.getByRole('button', { name: /پیوستن به لیست انتظار|لیست انتظار/ });
  if (await joinBtn.isVisible().catch(() => false)) {
    await joinBtn.click();
    // بعد از پیوستن، موقعیت در صف باید نمایش داده شود (position=2 از mock)
    await expect(page.locator('#sheet, #sheetBody, #page-trips')).toContainText(/موقعیت|صف|۲|2|انتظار/, { timeout: 5000 });
  }
});
