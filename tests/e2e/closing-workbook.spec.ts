import { test, expect } from './fixtures';
import { navigate } from './navigation';
import * as XLSX from 'xlsx';
import { readFile } from 'node:fs/promises';

test('CLH stays saved in all products and closing archives the unfiltered values before copying prices', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const admin = { email: 'admin@efidataoil.com', password: 'admin123' };
  await request.post('/api/auth', { data: admin });
  const state = async () => (await (await request.get('/api/sync')).json()).data;
  const before = await state();
  const date = '2026-11-11';
  const formula = (rawFormula: string) => ({ rawFormula, evaluatedValue: 0, updatedAt: `${date}T15:00:00Z` });
  const data = {
    ...Object.fromEntries(Object.keys(before).map(key => [key, null])),
    efi_compras_valid_from: date, efi_global_valid_from_date: date,
    efi_pdf_document_valid_from: '2026-11-12',
    efi_pdf_export_names_v1: { 'TARIFA 12': 'TARIFA NEXO' },
    efi_custom_tariffs_catalog_v5: ['TARIFA 12', 'TARIFA 75'].map(name => ({ name, markup: 0.012 })),
    efi_tariff_active_stations_map: { 'TARIFA 12': ['TORREJON'] },
    efi_pdf_include_hvo_map: { 'TARIFA 75': false },
    efi_export_dates_v1: { initial: '2026-11-12', final: '2026-11-18' },
    efi_pdf_station_labels_v1: { TORREJON: ['MADRID'] },
    efi_sabana_custom_formulas_global: {
      STD_TORREJON_T12_sinIva: formula('1.512'), STD_TORREJON_T12_conIva: formula('1.999'),
      'SPEC_tarifa_75_TORREJON_Tarifa 75_sinIva': formula('1.777'),
    },
    efi_postes_custom_formulas_global: {
      POSTE_HVO_ALFAJARIN_SIN_IVA: formula('1.578'), POSTE_HVO_ALFAJARIN_CON_IVA: formula('1.909'),
      POSTE_ADBLUE_TORREJON_CON_IVA: formula('1.888'),
    },
  };
  expect((await request.post('/api/sync', { data: { data, baseData: before } })).ok()).toBe(true);
  try {
    await page.setViewportSize({ width: 1580, height: 970 });
    await page.request.post('/api/auth', { data: admin });
    await page.goto('/');
    const clh = page.getByRole('button', { name: /^Editar CLH/ });
    await expect(clh).toHaveCount(3);
    const names = ['TORREJON', 'BENAVENTE', 'ABRERA'];
    for (const [index, station] of names.entries()) {
      await clh.nth(index).click();
      const dialog = page.getByRole('dialog', { name: /Editar CLH/ });
      await dialog.getByLabel(`Lugar de compra ${station}`, { exact: true }).fill(`TERMINAL ${index + 1}`);
      await dialog.getByRole('button', { name: 'Guardar lugares de compra' }).click();
      await expect(dialog).toBeHidden();
      expect((await state()).efi_stations_catalog_v1.costs[station].clhName).toBe(`TERMINAL ${index + 1}`);
    }
    await page.reload();
    await page.getByRole('button', { name: 'Ver Todos los Productos', exact: true }).click();
    const torrejonRows = page.locator('.efi-purchase-table tr[data-station="TORREJON"]');
    await expect(torrejonRows).toHaveCount(3);
    await expect(torrejonRows.locator('td[data-pdf-value="TERMINAL 1"]')).toHaveCount(3);
    await page.getByRole('button', { name: 'Tarifas Especiales', exact: true }).click();
    const headers = page.locator('.efi-route-table thead th');
    await expect(headers).toHaveText(['Nº', 'Estación', 'PRECIO REFERENCIA', 'PRECIO ESPECIAL SUGERIDO', 'Precio Base / Coste (€)']);
    const decimal = (value: string) => Number(value.trim().replace(',', '.'));
    const reference = decimal(await page.getByLabel('Precio especial actual TORREJON', { exact: true }).inputValue());
    const suggested = decimal(await page.getByLabel('Precio especial referencia TORREJON', { exact: true }).inputValue());
    expect(suggested - reference).toBeCloseTo(0.008, 5);

    await navigate(page, 'Sábana de Precios');
    await expect(page.getByRole('heading', { name: 'Tarifa Especial 75', exact: true })).toHaveCount(0);
    const card = page.getByRole('heading', { name: 'Tarifas Especiales Personalizadas' }).locator('xpath=ancestor::div[.//table][1]');
    const dimensions = await card.evaluate(node => [node.getBoundingClientRect().width, node.parentElement!.getBoundingClientRect().width]);
    expect(dimensions[0]).toBeCloseTo(dimensions[1]);
    await expect(page.getByTestId('sabana-price-TORREJON-12-sinIva')).toContainText('1,512');
    await navigate(page, 'PDFs & Clientes');
    await expect(page.getByTestId('pdf-price-TORREJON-conIva')).toContainText('1,999');
    await page.getByRole('button', { name: 'TARIFA 75', exact: true }).click();
    await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,777');
    await page.getByPlaceholder('Filtrar por nombre o ubicación...').fill('TORREJON');
    await navigate(page, 'EFI Export');
    await expect(page.getByLabel('Fecha inicial de exportación')).toHaveValue('2026-11-12');
    await expect(page.getByLabel('Fecha final de exportación')).toHaveValue('2026-11-18');
    await page.getByLabel('Precio recibido de Nieves con IVA').fill('1,815');
    await page.getByLabel('Precio GOA de EFI para BENAVENTE', { exact: true }).fill('1.2345');

    await navigate(page, 'Compras');
    await page.getByRole('button', { name: 'Gasóleo A (GOA)', exact: true }).click();
    await page.getByLabel('TORREJON GOA prev', { exact: true }).fill('1,111');
    await page.getByLabel('TORREJON GOA curr', { exact: true }).fill('1,555');
    await page.getByLabel('TORREJON GOA prevSale', { exact: true }).fill('1,400');
    await page.getByLabel('TORREJON GOA sale', { exact: true }).fill('1,600');
    const incoming = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Cierre de Día', exact: true }).click();
    const download = await incoming;
    const path = info.outputPath('cierre.xlsx');
    await download.saveAs(path);
    const workbook = XLSX.read(await readFile(path), { type: 'buffer', cellNF: true });
    const rows = (name: string) => XLSX.utils.sheet_to_json<(string | number | null)[]>(workbook.Sheets[name], { header: 1, defval: null });
    expect(workbook.SheetNames).toEqual(expect.arrayContaining(['CIERRE', 'CALCULO INICIAL', 'COMPRAS ADBLUE', 'COMPRAS RUTAS',
      'TARIFAS_ESPECIALES', 'POSTES', 'POSTES HVO', 'POSTES GASOLEO B', 'POSTES ADBLUE', 'POSTES GASES', 'POSTES BRONCO',
      'TARIFAS_ESTANDAR', 'ESPECIALES_PERSONALIZADAS', 'PDFS TARIFAS', 'PDFS CLIENTES', 'EFI PROVEEDORES', 'EFI COLABORADORAS', 'IMPORTACION_EFI']));
    expect(workbook.SheetNames).not.toContain('TARIFA_75');
    const purchases = rows('CALCULO INICIAL');
    const goa = purchases.find(row => row[0] === 'TORREJON' && String(row[2]).includes('GOA'))!;
    expect(goa.slice(3, 6)).toEqual([1.111, 1.555, 'TERMINAL 1']);
    expect(goa.slice(10, 13)).toEqual([1.4, 1.6, 0.2]);
    expect(purchases.filter(row => row[0] === 'TORREJON' && row[5] === 'TERMINAL 1')).toHaveLength(3);
    expect(rows('COMPRAS ADBLUE').find(row => row[0] === 'TORREJON')?.[1]).toBe('TERMINAL 1');
    expect(rows('COMPRAS RUTAS').find(row => row[0] === 'TORREJON')?.slice(1)).toEqual(['Sí', 'MADRID']);
    expect(rows('TARIFAS_ESTANDAR').find(row => row[0] === 'TORREJON')?.slice(1, 3)).toEqual([1.512, 1.999]);
    expect(rows('POSTES HVO').find(row => row[0] === 'HVO Alfajarín')?.slice(3, 5)).toEqual([1.578, 1.909]);
    expect(rows('POSTES ADBLUE').find(row => row[0] === 'TORREJON')?.[2]).toBe(1.888);
    const pdfRows = rows('PDFS CLIENTES');
    expect(pdfRows.find(row => row[0] === 'TARIFA 12' && row[3] === 'TORREJON')?.slice(6, 10)).toEqual(['MADRID', 1.512, 1.999, 'SABANA_T12']);
    expect(pdfRows.find(row => row[0] === 'TARIFA 12' && row[3] === 'ARCOS JALON')?.[2]).toBe('No');
    expect(pdfRows.filter(row => row[0] === 'TARIFA 75').length).toBeGreaterThan(40);
    expect(rows('PDFS TARIFAS')[1].slice(2, 7)).toEqual(['2026-11-12', 'TARIFA NEXO', '01 TARIFA NEXO VALIDA A PARTIR DE 12-11-2026.pdf', 1, 'Sí']);
    const efi = rows('IMPORTACION_EFI');
    expect(efi.length).toBeGreaterThan(1000);
    expect(efi.find(row => row[6] === 'TORREJON' && row[8] === 'TARIFA 12')?.slice(3, 6)).toEqual(['12/11/2026', '18/11/2026', 1.999]);
    expect(rows('EFI PROVEEDORES').find(row => row[0] === 'Nieves')?.slice(1)).toEqual([1.5, 1.815]);
    expect(rows('EFI COLABORADORAS').find(row => row[0] === 'BENAVENTE')?.[1]).toBe(1.2345);
    const closed = await state();
    expect(closed.efi_compras_data.data.TORREJON_GOA).toMatchObject({ prev: '1,555', prevSale: '1,600' });
    expect(closed.efi_stations_catalog_v1.costs.TORREJON.clhName).toBe('TERMINAL 1');
  } finally {
    await page.close();
    const current = await state();
    expect((await request.post('/api/sync', { data: { data: { ...Object.fromEntries(Object.keys(current).map(key => [key, null])), ...before }, baseData: current } })).ok()).toBe(true);
  }
});
