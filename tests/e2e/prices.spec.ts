import { navigate } from './navigation';
import { openLogin } from './login';
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

async function login(page: Page) {
  await page.goto('/');
  await openLogin(page);
  await page.getByRole('textbox', { name: 'Usuario o correo electrónico' }).fill('admin@efidataoil.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
  await page.getByRole('button', { name: /Entrar|Acceder|Iniciar/i }).click();
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
}

test('prices persist in PostgreSQL, propagate to formulas and survive close + reload', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await login(page);
  const purchase = page.getByLabel('TORREJON GOA curr', { exact: true });
  await purchase.fill('1,555');
  await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
  await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
  await expect(purchase).toHaveClass(/bg-amber/);
  const state = await (await page.request.get('/api/sync')).json();
  expect(state.data.efi_compras_data.data.TORREJON_GOA.curr).toBe('1,555');
  const sale = state.data.efi_compras_data.data.TORREJON_GOA.sale;
  // Formula deliberately references a mutable purchase column; seed a real server record.
  const formulas = { STD_TORREJON_T12_sinIva: { rawFormula: '[COMPRAS:TORREJON:COMPRA_HOY] + 0.012', evaluatedValue: 0, updatedAt: new Date().toISOString() } };
  expect((await page.request.post('/api/sync', { data: { data: { efi_sabana_custom_formulas_global: formulas }, baseData: state.data } })).ok()).toBeTruthy();
  await page.reload();
  await expect(purchase).toHaveValue('1,555');
  await navigate(page, 'Sábana de Precios');
  await expect.poll(async () => (await (await page.request.get('/api/sync')).json()).data.efi_sabana_standard_table_full_v1?.['12::TORREJON']?.sinIva).toBe(1.567);
  await navigate(page, 'Compras');
  await expect(purchase).toHaveValue('1,555');
  // Formula updates immediately without a reload or remount.
  await purchase.fill('1,556');
  await expect.poll(async () => (await (await page.request.get('/api/sync')).json()).data.efi_sabana_standard_table_full_v1?.['12::TORREJON']?.sinIva).toBe(1.568);
  await purchase.fill('1,555');
  await page.getByLabel('TORREJON GOA sale', { exact: true }).fill('1,900');
  await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
  await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
  await navigate(page, 'EFI Export');
  const efiRow = page.getByRole('row').filter({ hasText: 'TORREJON' }).filter({ hasText: /TARIFA\s*12/ }).first();
  await expect(efiRow).toContainText('1,896');
  await navigate(page, 'Postes');
  const poste = page.getByLabel('Poste ARCOS goa', { exact: true });
  await poste.fill('1,987');
  await expect(poste).toHaveClass(/bg-amber/);
  await page.getByRole('button', { name: /Guardar/ }).first().click();
  await navigate(page, 'Compras');
  const closing = page.waitForEvent('download');
  await page.getByRole('button', { name: /Cierre.*Día/i }).click();
  const download = await closing;
  const book = XLSX.read(await readFile((await download.path())!), { type: 'buffer' });
  expect(book.SheetNames).toContain('CALCULO INICIAL');
  expect(book.SheetNames).toContain('CONFIGURACION COMPLETA');
  const posteRows = XLSX.utils.sheet_to_json<any[]>(book.Sheets.POSTES, { header: 1 });
  expect(posteRows.find(row => row[4] === 'POSTES:ARCOS:POSTE_GOA')?.[3]).toBe(1.987);
  const closed = await (await page.request.get('/api/sync')).json();
  expect(closed.data.efi_compras_data.modified).toEqual([]);
  expect(closed.data.efi_compras_data.data.TORREJON_GOA.prev).toBe('1,555');
  expect(closed.data.efi_compras_data.data.TORREJON_GOA.prevSale).toBe('1,900');
  expect(closed.data.efi_compras_data.data.TORREJON_GOA.sale).toBe('1,900');
  expect(closed.data.efi_compras_data.data.TORREJON_GOA.isCustomSale).toBe(true);
  expect(closed.data.efi_postes_data_v2.postes.ARCOS.goa).toBe('1,987');
  expect(closed.data.efi_postes_data_v2.modified).toEqual([]);
  await page.reload();
  await expect(purchase).toHaveValue('1,555');
  await expect(purchase).not.toHaveClass(/bg-amber/);
  await navigate(page, 'Postes');
  await expect(poste).toHaveValue('1,987');
  await expect(poste).not.toHaveClass(/bg-amber/);
  const other = await browser.newPage();
  await login(other);
  await expect(other.getByLabel('TORREJON GOA curr', { exact: true })).toHaveValue('1,555');
  await other.close();
  expect(errors).toEqual([]);
});

test('PostgreSQL transaction merges independent edits and rejects same-cell conflicts', async ({ request }) => {
  await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
  const seed = await request.post('/api/sync', { data: { data: { efi_test_concurrent: { A: 1, B: 2 } }, baseData: {} } });
  expect(seed.ok()).toBeTruthy();
  const baseline = (await seed.json()).data;
  const results = await Promise.all([
    request.post('/api/sync', { data: { data: { efi_test_concurrent: { A: 3, B: 2 } }, baseData: baseline } }),
    request.post('/api/sync', { data: { data: { efi_test_concurrent: { A: 1, B: 4 } }, baseData: baseline } }),
  ]);
  expect(results.every(r => r.ok())).toBe(true);
  const merged = (await (await request.get('/api/sync')).json()).data;
  expect(merged.efi_test_concurrent).toEqual({ A: 3, B: 4 });
  const conflicts = await Promise.all([
    request.post('/api/sync', { data: { data: { efi_test_concurrent: { A: 5, B: 4 } }, baseData: merged } }),
    request.post('/api/sync', { data: { data: { efi_test_concurrent: { A: 6, B: 4 } }, baseData: merged } }),
  ]);
  expect(conflicts.map(r => r.status()).sort()).toEqual([200, 409]);
});

test('server rejects unauthenticated access and never exposes passwords', async ({ request }) => {
  expect((await request.get('/api/sync')).status()).toBe(401);
  expect((await request.get('/api/users')).status()).toBe(401);
  const login = await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
  expect(login.ok()).toBeTruthy();
  const users = await (await request.get('/api/users')).json();
  expect(users.users.every((u: any) => u.password === undefined)).toBe(true);
});

test('failed PostgreSQL save cannot display success', async ({ page }) => {
  await login(page);
  await page.route('**/api/sync', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Database offline' }) }) : route.continue());
  await page.getByLabel('TORREJON GOA curr', { exact: true }).fill('1,666');
  await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
  await expect(page.getByText(/No se pudo guardar en PostgreSQL/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).not.toBeVisible();
});

test('database read errors return 503 instead of successful empty default data', async ({ request }) => {
  await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
  const db = new Client({ connectionString: 'postgresql://postgres:test-only@127.0.0.1:55437/postgres' });
  await db.connect();
  try {
    await db.query('ALTER TABLE efi_server_state RENAME TO efi_test_state_backup');
    const response = await request.get('/api/sync');
    expect(response.status()).toBe(503);
    expect((await response.json()).success).toBe(false);
  } finally {
    await db.query('ALTER TABLE efi_test_state_backup RENAME TO efi_server_state');
    await db.end();
  }
  expect((await request.get('/api/sync')).ok()).toBe(true);
});
