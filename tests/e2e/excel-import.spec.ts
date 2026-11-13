import { test, expect } from './fixtures';
import { navigate } from './navigation';
import { utils, write } from 'xlsx';
import { EXCEL_MAPPINGS_KEY, EXCEL_VALUES_KEY } from '../../src/lib/excelImportMappings';

const admin = { email: 'admin@efidataoil.com', password: 'admin123' };
const date = '2026-11-13';
const madrid = 'STD_MADRID_TTRAJOTA_sinIva';
const buildWorkbook = (madridPrice: number) => {
  const book = utils.book_new();
  const sheet = utils.aoa_to_sheet([]);
  sheet['!ref'] = 'A1:Z85';
  for (const [address, value] of Object.entries({
    K2: 'TORREJÓN', M2: 1259, Z2: 1325, K3: 'OTRA ESTACIÓN', M3: 1460,
    A1: 'ARCOS', B1: 'GOA', C1: 1.599, A16: 'VALDEMORO', B16: 'GOA', C16: 1.699,
    E17: 1.887, A83: 'UCLES', B83: 1.28, E83: 1.619, I68: madridPrice,
  })) sheet[address] = { t: typeof value === 'number' ? 'n' : 's', v: value };
  utils.book_append_sheet(book, sheet, 'CALCULO INICIAL');
  return { name: 'Precios diarios.xlsm', mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12', buffer: write(book, { type: 'buffer', bookType: 'xlsm' }) as Buffer };
};

test('edits and saves the map, reviews an XLSM, rejects a stale preview, and persists prices and a live formula', async ({ page, request, browser }) => {
  test.setTimeout(130000);
  await request.post('/api/auth', { data: admin });
  const snapshot = async () => (await (await request.get('/api/sync')).json());
  const initial = (await snapshot()).data;
  const patch = async (data: Record<string, unknown>) => request.post('/api/sync', { data: { data, baseData: (await snapshot()).data } });
  expect((await patch({
    ...Object.fromEntries(Object.keys(initial).map(key => [key, null])),
    efi_compras_valid_from: date, efi_global_valid_from_date: date,
    efi_compras_data: { data: { TORREJON_GOA: { curr: '1,100', prev: '1,200', sale: '1,555', prevSale: '1,500', isCustomSale: true } }, modified: [], updatedAt: date },
    efi_sabana_custom_block_tariffs_v1: [{ id: 'test-trajota', name: 'TRAJOTA', blockType: 'custom_block', customBlockName: 'TALAEXPRESS', specialBlockId: 'test-tala', markup: 0 }],
    efi_sabana_custom_formulas_global: { [madrid]: { rawFormula: '1.230', evaluatedValue: 1.230, updatedAt: date } },
  })).ok()).toBe(true);
  const readonlyUser = await browser.newContext();
  try {
    await request.patch('/api/users', { data: { id: '2', canManageFormulas: false } });
    await readonlyUser.request.post('/api/auth', { data: { email: 'compras@efidataoil.com', password: 'compras123' } });
    const saved = await snapshot();
    const forbidden = await readonlyUser.request.post('/api/sync', { data: { data: { [EXCEL_VALUES_KEY]: { [madrid]: 8.123 } }, baseData: {} } });
    expect(forbidden.status()).toBe(403);
    const forbiddenApply = await readonlyUser.request.post('/api/sync', { data: { data: { efi_excel_review_test: true }, baseData: {}, reviewedVersion: saved.version } });
    expect(forbiddenApply.status()).toBe(403);

    await page.request.post('/api/auth', { data: admin });
    await page.goto('/');
    const buy = page.getByLabel('TORREJON GOA curr', { exact: true });
    await expect(buy).toHaveValue('1,100');
    const open = page.getByRole('button', { name: 'Importar Excel', exact: true });
    await open.click();
    const dialog = page.getByRole('dialog', { name: 'Importación diaria de Excel' });
    await dialog.getByRole('button', { name: 'Configurar mapa de celdas' }).click();
    await dialog.getByRole('button', { name: 'Editar TORREJON · GOA · Precio compra hoy', exact: true }).click();
    await dialog.getByLabel('Celda del precio').fill('Z2');
    await dialog.getByRole('button', { name: 'Aceptar regla' }).click();
    await dialog.getByRole('button', { name: 'Guardar mapa de celdas' }).click();
    await expect(dialog.getByText('Mapa de celdas guardado en PostgreSQL.')).toBeVisible();
    expect((await snapshot()).data[EXCEL_MAPPINGS_KEY][0].cell).toBe('Z2');

    await dialog.getByLabel('Archivo Excel').setInputFiles(buildWorkbook(1.293));
    const row = dialog.getByRole('row').filter({ hasText: 'TORREJON · GOA · Precio compra hoy' });
    await expect(row).toContainText('1,325');
    await expect(dialog.getByText(/La estación en K3 no coincide/)).toBeVisible();
    expect((await snapshot()).data.efi_compras_data.data.TORREJON_GOA.curr).toBe('1,100');

    expect((await patch({ efi_excel_review_test: 'otra edición' })).ok()).toBe(true);
    await dialog.getByRole('button', { name: /^Aplicar \d+ cambios$/ }).click();
    await expect(dialog.getByRole('alert')).toContainText(/vista previa/i);
    expect((await snapshot()).data.efi_compras_data.data.TORREJON_GOA.curr).toBe('1,100');
    await dialog.getByRole('button', { name: 'Actualizar vista previa' }).click();
    await dialog.getByRole('button', { name: /^Aplicar \d+ cambios$/ }).click();
    await expect(dialog.getByText(/cambios aplicados en PostgreSQL/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cerrar importación' }).click();
    await expect(buy).toHaveValue('1,325');
    await expect(page.getByLabel('TORREJON GOA sale', { exact: true })).toHaveValue('1,555');
    const first = (await snapshot()).data;
    expect(first.efi_postes_data_v2.postes.ARCOS.goa).toBe('1,599');
    expect(first.efi_postes_data_v2.hvoValdemoroAddition).toBe('0,1880');
    expect(first.efi_postes_data_v2.gasoleoBRows.UCLES.poste).toBe('1,619');
    expect(first[EXCEL_VALUES_KEY][madrid]).toBe(1.293);
    const definition = first.efi_sabana_custom_formulas_global[madrid];
    expect(definition.rawFormula).toMatch(/^=\[EXCEL:/);
    const trajotaMadrid = page.getByRole('heading', { name: 'TALAEXPRESS', exact: true })
      .locator('xpath=ancestor::div[.//table][1]').getByRole('row').filter({ hasText: /^MADRID/ }).first();
    await navigate(page, 'Sábana de Precios');
    await expect(trajotaMadrid).toContainText('1,293');
    await expect(trajotaMadrid).toContainText('1,565');

    await navigate(page, 'Compras');
    await open.click();
    await dialog.getByLabel('Archivo Excel').setInputFiles(buildWorkbook(1.311));
    await dialog.getByRole('button', { name: /^Aplicar [1-9]\d* cambios$/ }).click();
    await expect(dialog.getByText(/cambios aplicados en PostgreSQL/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cerrar importación' }).click();
    await page.reload();
    await expect(buy).toHaveValue('1,325');
    await navigate(page, 'Sábana de Precios');
    await expect(trajotaMadrid).toContainText('1,311');
    await expect(trajotaMadrid).toContainText('1,586');
    const second = (await snapshot()).data;
    expect(second[EXCEL_VALUES_KEY][madrid]).toBe(1.311);
    expect(second.efi_sabana_custom_formulas_global[madrid]).toEqual(definition);
  } finally {
    await page.close();
    await readonlyUser.close();
    const current = (await snapshot()).data;
    await patch({ ...Object.fromEntries(Object.keys(current).map(key => [key, null])), ...initial });
  }
});
