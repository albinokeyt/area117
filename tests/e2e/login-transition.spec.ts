import { test, expect } from './fixtures';
import { openLogin } from './login';
import type { Page } from '@playwright/test';

async function submitLogin(page: Page, password = 'admin123') {
  await page.goto('/');
  await openLogin(page);
  await page.getByLabel('Usuario o correo electrónico', { exact: true }).fill('admin@efidataoil.com');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  const result = page.waitForResponse(response => response.url().endsWith('/api/auth') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await result;
}

test('successful login drives the car toward the screen for 3.5 seconds, then reveals the workspace and notices', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const releaseRequests: number[] = [];
  page.on('request', request => { if (request.url().endsWith('/api/releases')) releaseRequests.push(Date.now()); });
  await submitLogin(page);
  const started = Date.now();
  const transition = page.getByRole('region', { name: 'Transición de acceso', exact: true });
  await expect(transition).toBeVisible();
  await expect(transition).toContainText('ACCESO CONFIRMADO');
  await expect(page.getByLabel('Usuario o correo electrónico', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).not.toBeVisible();
  expect(releaseRequests).toEqual([]);
  await page.waitForTimeout(1200); // Sample the middle of the requested cinematic, not its end state.
  const scale = await transition.locator('.station-car').evaluate(node => new DOMMatrix(getComputedStyle(node).transform).a);
  expect(scale).toBeGreaterThan(1.05);
  await page.screenshot({ path: testInfo.outputPath('login-drive-midpoint.png') });
  await page.waitForTimeout(800);
  await expect(transition).toBeVisible();
  await expect(transition).toHaveClass(/is-leaving/, { timeout: 2500 });
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
  await expect(page.locator('.efi-app')).toHaveJSProperty('inert', true);
  await expect(transition).not.toBeVisible({ timeout: 6000 });
  await expect(page.locator('.efi-app')).toHaveJSProperty('inert', false);
  expect(Date.now() - started).toBeGreaterThanOrEqual(3200);
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
  expect(releaseRequests.every(time => time - started >= 3000)).toBe(true);
  await page.reload();
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
  await expect(transition).toHaveCount(0);
});

test('slow PostgreSQL hydration keeps the transition waiting instead of showing editable defaults', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/sync', async route => { if (route.request().method() === 'GET') await gate; await route.continue(); });
  try {
    await submitLogin(page);
    const transition = page.getByRole('region', { name: 'Transición de acceso', exact: true });
    await expect(transition).toBeVisible();
    await expect(transition.getByRole('status')).toHaveText('Cargando datos de PostgreSQL…', { timeout: 5000 });
    await expect(transition).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toHaveCount(0);
    release();
    await expect(transition).not.toBeVisible();
    await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
  } finally { release(); }
});

test('invalid credentials never start the drive; a hydration failure offers a working retry', async ({ page }) => {
  await submitLogin(page, 'invalid-password');
  await expect(page.getByRole('region', { name: 'Acceso al sistema' }).getByRole('alert')).toContainText('Credenciales inválidas');
  await expect(page.getByRole('region', { name: 'Transición de acceso' })).toHaveCount(0);
  await page.route('**/api/sync', route => route.request().method() === 'GET' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'PostgreSQL no disponible para la prueba' }) }) : route.continue());
  await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  const transition = page.getByRole('region', { name: 'Transición de acceso' });
  await expect(transition.getByRole('alert')).toHaveText('Error del servidor al descargar datos');
  await expect(transition).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toHaveCount(0);
  await page.unroute('**/api/sync');
  await transition.getByRole('button', { name: 'Reintentar conexión' }).click();
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
  await expect(transition).toHaveCount(0);
});

test('reduced motion removes the drive and releases promptly once data is ready', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/sync', async route => { if (route.request().method() === 'GET') await gate; await route.continue(); });
  try {
    await submitLogin(page);
    const transition = page.getByRole('region', { name: 'Transición de acceso' });
    await expect(transition.getByRole('status')).toHaveText('Cargando datos de PostgreSQL…');
    expect(await transition.locator('.station-car').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
    const readyAt = Date.now(); release();
    await expect(transition).not.toBeVisible({ timeout: 1800 });
    expect(Date.now() - readyAt).toBeLessThan(1800);
    await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  } finally { release(); }
});
