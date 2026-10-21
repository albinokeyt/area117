import { test, expect } from './fixtures';
import { navigate } from './navigation';
import { openLogin } from './login';
import type { Page, APIRequestContext } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const assigned = { TORREJON: 'MADRID', 'ARCOS JALON': ['RUTA A2'], BENAVENTE: ['RUTA NORTE'], ABRERA: ['BARCELONA'] };
async function seed(request: APIRequestContext) {
  await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
  const data = (await (await request.get('/api/sync')).json()).data;
  expect((await request.post('/api/sync', { data: { data: { efi_pdf_station_labels_v1: assigned, efi_station_labels_active_v1: {} }, baseData: data } })).ok()).toBe(true);
}
async function login(page: Page) {
  await page.goto('/'); await openLogin(page);
  await page.getByLabel('Usuario o correo electrónico').fill('admin@efidataoil.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeEnabled({ timeout: 15000 });
}
async function save(page: Page) {
  await page.getByRole('button', { name: /^(Guardar Precios|¡Guardado!)$/ }).click();
  await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
  return (await (await page.request.get('/api/sync')).json()).data;
}
const pdfRow = (page: Page) => page.getByTestId('pdf-price-TORREJON-sinIva').locator('xpath=ancestor::tr');

test('routes retain assignments, synchronize both windows and every PDF tariff, and survive PostgreSQL reload and close', async ({ page, request, browser }) => {
  test.setTimeout(150000);
  await seed(request); await page.setViewportSize({ width: 1920, height: 1000 }); await login(page);
  const toggle = page.getByLabel('Ruta activa TORREJON', { exact: true });
  const row = page.getByLabel('TORREJON GOA sale', { exact: true }).locator('xpath=ancestor::tr');
  await expect(toggle).toBeChecked(); // Legacy assignments are active without migration writes.
  await expect(row).toHaveAttribute('data-route-active', 'true');
  await expect(row.locator('td').first()).toHaveCSS('background-color', 'rgb(224, 245, 231)');
  await page.getByLabel('TORREJON GOA curr', { exact: true }).fill('1,777');
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toHaveCSS('background-color', 'rgb(255, 240, 181)');
  await toggle.uncheck();
  const off = await save(page);
  expect(off.efi_pdf_station_labels_v1).toEqual(assigned);
  expect(off.efi_station_labels_active_v1.TORREJON).toBe(false);
  await navigate(page, 'PDFs & Clientes');
  await expect(pdfRow(page)).toHaveAttribute('data-label-active', 'false');
  await expect(pdfRow(page).getByText('MADRID', { exact: true })).toHaveCount(0);
  const tariffs = await page.getByTestId('pdf-tariff').allTextContents();
  expect(tariffs.length).toBeGreaterThan(20);
  const inclusion: Record<string, boolean> = {};
  for (const tariff of tariffs) {
    await page.getByRole('button', { name: tariff.trim(), exact: true }).click();
    inclusion[tariff] = await pdfRow(page).getByRole('checkbox').isChecked();
    await expect(pdfRow(page).getByText('MADRID', { exact: true })).toHaveCount(0);
  }
  await page.getByRole('button', { name: /Etiquetas de Estaciones/ }).click();
  const modal = page.getByRole('dialog', { name: 'Etiquetas de Estaciones', exact: true });
  await expect(modal).toContainText('MADRID');
  await expect(modal.getByLabel('Ruta activa TORREJON', { exact: true })).not.toBeChecked();
  await modal.getByLabel('Ruta activa TORREJON', { exact: true }).check();
  await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
  for (const tariff of tariffs) {
    await page.getByRole('button', { name: tariff.trim(), exact: true }).click();
    // Route activation does not opt an excluded station into a customer tariff.
    await expect(pdfRow(page).getByRole('checkbox')).toBeChecked({ checked: inclusion[tariff] });
    await expect(pdfRow(page)).toHaveAttribute('data-label-active', String(inclusion[tariff]));
    await expect(pdfRow(page).getByText('MADRID', { exact: true })).toHaveCSS('background-color', 'rgb(249, 115, 22)');
  }
  await navigate(page, 'Compras'); await expect(toggle).toBeChecked();
  await page.getByRole('button', { name: 'Ver Todos los Productos', exact: true }).click();
  await expect(page.locator('.efi-purchase-table tr[data-station="TORREJON"][data-route-active="true"]')).toHaveCount(3);
  await page.getByRole('button', { name: 'AdBlue (10 EESS)', exact: true }).click();
  await expect(toggle).toHaveCount(1); await expect(toggle).toBeChecked();
  await page.getByRole('button', { name: 'Tarifas Especiales', exact: true }).click();
  await expect(page.locator('.efi-route-table tr[data-station="TORREJON"]')).toHaveAttribute('data-route-active', 'true');
  await page.getByRole('button', { name: 'Gasóleo A (GOA)', exact: true }).click();
  await save(page);
  const closing = page.waitForEvent('download');
  await page.getByRole('button', { name: /Cierre.*Día/ }).click(); await closing;
  await expect(toggle).toBeChecked();
  expect((await (await page.request.get('/api/sync')).json()).data.efi_pdf_station_labels_v1).toEqual(assigned);
  await page.reload(); await expect(toggle).toBeChecked();
  const other = await browser.newPage(); await login(other);
  await expect(other.getByLabel('Ruta activa TORREJON', { exact: true })).toBeChecked(); await other.close();
  await page.getByRole('button', { name: 'Rutas y etiquetas', exact: true }).click();
  await modal.getByRole('button', { name: 'Desactivar todas', exact: true }).click();
  await expect(modal.getByLabel('Ruta activa TORREJON', { exact: true })).not.toBeChecked();
  await expect(modal).toContainText('MADRID');
  await modal.getByRole('button', { name: 'Activar todas', exact: true }).click();
  await modal.getByLabel('Estación a asignar').selectOption('ALFAJARIN');
  await modal.getByLabel('Nombre de la etiqueta').fill('RUTA NUEVA');
  await modal.getByRole('button', { name: 'Asignar etiqueta', exact: true }).click();
  await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(page.getByLabel('Ruta activa ALFAJARIN', { exact: true })).toBeChecked();
  const stored = await save(page);
  expect(stored.efi_pdf_station_labels_v1.TORREJON).toBe('MADRID');
  expect(stored.efi_pdf_station_labels_v1.ALFAJARIN).toEqual(['RUTA NUEVA']);
  await page.screenshot({ path: 'test-results/rutas-compras.png' });
});

test('each purchase PDF downloads the current group/filter/values, including multipage ALL and AdBlue', async ({ page, request }) => {
  await seed(request); await page.setViewportSize({ width: 1920, height: 1000 }); await login(page);
  await page.getByRole('button', { name: 'Ver Todos los Productos', exact: true }).click();
  await page.getByLabel('TORREJON GOA sale', { exact: true }).fill('1,987');
  await page.getByLabel('TORREJON GOA prevSale', { exact: true }).fill('1,500');
  await page.getByLabel('TORREJON GASOLINA sale', { exact: true }).fill('1,765');
  await page.getByLabel('TORREJON ADBLUE sale', { exact: true }).fill('0,876');
  const dir = 'test-results/purchase-pdf-review'; await mkdir(dir, { recursive: true });
  const titles = ['1. Estaciones Propias', '2. Estaciones Colaboradoras Fijas', '3. Estaciones Colaboradoras Restantes'];
  for (let index = 0; index < titles.length; index++) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: `Descargar PDF ${titles[index]}`, exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^Compras_.*\.pdf$/);
    const path = `${dir}/grupo-${index + 1}.pdf`; await file.saveAs(path);
    expect((await readFile(path)).subarray(0, 5).toString()).toBe('%PDF-');
  }
  await page.getByRole('button', { name: 'AdBlue (10 EESS)', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Descargar PDF / })).toHaveCount(1);
  let download = page.waitForEvent('download');
  await page.getByRole('button', { name: `Descargar PDF ${titles[0]}`, exact: true }).click();
  await (await download).saveAs(`${dir}/adblue.pdf`);
  await page.getByRole('button', { name: 'Gasóleo A (GOA)', exact: true }).click();
  await page.getByLabel('TORREJON GOA sale', { exact: true }).fill('1,999');
  download = page.waitForEvent('download');
  await page.getByRole('button', { name: `Descargar PDF ${titles[0]}`, exact: true }).click();
  await (await download).saveAs(`${dir}/goa-actualizado.pdf`);
  await page.screenshot({ path: 'test-results/compras-pdf-botones.png' });
});

