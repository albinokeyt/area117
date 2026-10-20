import { test, expect } from './fixtures';
import { openLogin } from './login';
import { navigate } from './navigation';
import type { Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import { readFile } from 'node:fs/promises';

async function auditMargins(page: Page) {
  const rows = await page.locator('.efi-purchase-table tbody tr').evaluateAll(elements => elements.map(row => {
    const field = (name: string) => row.querySelector<HTMLInputElement>(`input[aria-label$=" ${name}"]`)!;
    const number = (value: string) => Math.round(Number(value.replace(',', '.').replace(/[^\d.\-+]/g, '').trim()) * 1000);
    return { label: field('sale').getAttribute('aria-label'),
      expected: number(field('sale').value) - number(field('prevSale').value),
      actual: number(row.lastElementChild!.textContent || '') };
  }));
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.filter(row => row.actual !== row.expected)).toEqual([]);
  return rows;
}

function auditWorkbook(book: XLSX.WorkBook, sheet: string, closed = false) {
  const rows = XLSX.utils.sheet_to_json<any[]>(book.Sheets[sheet], { header: 1 })
    .filter(row => row.length === 13 && typeof row[10] === 'number' && typeof row[11] === 'number');
  expect(rows.length).toBeGreaterThan(100);
  for (const row of rows) {
    expect(Math.round(row[12] * 1000), `${row[0]} ${row[2]}`).toBe(Math.round(row[11] * 1000) - Math.round(row[10] * 1000));
    if (closed) expect(row[12]).toBe(0);
  }
  return rows;
}

test('all purchase margins follow suggested minus previous sale, including Excel and day close', async ({ page }) => {
  await page.goto('/');
  await openLogin(page);
  await page.getByLabel('Usuario o correo electrónico').fill('admin@efidataoil.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Ver Todos los Productos', exact: true }).click();
  await expect(page.locator('.efi-purchase-table')).toHaveCount(3);

  // Real edits across all three station groups and every available product.
  const samples = await page.locator('.efi-purchase-table').evaluateAll(tables => tables.flatMap(table => {
    const fields = [...table.querySelectorAll<HTMLInputElement>('input[aria-label$=" sale"]')];
    return ['GOA', 'GASOLINA', 'ADBLUE'].flatMap(product => {
      const input = fields.find(field => field.getAttribute('aria-label')!.endsWith(` ${product} sale`));
      return input ? [input.getAttribute('aria-label')!.replace(/ sale$/, '')] : [];
    });
  }));
  expect(samples.length).toBeGreaterThanOrEqual(7);
  for (let i = 0; i < samples.length; i++) {
    const name = samples[i];
    const sale = page.getByLabel(`${name} sale`, { exact: true });
    const prev = page.getByLabel(`${name} prevSale`, { exact: true });
    await prev.fill(i % 3 === 0 ? '1,400' : i % 3 === 1 ? '1.600' : '0,000');
    await sale.fill(i % 3 === 0 ? '1,430' : i % 3 === 1 ? '1.500' : '0,000');
    const margin = sale.locator('xpath=ancestor::tr').locator('td').last();
    await expect(margin).toHaveText(i % 3 === 0 ? '+0,030 €' : i % 3 === 1 ? '-0,100 €' : '0,000 €');
  }
  // Acquisition costs must not become the subtrahend again.
  await page.getByLabel('TORREJON GOA curr', { exact: true }).fill('1,111');
  await page.getByLabel('TORREJON GOA porte', { exact: true }).fill('0,099');
  const original = await auditMargins(page);
  expect(original.length).toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
  await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
  const beforeClose = (await (await page.request.get('/api/sync')).json()).data.efi_compras_data.data;

  for (const name of ['Gasóleo A (GOA)', 'Gasolina 95', 'AdBlue (10 EESS)', 'Ver Todos los Productos']) {
    await page.getByRole('button', { name, exact: true }).click();
    await auditMargins(page);
  }
  await navigate(page, 'Sábana de Precios');
  await navigate(page, 'Compras');
  await auditMargins(page);
  await page.reload();
  await expect(page.getByLabel('TORREJON GOA sale', { exact: true })).toHaveValue('1,430');
  await page.getByRole('button', { name: 'Ver Todos los Productos', exact: true }).click();
  expect(await auditMargins(page)).toEqual(original);

  const dailyDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Resumen Diario (Excel)', exact: true }).click();
  const daily = XLSX.read(await readFile((await (await dailyDownload).path())!), { type: 'buffer' });
  const dailyRows = auditWorkbook(daily, 'COMPRAS_Y_COSTES');
  expect(dailyRows.find(row => row[0] === 'TORREJON' && String(row[2]).includes('GOA'))?.[12]).toBe(0.03);

  const closingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /Cierre.*Día/ }).click();
  const closing = XLSX.read(await readFile((await (await closingDownload).path())!), { type: 'buffer' });
  auditWorkbook(closing, 'CALCULO INICIAL', true);
  const afterClose = (await (await page.request.get('/api/sync')).json()).data.efi_compras_data.data;
  for (const key of Object.keys(beforeClose)) {
    expect(afterClose[key].sale).toBe(beforeClose[key].sale);
    expect(afterClose[key].prevSale).toBe(beforeClose[key].sale);
  }
  expect((await auditMargins(page)).every(row => row.actual === 0)).toBe(true);
});
