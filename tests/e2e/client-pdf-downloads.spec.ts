import { test, expect } from './fixtures';
import { navigate } from './navigation';
import { openPdfActions } from './pdf-actions';
import { unzipSync } from 'fflate';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { APIRequestContext, Page, TestInfo } from '@playwright/test';

test.use({ actionTimeout: 20000 });
const admin = { email: 'admin@efidataoil.com', password: 'admin123' };
const date = '2026-11-04';
const tariffs = ['TARIFA 12', 'TARIFA 18', 'CLIENTE PERSONALIZADO'];
const formula = (rawFormula: string) => ({ rawFormula, evaluatedValue: 0, updatedAt: '2026-11-04T10:00:00Z' });
async function state(api: APIRequestContext) { return (await (await api.get('/api/sync')).json()).data; }
async function patch(api: APIRequestContext, data: Record<string, any>) { return api.post('/api/sync', { data: { data, baseData: await state(api) } }); }
async function seed(api: APIRequestContext) {
  await api.post('/api/auth', { data: admin }); const before = await state(api);
  const data = { ...Object.fromEntries(Object.keys(before).map(key => [key, null])),
    efi_compras_valid_from: date, efi_global_valid_from_date: date,
    efi_compras_data: { data: { TORREJON_GOA: { curr: '1,500', prev: '1,400', sale: '1,600', prevSale: '1,550', porte: '0,006', pase: '0,010', fin: '0,010', isCustomSale: true } }, modified: [], updatedAt: '2026-11-04T10:00:00Z' },
    efi_custom_tariffs_catalog_v5: tariffs.map(name => ({ name, markup: .012 })),
    efi_tariff_active_stations_map: { 'TARIFA 18': ['TORREJON', 'ALFAJARIN'], 'CLIENTE PERSONALIZADO': [] },
    efi_pdf_include_hvo_map: { 'TARIFA 12': true, 'TARIFA 18': false, 'CLIENTE PERSONALIZADO': false },
    efi_pdf_station_source_mapping_v1: { 'CLIENTE PERSONALIZADO::__DEFAULT__': { sourceType: 'SABANA_T24' } },
    efi_pdf_station_labels_v1: { TORREJON: ['MADRID'], 'ARCOS JALON': ['RUTA A2'], ALFAJARIN: ['RUTA A2'] },
    efi_station_labels_active_v1: { 'ARCOS JALON': false },
    efi_sabana_custom_formulas_global: { STD_TORREJON_T12_sinIva: formula('=[COMPRAS:TORREJON:COMPRA_HOY]+0.012'), STD_TORREJON_T12_conIva: formula('1.999') },
    efi_postes_custom_formulas_global: { POSTE_HVO_ALFAJARIN_SIN_IVA: formula('1.578'), POSTE_HVO_ALFAJARIN_CON_IVA: formula('1.909'), POSTE_HVO_VALDEMORO_SIN_IVA: formula('1.560'), POSTE_HVO_VALDEMORO_CON_IVA: formula('1.887') },
  };
  expect((await patch(api, data)).ok()).toBe(true); return before;
}
async function restore(api: APIRequestContext, before: Record<string, any>) {
  const now = await state(api); await patch(api, { ...Object.fromEntries(Object.keys(now).map(key => [key, null])), ...before });
}
async function open(page: Page) {
  await page.request.post('/api/auth', { data: admin }); await page.goto('/'); await navigate(page, 'PDFs & Clientes');
  await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,512');
}
async function download(page: Page, all: boolean, info: TestInfo, label: string) {
  await openPdfActions(page);
  const received = page.waitForEvent('download');
  await page.getByRole('button', { name: all ? /Descargar todos los PDF/ : /Descargar PDF actual/ }).click();
  const item = await received; const path = info.outputPath(label + (all ? '.zip' : '.pdf')); await item.saveAs(path);
  return { name: item.suggestedFilename(), bytes: await readFile(path) };
}

