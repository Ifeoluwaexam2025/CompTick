import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const password = 'Test-account-password';
const screenshotDir = './docs';

async function signIn(page: Page, email: string, password: string) {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
}

async function screenshot(page: Page, name: string) {
    if (process.env.E2E_SCREENSHOTS !== '1') return;
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
}

test('members create and edit requests and administrators advance their status and read the audit', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });

    const email = 'member@comptick.example';
    const title = 'Internal portal redirects after MFA';
    await page.goto('/requests');
    await expect(page).toHaveURL('/login');
    await expect(page).toHaveTitle('CompTick');
    await page.getByRole('link', { name: 'Create an account' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Account created. Sign in to continue.')).toBeVisible();
    await signIn(page, email, password);
    await expect(page.getByRole('link', { name: 'Administration' })).toHaveCount(0);
    await page.getByRole('button', { name: 'New request' }).click();
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Description').fill('The internal portal redirects back to the sign-in page.');
    await page.getByLabel('Category').fill('Account access');
    await page.getByLabel('Priority').selectOption('HIGH');
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByText('Request created.', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Edit request' }).click();
    await page.getByLabel('Description').fill('The internal portal redirects after multi-factor authentication.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Request updated.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Audit history' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/login');

    const emailAdmin = process.env.E2E_ADMIN_EMAIL;
    const passwordAdmin = process.env.E2E_ADMIN_PASSWORD;
    if (!emailAdmin || !passwordAdmin) throw new Error('Run using npm run test:e2e to provision the isolated test administrator');
    const login = await page.request.post('/api/auth/login', { data: { email, password } });
    expect(login.ok()).toBe(true);
    const { token } = await login.json() as { token: string };
    for (const fixture of [
        { title: 'New starter access for the finance team', category: 'Onboarding', priority: 'MEDIUM' },
        { title: 'Monitor flickers at reception', category: 'Equipment', priority: 'LOW' },
        { title: 'VPN disconnects during calls', category: 'Connectivity', priority: 'HIGH' }
    ]) {
        const created = await page.request.post('/api/requests', {
            headers: { Authorization: `Bearer ${token}` },
            data: { ...fixture, description: 'Submitted for the service desk to investigate.' }
        });
        expect(created.ok()).toBe(true);
    }
    await signIn(page, emailAdmin, passwordAdmin);
    await page.getByRole('link', { name: 'Administration' }).click();
    await page.getByRole('button', { name: title, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit request' })).toHaveCount(0);
    await expect(page.getByText('No status changes recorded.')).toBeVisible();
    await page.getByLabel('Audit note (optional)').fill('Investigating the identity provider redirect.');
    await page.getByRole('button', { name: 'Move to in progress' }).click();
    await expect(page.getByText('Investigating the identity provider redirect.')).toBeVisible();
    await page.getByRole('button', { name: 'Move to resolved' }).click();
    const audit = page.getByRole('region', { name: 'Audit history' });
    await expect(audit.getByRole('listitem')).toHaveCount(2);
    await expect(audit.getByRole('listitem').first()).toContainText('Resolved');
    await screenshot(page, 'comptick-audit');

    await page.getByRole('link', { name: 'Overview' }).click();
    await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
    await screenshot(page, 'comptick-overview');
    await page.reload();
    await expect(page).toHaveURL('/login');
    expect(browserErrors).toEqual([]);
});

test('mobile layout fits the viewport and supports keyboard sign-in', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to CompTick' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Email')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    await screenshot(page, 'comptick-mobile');
    await signIn(page, String(process.env.E2E_ADMIN_EMAIL), String(process.env.E2E_ADMIN_PASSWORD));
    await expect(page.getByRole('heading', { name: 'Recent requests' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
