import { test, expect, type Page } from '@playwright/test';
import { requestAllowed, targetMode } from './guard';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const local = process.env.SMOKE_LOCAL === '1';
const mode = targetMode(base, process.env.SMOKE_ALLOW_PRODUCTION_READONLY);
const task = process.env.SMOKE_TASK || 'בדיקת עשייה משותפת';
const item = 'פריט בדיקה זמני';
const capture = async (page: Page, name: string) => { if (local && process.env.SMOKE_SHOTS_DIR) await page.screenshot({path: `${process.env.SMOKE_SHOTS_DIR}/${name}-375.png`}); };

test('member can sign in and complete the main flow', async ({ page, context }) => {
  await context.route('**/*', route => requestAllowed(route.request().url(), route.request().method(), base, mode, local) ? route.continue() : route.abort());
  if (local) await context.routeWebSocket('**/*', ws => { if (/^wss?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(ws.url())) ws.connectToServer(); else ws.close(); });
  await page.goto('/login');
  await expect(page.locator('#login-email')).toBeVisible();
  await capture(page, 'login');
  await page.locator('#login-email').fill(local ? 'member@example.invalid' : process.env.SMOKE_MEMBER_EMAIL!);
  await page.locator('#login-password').fill(local ? 'fake-password' : process.env.SMOKE_MEMBER_PASSWORD!);
  await page.locator('form').first().locator('button[type="submit"]').click();
  await expect(page.getByRole('link', {name:/משימות|Tasks/i}).first()).toBeVisible({timeout:30000});
  await capture(page, 'today');
  if (mode === 'full') {
    await page.goto('/tasks');
    if (local) await expect(page.getByText('לסדר סלון', {exact:true}).first()).toBeVisible({timeout:20000});
    await page.getByRole('button', {name:'הוספת משימה', exact:true}).click();
    await page.getByPlaceholder('מה צריך לעשות?').fill(task);
    await page.getByRole('button', {name:/בואו נעשה את זה/}).click();
    await expect(page.getByText('נוסף! 🙌').first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(task, {exact:true}).first()).toBeVisible();
    await capture(page, 'task-added');
    await page.getByRole('button', {name:`סמן כהושלם: ${task}`}).first().click();
    await expect(page.getByRole('button', {name:`בטל השלמה: ${task}`}).first()).toBeVisible();
    await capture(page, 'task-complete');
    await page.goto('/shopping');
    await page.getByRole('button', {name:'הוספת פריט', exact:true}).click();
    await page.getByPlaceholder('מה קונים?').fill(item);
    await page.getByPlaceholder('מה קונים?').press('Enter');
    await expect(page.getByText(item, {exact:true}).first()).toBeVisible();
    await capture(page, 'shopping-added');
    await page.getByRole('button', {name:`סמן כנרכש: ${item}`}).click();
    await expect(page.getByRole('button', {name:`בטל סימון: ${item}`})).toHaveAttribute('aria-pressed','true');
    await capture(page, 'shopping-checked');
  }
  await signOut(page);
});

async function signOut(page: Page) {
  await page.goto('/settings');
  await page.getByRole('button', {name:'התנתקות', exact:true}).click();
  await expect(page.locator('#login-email')).toBeVisible();
}
