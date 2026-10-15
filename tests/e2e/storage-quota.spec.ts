import { test, expect } from './fixtures';

async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Usuario o correo electrónico').fill('admin@efidataoil.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page.getByLabel('TORREJON GOA sale', { exact: true })).toBeVisible();
}

test('two suggested sale edits save in PostgreSQL even when browser storage is completely full', async ({ page }) => {
  await login(page);
  await page.waitForTimeout(2000);
  // Exhaust the actual Chromium quota, including the last few bytes of headroom.
  await page.evaluate(() => {
    let low = 0;
    let high = 6 * 1024 * 1024;
    while (low < high) {
      const size = Math.ceil((low + high) / 2);
      try { localStorage.setItem('quota-test-unrelated', 'x'.repeat(size)); low = size; }
      catch { high = size - 1; }
    }
    localStorage.setItem('quota-test-unrelated', 'x'.repeat(low));
  });
  await page.getByLabel('TORREJON GOA sale', { exact: true }).fill('1,401');
  await page.getByLabel('ARCOS JALON GOA sale', { exact: true }).fill('1,411');
  await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
  await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
  const saved = (await (await page.request.get('/api/sync')).json()).data.efi_compras_data;
  expect(saved.data.TORREJON_GOA.sale).toBe('1,401');
  expect(saved.data['ARCOS JALON_GOA'].sale).toBe('1,411');
  expect(saved.modified).toEqual(expect.arrayContaining(['TORREJON_GOA_sale', 'ARCOS JALON_GOA_sale']));
  await page.reload();
  await expect(page.getByLabel('TORREJON GOA sale', { exact: true })).toHaveValue('1,401');
  await expect(page.getByLabel('ARCOS JALON GOA sale', { exact: true })).toHaveValue('1,411');
  await expect(page.getByLabel('TORREJON GOA sale', { exact: true })).toHaveClass(/bg-amber/);
  await page.getByRole('button', { name: 'Postes', exact: true }).click();
  await page.getByRole('button', { name: 'Compras', exact: true }).click();
  await expect(page.getByLabel('ARCOS JALON GOA sale', { exact: true })).toHaveValue('1,411');
  await expect(page.getByLabel('ARCOS JALON GOA sale', { exact: true })).toHaveClass(/bg-amber/);
  expect(await page.evaluate(() => localStorage.getItem('quota-test-unrelated')?.length)).toBeGreaterThan(0);
});

test('server history exceeding localStorage quota loads and saves when native browser writes are unavailable', async ({ page, request }) => {
  await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
  const largeHistory = 'h'.repeat(6 * 1024 * 1024);
  const seeded = await request.post('/api/sync', { data: { data: { efi_test_large_history: largeHistory }, baseData: {} } });
  expect(seeded.ok()).toBe(true);
  try {
    await page.addInitScript(() => {
      Storage.prototype.setItem = function () { throw new DOMException('Browser storage unavailable', 'QuotaExceededError'); };
    });
    await login(page);
    await page.getByLabel('ALFAJARIN GOA sale', { exact: true }).fill('1,567');
    await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
    await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
    const state = (await (await request.get('/api/sync')).json()).data;
    expect(state.efi_test_large_history).toBe(largeHistory);
    expect(state.efi_compras_data.data.ALFAJARIN_GOA.sale).toBe('1,567');
    await page.reload();
    await expect(page.getByLabel('ALFAJARIN GOA sale', { exact: true })).toHaveValue('1,567');
    await expect(page.getByLabel('ALFAJARIN GOA sale', { exact: true })).toHaveClass(/bg-amber/);
  } finally {
    const baseline = (await (await request.get('/api/sync')).json()).data;
    await request.post('/api/sync', { data: { data: { efi_test_large_history: null }, baseData: { efi_test_large_history: baseline.efi_test_large_history } } });
  }
});
