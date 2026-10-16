import { test, expect } from './fixtures';
import { openLogin } from './login';
import { navigate, openNavigation } from './navigation';
import type { Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/');
  await openLogin(page);
  await page.getByLabel('Usuario o correo electrónico', { exact: true }).fill('admin@efidataoil.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
}

test('floating menu supports hover, pin, keyboard and responsive navigation without hiding header controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const trigger = page.getByRole('button', { name: 'Navegación AREA117', exact: true });
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.hover();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('button')).toHaveCount(8);
  await page.mouse.move(20, 400);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await page.mouse.move(20, 400);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('button', { name: 'Compras', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: testInfo.outputPath('notch-desktop.png'), animations: 'disabled' });
  await page.getByRole('main').click({ position: { x: 10, y: 20 } });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.focus();
  await trigger.press('ArrowDown');
  await expect(nav.getByRole('button', { name: 'Compras', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Historial de versiones', exact: true })).toBeFocused();
  await expect(page.locator('.efi-notch')).toHaveCSS('width', '382px');
  for (const width of [1920, 1440, 1100, 1050, 1024, 920, 900, 768, 600, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const pill = (await trigger.boundingBox())!;
    for (const control of [page.getByLabel('Fecha de trabajo'), page.getByRole('button', { name: 'Historial de versiones', exact: true }), page.getByRole('button', { name: 'Cerrar sesión', exact: true })]) {
      const box = (await control.boundingBox())!;
      expect(pill.x >= box.x + box.width || box.x >= pill.x + pill.width || pill.y >= box.y + box.height || box.y >= pill.y + pill.height, `header overlap at ${width}px`).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await openNavigation(page);
  await expect(nav.getByRole('button', { name: 'Instrucciones', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('notch-mobile.png'), animations: 'disabled' });
  await navigate(page, 'Postes');
  await expect(page.locator('.notch-current')).toHaveText('Postes');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openNavigation(page);
  expect(await page.locator('.efi-notch').evaluate(node => parseFloat(getComputedStyle(node).transitionDuration))).toBeLessThan(.001);
});

test('notch waits for PostgreSQL acknowledgement, reports a failed save and recovers without losing edits', async ({ page }) => {
  await login(page);
  const purchase = page.getByLabel('TORREJON GOA curr', { exact: true });
  const original = await purchase.inputValue();
  await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
  await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
  let mode: 'hold' | 'fail' | 'pass' = 'hold';
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/sync', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    if (mode === 'hold') await gate;
    if (mode === 'fail') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Prueba de conexión interrumpida' }) });
    return route.continue();
  });
  try {
    const target = original === '1,654' ? '1,655' : '1,654';
    const push = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/sync'));
    await purchase.fill(target);
    await push;
    await expect(page.locator('.efi-notch')).toHaveAttribute('data-phase', 'saving');
    await expect(page.locator('.notch-live-message')).toHaveText('Guardando cambios');
    const pending = await (await page.request.get('/api/sync')).json();
    expect(pending.data.efi_compras_data.data.TORREJON_GOA.curr).toBe(original);
    mode = 'pass'; release();
    await expect(page.locator('.notch-live-message')).toHaveText('Guardado en PostgreSQL');
    expect((await (await page.request.get('/api/sync')).json()).data.efi_compras_data.data.TORREJON_GOA.curr).toBe(target);
    mode = 'fail';
    await purchase.fill('1,656');
    await expect(page.locator('.notch-live-message')).toHaveText('Guardado pendiente');
    await navigate(page, 'Postes');
    await navigate(page, 'Compras');
    await expect(purchase).toHaveValue('1,656');
    await expect(page.locator('.notch-live-message')).toHaveText('Guardado pendiente');
    mode = 'pass';
    await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
    await expect(page.locator('.notch-live-message')).toHaveText('Guardado en PostgreSQL');
    await page.reload();
    await expect(purchase).toHaveValue('1,656');
  } finally {
    mode = 'pass'; release();
    await page.unroute('**/api/sync');
    await purchase.fill(original);
    await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
    await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
  }
});
