import { openLogin } from './login';
import { test, expect } from './fixtures';
import * as XLSX from 'xlsx';
import { readFile } from 'node:fs/promises';

test('saved EFI source stays live across edits, date changes and reload; preview equals XLSX and CSV', async ({ page, request }) => {
  test.setTimeout(180000);
  await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
  const initial = (await (await request.get('/api/sync')).json()).data;
  const date = '2026-10-15';
  try {
    const data = { ...Object.fromEntries(Object.keys(initial).map(key => [key, null])),
      efi_compras_valid_from: date,
      efi_compras_data: { data: { TORREJON_GOA: { curr: '1,300', prev: '1,200', sale: '1,400', prevSale: '1,300', porte: '0', pase: '0', fin: '0', isCustomSale: true } }, modified: [], updatedAt: '2026-10-15T14:00:00Z' },
      efi_special_rates_b50_f82_v4: [{ id: 'torrejon', name: 'TORREJON', actualPrice: '', refPrice: '', basePrice: '' }],
      efi_sabana_custom_block_tariffs_v1: [{ id: 'talaexpress', name: 'TALAEXPRESS', markup: .116, isCustom: true, blockType: 'custom_block', specialBlockId: 'recuadro_talaexpress', customBlockName: 'TALAEXPRESS' }],
      // A real legacy record: origin exists, but old implementation exported stale 1.780.
      efi_export_custom_overrides_v1: { 'TARIFA TALAEXPRESS::73::1': { sourceType: 'ESPECIAL_REF', markupDiff: 0, pvp: 1.780, initialDate: '01/08/2025', finalDate: '20/08/2025', codeA: 93, pago: 'MENSUAL', prod: 1, isCustom: true } },
    };
    expect((await request.post('/api/sync', { data: { data, baseData: initial } })).ok()).toBe(true);
    await page.goto('/');
    await openLogin(page);
    await page.getByLabel('Usuario o correo electrónico').fill('admin@efidataoil.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page.getByLabel('TORREJON GOA sale', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'EFI Export', exact: true }).click();
    await page.getByPlaceholder('Buscar estación, ID, tarifa, pago...').fill('TALAEXPRESS');
    const row = page.getByTestId('efi-row-TARIFA TALAEXPRESS-73-1');
    await expect(row).toContainText('1,704');
    await row.getByRole('button').click();
    const dialog = page.getByRole('dialog', { name: 'Modificar exportación EFI' });
    await expect(dialog.getByLabel('Origen de datos base', { exact: true })).toHaveValue('ESPECIAL_REF');
    await expect(dialog.getByLabel('Código columna A')).toHaveValue('93');
    await expect(dialog.getByLabel('Tipo de pago')).toHaveValue('MENSUAL');
    await dialog.getByLabel('Diferencial de precio').fill('0,010');
    await dialog.getByRole('button', { name: 'Aplicar y Guardar Modificación', exact: true }).click();
    await expect.poll(async () => (await (await request.get('/api/sync')).json()).data.efi_export_custom_overrides_v1?.['TARIFA TALAEXPRESS::73::1']?.priceMode).toBe('SOURCE');
    const saved = (await (await request.get('/api/sync')).json()).data.efi_export_custom_overrides_v1['TARIFA TALAEXPRESS::73::1'];
    expect(saved.pvp).toBeUndefined();
    expect(saved.sourceType).toBe('ESPECIAL_REF');
    await dialog.getByRole('button', { name: 'Cerrar modificación EFI', exact: true }).click();
    await expect(row).toContainText('1,714');
    await page.getByLabel('Fecha inicial de exportación').fill('2026-10-17');
    await page.getByLabel('Fecha final de exportación').fill('2026-10-31');
    await expect(row).toContainText('17/10/2026');
    await expect(row).toContainText('31/10/2026');
    await page.getByRole('button', { name: 'Compras', exact: true }).click();
    await page.getByRole('button', { name: 'Tarifas Especiales', exact: true }).click();
    await page.getByLabel('Precio especial referencia TORREJON', { exact: true }).fill('1,500');
    await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
    await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'EFI Export', exact: true }).click();
    await expect(row).toContainText('1,825');
    await row.getByRole('button').click();
    await expect(dialog.getByLabel('Origen de datos base')).toHaveValue('ESPECIAL_REF');
    await expect(dialog.getByLabel('Diferencial de precio')).toHaveValue('0,01');
    await expect(dialog).toContainText('1,825');
    await dialog.getByRole('button', { name: 'Cerrar modificación EFI', exact: true }).click();
    const downloadX = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar Excel (.xlsx)', exact: true }).click();
    const workbook = XLSX.read(await readFile((await (await downloadX).path())!), { type: 'buffer' });
    const excelRow = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets.IMPORTACION, { header: 1 }).find(r => r[8] === 'TARIFA TALAEXPRESS' && r[1] === 73)!;
    expect(excelRow.slice(0,6)).toEqual([93,73,1,'17/10/2026','31/10/2026',1.825]);
    const downloadC = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar CSV', exact: true }).click();
    const csv = await readFile((await (await downloadC).path())!, 'utf8');
    expect(csv).toContain('93;73;1;17/10/2026;31/10/2026;1,825;TORREJON;MENSUAL;TARIFA TALAEXPRESS');
    await page.reload();
    await expect(page.getByLabel('TORREJON GOA sale', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'EFI Export', exact: true }).click();
    await page.getByPlaceholder('Buscar estación, ID, tarifa, pago...').fill('TALAEXPRESS');
    await expect(row).toContainText('1,825');
    await expect(page.getByLabel('Fecha final de exportación')).toHaveValue('2026-10-31');
    await row.getByRole('button').click();
    await expect(dialog.getByLabel('Origen de datos base')).toHaveValue('ESPECIAL_REF');
    await expect(dialog.getByLabel('Código columna A')).toHaveValue('93');
    await dialog.getByRole('button', { name: 'Precio Manual Directo', exact: true }).click();
    await dialog.getByLabel('Precio manual con IVA').fill('2,123');
    await dialog.getByRole('button', { name: 'Aplicar y Guardar Modificación', exact: true }).click();
    await expect.poll(async () => (await (await request.get('/api/sync')).json()).data.efi_export_custom_overrides_v1?.['TARIFA TALAEXPRESS::73::1']?.priceMode).toBe('DIRECT');
    await dialog.getByRole('button', { name: 'Cerrar modificación EFI', exact: true }).click();
    await expect(row).toContainText('2,123');
    await page.reload();
    await expect(page.getByLabel('TORREJON GOA sale', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'EFI Export', exact: true }).click();
    await page.getByPlaceholder('Buscar estación, ID, tarifa, pago...').fill('TALAEXPRESS');
    await expect(row).toContainText('2,123');
    await row.getByRole('button').click();
    await expect(dialog.getByLabel('Precio manual con IVA')).toHaveValue('2,123');
    await dialog.getByRole('button', { name: /Modo Señalar/ }).click();
    await dialog.getByRole('button', { name: /⭐ Tarifas Especiales/ }).click();
    await dialog.getByRole('row').filter({ hasText: 'TORREJON' }).first().getByRole('cell').nth(1).click();
    await expect(dialog.getByLabel('Origen de datos base')).toHaveValue('ESPECIAL_REF');
    await dialog.getByRole('button', { name: 'Aplicar y Guardar Modificación', exact: true }).click();
    await expect.poll(async () => (await (await request.get('/api/sync')).json()).data.efi_export_custom_overrides_v1?.['TARIFA TALAEXPRESS::73::1']?.sourceType).toBe('ESPECIAL_REF');
    // A failed DB write cannot be reported as a successful save.
    await page.route('**/api/sync', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false,"error":"DB offline"}' }) : route.continue());
    await dialog.getByLabel('Diferencial de precio').fill('0,020');
    await dialog.getByRole('button', { name: 'Aplicar y Guardar Modificación', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('No se pudo confirmar el guardado');
    await expect(dialog.getByText(/Modificación guardada para/)).not.toBeVisible();

  } finally {
    await page.close();
    const current = (await (await request.get('/api/sync')).json()).data;
    const data = Object.fromEntries([...new Set([...Object.keys(initial), ...Object.keys(current)])].map(key => [key, key in initial ? initial[key] : null]));
    expect((await request.post('/api/sync', { data: { data, baseData: current } })).ok()).toBe(true);
  }
});
