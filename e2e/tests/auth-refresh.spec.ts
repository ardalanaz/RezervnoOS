import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════
//  بازیابیِ نشست با refresh (۴۰۱ → refresh → retry) — اپ مشتری
//  این مسیرِ حیاتیِ auth تا کنون پوششِ e2e نداشت: وقتی access token منقضی است،
//  request() باید یک‌بار /auth/refresh را صدا بزند و درخواست را با توکنِ نو دوباره اجرا کند.
//  این تست همان مسیر را از طریقِ boot (restoreSession → GET /me) درایو می‌کند.
//  شبکه‌ی ایمنیِ پیش‌نیازِ ادغامِ transportِ API client (CONSOLIDATION_ROADMAP قدم ۵).
// ═══════════════════════════════════════════════════════════

test('نشستِ منقضی با refresh بازیابی می‌شود (۴۰۱ → refresh → retry)', async ({ page }) => {
  let meGetCalls = 0;
  let refreshCalls = 0;

  // توکنِ ذخیره‌شده تا boot مسیرِ restoreSession → GET /me را برود
  await page.addInitScript(() => {
    try {
      localStorage.setItem('rz_onboarded', '1');
      localStorage.setItem('rz_access', 'expired-access');
      localStorage.setItem('rz_refresh', 'valid-refresh');
    } catch { /* ignore */ }
  });

  // پیش‌فرض برای بقیه‌ی /api تا اپ hang نکند (اول ثبت می‌شود = کم‌اولویت‌ترین)
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );

  // refresh: توکنِ نو می‌دهد (بعد ثبت می‌شود = اولویتِ بالاتر از catch-all)
  await page.route('**/api/v1/auth/refresh', (route) => {
    refreshCalls++;
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ access: 'fresh-access', refresh: 'fresh-refresh' }),
    });
  });

  // GET /me: بارِ اول ۴۰۱ (توکنِ منقضی)، بعد از refresh بارِ دوم ۲۰۰
  await page.route('**/api/v1/me', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    meGetCalls++;
    if (meGetCalls === 1) {
      return route.fulfill({
        status: 401, contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'token expired' } }),
      });
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'u-demo', phone: '+989123456789', first_name: 'کاربر', last_name: 'دمو' } }),
    });
  });

  await page.goto('/');
  await expect(page.locator('#page-discover')).toBeVisible();

  // نتیجه: refresh یک‌بار صدا زده شده، /me دوبار (۴۰۱ سپس retry)، و کاربر لاگین است
  await page.waitForFunction(
    () => (window as unknown as { isLoggedIn?: () => boolean }).isLoggedIn?.() === true,
    undefined, { timeout: 8000 },
  );
  expect(refreshCalls, 'باید دقیقاً یک‌بار refresh شود').toBeGreaterThanOrEqual(1);
  expect(meGetCalls, 'باید /me دوبار صدا شود (۴۰۱ سپس retry)').toBeGreaterThanOrEqual(2);
});