test('a failed route save stays pending, retains the assignment and can be retried', async ({ page, request }) => {
  await seed(request); await login(page);
  await page.route('**/api/sync', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Database offline' }) }) : route.continue());
  await page.getByLabel('Ruta activa TORREJON', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'No se pudo guardar en PostgreSQL' })).toBeVisible();
  expect((await (await request.get('/api/sync')).json()).data.efi_station_labels_active_v1.TORREJON).toBeUndefined();
  await page.unroute('**/api/sync');
  const stored = await save(page);
  expect(stored.efi_station_labels_active_v1.TORREJON).toBe(false);
  expect(stored.efi_pdf_station_labels_v1).toEqual(assigned);
  await page.reload();
  await expect(page.getByLabel('Ruta activa TORREJON', { exact: true })).not.toBeChecked();
});

test('the shared route dialog fits a mobile screen and restores keyboard focus on close', async ({ page, request }) => {
  await seed(request); await page.setViewportSize({ width: 390, height: 844 }); await login(page);
  const opener = page.getByRole('button', { name: 'Rutas y etiquetas', exact: true });
  await opener.click();
  const modal = page.getByRole('dialog', { name: 'Etiquetas de Estaciones', exact: true });
  await expect(modal).toBeVisible();
  const bounds = (await modal.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  await expect(modal.getByLabel('Ruta activa TORREJON', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/rutas-modal-movil.png' });
  await modal.getByRole('button', { name: 'Cerrar', exact: true }).press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