test('individual PDFs and ZIP use permanent aliases, current order/date/prices and each tariff’s full active selection', async ({ page, request }, info) => {
  test.setTimeout(180000);
  const before = await seed(request);
  try {
    await page.setViewportSize({ width: 1700, height: 1100 }); await open(page);
    await expect(page.getByRole('button', { name: /Descargar PDF actual/ })).toBeHidden();
    await openPdfActions(page); await page.screenshot({ animations: 'disabled', path: info.outputPath('menu-desktop.png') });
    await page.getByRole('button', { name: 'Nombres de archivos PDF', exact: true }).click();
    const names = page.getByRole('dialog', { name: 'Nombres de archivos PDF', exact: true });
    await names.getByLabel('Nombre de archivo TARIFA 12', { exact: true }).fill('TARIFA NEXO');
    await names.getByLabel('Nombre de archivo TARIFA 18', { exact: true }).fill('ESTACIÓN ÁREA');
    await expect(names.getByTestId('pdf-filename-preview').first()).toContainText('01 TARIFA NEXO VALIDA A PARTIR DE 04-11-2026.pdf');
    await names.getByRole('button', { name: 'Guardar nombres PDF', exact: true }).click(); await expect(names).toBeHidden();
    expect((await state(request)).efi_pdf_export_names_v1).toEqual({ 'TARIFA 12': 'TARIFA NEXO', 'TARIFA 18': 'ESTACIÓN ÁREA' });
    expect((await state(request)).efi_custom_tariffs_catalog_v5.map((item: any) => item.name)).toEqual(tariffs);
    await expect(page.getByTestId('pdf-tariff').first()).toContainText('TARIFA 12');
    await page.getByPlaceholder('Filtrar por nombre o ubicación...').fill('TORREJON');
    const individual = await download(page, false, info, 'individual');
    expect(individual.name).toBe('01 TARIFA NEXO VALIDA A PARTIR DE 04-11-2026.pdf');
    expect(individual.bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const first = await state(request);
    await writeFile(info.outputPath('expected.json'), JSON.stringify({ sources: first.efi_sabana_prices_v1.sources, labels: first.efi_pdf_station_labels_v1 }));
    await page.reload(); await navigate(page, 'PDFs & Clientes');
    await page.getByLabel('Fecha de validez del documento', { exact: true }).fill('2026-11-05');
    const batch = await download(page, true, info, 'batch');
    expect(batch.name).toBe('PDFs CLIENTES VALIDA A PARTIR DE 05-11-2026.zip');
    const files = unzipSync(batch.bytes);
    expect(Object.keys(files)).toEqual(['01 TARIFA NEXO VALIDA A PARTIR DE 05-11-2026.pdf', '02 ESTACIÓN ÁREA VALIDA A PARTIR DE 05-11-2026.pdf', '03 CLIENTE PERSONALIZADO VALIDA A PARTIR DE 05-11-2026.pdf']);
    await mkdir(info.outputPath('batch'), { recursive: true });
    for (const [filename, bytes] of Object.entries(files)) { expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe('%PDF-'); await writeFile(info.outputPath('batch', filename), bytes); }
    await navigate(page, 'Compras');
    await page.getByLabel('TORREJON GOA curr', { exact: true }).fill('1,700');
    await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click(); await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
    await navigate(page, 'PDFs & Clientes'); await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,712');
    expect((await download(page, false, info, 'updated')).name).toBe('01 TARIFA NEXO VALIDA A PARTIR DE 05-11-2026.pdf');
    await navigate(page, 'Compras'); const closing = page.waitForEvent('download'); await page.getByRole('button', { name: /Cierre.*Día/ }).click(); await closing;
    expect((await state(request)).efi_pdf_export_names_v1).toEqual({ 'TARIFA 12': 'TARIFA NEXO', 'TARIFA 18': 'ESTACIÓN ÁREA' });
    expect((await patch(request, { efi_custom_tariffs_catalog_v5: [tariffs[1], tariffs[0], tariffs[2]].map(name => ({ name, markup: .012 })) })).ok()).toBe(true);
    await page.reload(); await navigate(page, 'PDFs & Clientes');
    expect((await download(page, false, info, 'reordered')).name).toBe('02 TARIFA NEXO VALIDA A PARTIR DE 05-11-2026.pdf');
    await expect(page.getByLabel('Fecha de validez del documento', { exact: true })).toHaveValue('2026-11-05');
  } finally { await page.close(); await restore(request, before); }
});

test('names save errors retain the draft and retry merges unrelated remote edits; invalid preferences cannot enter PostgreSQL', async ({ page, request }) => {
  const before = await seed(request);
  try {
    await patch(request, { efi_pdf_export_names_v1: { 'TARIFA 18': 'OTRO' } }); await open(page); await openPdfActions(page);
    await page.getByRole('button', { name: 'Nombres de archivos PDF', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nombres de archivos PDF', exact: true });
    await dialog.getByLabel('Nombre de archivo TARIFA 12', { exact: true }).fill('NEXO');
    await page.route('**/api/sync', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, json: { error: 'Prueba de guardado fallido' } }) : route.continue());
    await dialog.getByRole('button', { name: 'Guardar nombres PDF', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('No se pudieron confirmar');
    await expect(dialog.getByLabel('Nombre de archivo TARIFA 12', { exact: true })).toHaveValue('NEXO');
    expect((await state(request)).efi_pdf_export_names_v1).toEqual({ 'TARIFA 18': 'OTRO' });
    await patch(request, { efi_pdf_export_names_v1: { 'TARIFA 18': 'CAMBIO REMOTO' } });
    await page.unroute('**/api/sync'); await dialog.getByRole('button', { name: 'Guardar nombres PDF', exact: true }).click(); await expect(dialog).toBeHidden();
    expect((await state(request)).efi_pdf_export_names_v1).toEqual({ 'TARIFA 12': 'NEXO', 'TARIFA 18': 'CAMBIO REMOTO' });
    for (const value of [[], { 'TARIFA 12': 123 }, { 'TARIFA 12': 'x'.repeat(101) }]) expect((await patch(request, { efi_pdf_export_names_v1: value })).status()).toBe(400);
    expect((await patch(request, { efi_pdf_document_valid_from: '2026-02-31' })).status()).toBe(400);
  } finally { await page.close(); await restore(request, before); }
});

test('batch validation prevents a partial ZIP when one active tariff has a missing origin', async ({ page, request }) => {
  const before = await seed(request);
  try {
    await patch(request, { efi_pdf_station_source_mapping_v1: { 'TARIFA 18::__DEFAULT__': { sourceType: 'SABANA_NO_EXISTE' } } }); await open(page);
    const downloads: string[] = []; page.on('download', item => downloads.push(item.suggestedFilename()));
    await openPdfActions(page); await page.getByRole('button', { name: /Descargar todos los PDF/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No se puede descargar' })).toContainText('TARIFA 18');
    expect(downloads).toEqual([]);
    await page.getByRole('button', { name: 'TARIFA 12', exact: true }).click();
    await openPdfActions(page); const single = page.waitForEvent('download'); await page.getByRole('button', { name: /Descargar PDF actual/ }).click(); await single;
    expect(downloads).toHaveLength(1);
  } finally { await page.close(); await restore(request, before); }
});

test('dropdown and name editor fit mobile themes, support keyboard and do not rename tariffs', async ({ page, request }, info) => {
  const before = await seed(request);
  try {
    await page.setViewportSize({ width: 390, height: 844 }); await open(page);
    for (const theme of ['dark', 'cream']) {
      await page.getByLabel('Tema visual', { exact: true }).selectOption(theme);
      const trigger = page.getByLabel('Opciones y descargas PDF', { exact: true }); await trigger.focus(); await trigger.press('Enter');
      await expect(page.getByRole('button', { name: 'Nombres de archivos PDF', exact: true })).toBeVisible();
      await page.screenshot({ animations: 'disabled', path: info.outputPath(`menu-${theme}.png`) });
      await page.getByRole('button', { name: 'Nombres de archivos PDF', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Nombres de archivos PDF', exact: true });
      const box = await dialog.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      await dialog.getByLabel('Nombre de archivo TARIFA 12', { exact: true }).fill('UN NOMBRE DE ARCHIVO LARGO CON ACENTOS ÁREA Y RUTAS');
      await page.screenshot({ animations: 'disabled', path: info.outputPath(`nombres-${theme}.png`) });
      await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
      await page.keyboard.press('Escape'); await expect(page.locator('details.efi-pdf-actions')).not.toHaveAttribute('open');
      await expect(trigger).toBeFocused();
      const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth,
        elements: [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(element).position !== 'absolute').slice(0, 8).map(element => ({ tag: element.tagName, class: element.className })) }));
      expect(overflow.width, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport);
    }
    expect((await state(request)).efi_pdf_export_names_v1).toBeUndefined();
    expect((await state(request)).efi_custom_tariffs_catalog_v5.map((tariff: any) => tariff.name)).toEqual(tariffs);
  } finally { await page.request.put('/api/preferences', { data: { theme: 'crystal' } }); await page.close(); await restore(request, before); }
});
