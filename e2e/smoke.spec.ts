import { test, expect, type Page } from '@playwright/test';

async function seedSession(page: Page) {
  await page.addInitScript(() => {
    const user = {
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@admin.ru',
      role: 'admin',
      subscription: 'premium',
    };
    localStorage.setItem('blogpost_session_user', JSON.stringify(user));
    localStorage.setItem('blogpost_page', 'dashboard');
  });
}

test.describe('Home', () => {
  test('loads marketing home with title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BlogPost|BlogPro/i);
    await expect(page.locator('body')).toBeVisible();
    // Cookie banner (ФЗ-152) appears once
    const cookie = page.getByRole('button', { name: /принять|accept|ok|соглас/i }).first();
    if (await cookie.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookie.click();
    }
    await expect(page.locator('body')).toContainText(/BlogPost|блог/i);
  });

  test('legal pages open via hash', async ({ page }) => {
    await page.goto('/');
    await page.goto('/#/legal/privacy');
    await expect(page.locator('body')).toContainText(/конфиденц|privacy|данн/i);
  });
});

test.describe('Auth', () => {
  test('auth page shows login form', async ({ page }) => {
    await page.goto('/');
    // Navigate through UI if possible
    const loginLink = page.getByRole('button', { name: /войти|вход|login/i }).first();
    if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginLink.click();
    } else {
      await page.evaluate(() => {
        localStorage.setItem('blogpost_page', 'auth');
        window.location.reload();
      });
    }
    await expect(page.locator('body')).toContainText(/вход|регистрац|login|email/i);
  });

  test('local admin session unlocks app shell', async ({ page }) => {
    await seedSession(page);
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // Header nav should appear after session
    await expect(page.locator('body')).toContainText(/панель|дашборд|dashboard|генерац|кабинет/i);
  });
});

test.describe('App shell (authorized)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test('dashboard renders stats or cards', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('blogpost_page', 'dashboard'));
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/публикац|просмотр|статист|dashboard|панель/i);
  });

  test('generator page opens with topic/prompt blocks', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('blogpost_page', 'generator'));
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/тема|промпт|генерац/i);
  });

  test('settings page lists social networks', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('blogpost_page', 'settings'));
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/VK|Telegram|YouTube/i);
    await expect(page.locator('body')).toContainText(/TikTok|Instagram|Rutube|ОК/i);
  });

  test('admin page loads for admin session', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('blogpost_page', 'admin'));
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/админ|admin|пользовател|модерац/i);
  });

  test('analytics page loads', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('blogpost_page', 'analytics'));
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/аналит|просмотр|публикац|граф/i);
  });

  test('subscription page shows plans', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('blogpost_page', 'subscriptions'));
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/тариф|подписк|Basic|Pro|Premium/i);
  });
});

test.describe('API health', () => {
  test('generate-health is ok', async ({ request }) => {
    const res = await request.get('/api/generate-health');
    expect(res.ok()).toBeTruthy();
    expect(await res.text()).toContain('ok');
  });
});
