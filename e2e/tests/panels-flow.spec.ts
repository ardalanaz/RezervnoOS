import { test, expect, type Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════
//  e2e رفتاریِ پنلِ کسب‌وکار (business) — ورودِ staff → بازِ پنل
//  فراتر از اسموک: جریانِ واقعیِ ورود (شماره → کد → enterPanel) را درایو می‌کند و
//  تأیید می‌کند که پنل باز می‌شود و صفحه‌ی داشبورد (overview) فعال می‌شود.
//  بک‌اند mock می‌شود (staff-auth) چون سرورِ استاتیک /api ندارد. این شبکه‌ی ایمنیِ
//  رفتاری، پیش‌نیازِ ادغام‌های بعدیِ API client است (CONSOLIDATION_ROADMAP قدم ۳).
// ═══════════════════════════════════════════════════════════

const BIZ = 'http://localhost:8081/';

// mockِ سطحِ پنل: فقط staff-auth را واقعی جواب می‌دهد؛ بقیه‌ی /api پاسخِ خالیِ موفق
// تا viewها بدونِ خطا رندر شوند (دادهٔ نمونه/خالی).
async function mockPanelApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === '/auth/staff/request') return json({ devCode: '1234' });
    if (path === '/auth/staff/verify') {
      return json({
        staff: { role: 'owner', restaurant_name: 'رستورانِ دمو', permissions: {} },
        access: 'demo-access-token',
        refresh: 'demo-refresh-token',
      });
    }
    // پیش‌فرض: پاسخِ خالیِ موفق تا viewها نشکنند
    return json({ ok: true });
  });
}

test('پنلِ کسب‌وکار: ورودِ staff (شماره → کد) پنل را باز و داشبورد را فعال می‌کند', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await mockPanelApi(page);

  await page.goto(BIZ);

  // مرحله‌ی ۱: شماره‌ی موبایل
  const phone = page.locator('#staffPhone');
  await expect(phone).toBeVisible();
  await phone.fill('09123456789');
  await page.locator('#staffSendBtn').click();

  // مرحله‌ی ۲: کدِ ورود (دمو: ۱۲۳۴)
  const code = page.locator('#staffCode');
  await expect(code).toBeVisible();
  await code.fill('1234');
  await page.locator('#staffVerifyBtn').click();

  // نتیجه: overlayِ ورود مخفی و داشبورد فعال
  await expect(page.locator('#loginOverlay')).toHaveClass(/hidden/);
  await expect(page.locator('#v-overview')).toHaveClass(/active/);
  await expect(page.locator('.sb-brand').first()).toBeVisible();

  // بدونِ خطای اجرا-نشده‌ی JS در کلِ جریان
  expect(errors, `خطاهای JS: ${errors.join(' | ')}`).toEqual([]);
});
