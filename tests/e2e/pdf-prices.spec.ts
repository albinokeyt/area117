import { openLogin } from './login';
import { test, expect } from './fixtures';

const tariffSources: Record<string, string> = {
  'TARIFA 12': 'T12', 'TARIFA 18': 'T18', 'T18 - PISTA DE SILLA': 'T18', 'TARIFA 24': 'T24',
  'TARIFA 36': 'T36', 'T36 - PISTA DE SILLA': 'T36', 'ESPECIAL COMPLETO': 'C0',
  'TARIFA 40': 'T40', 'TARIFA 42': 'T42', 'TARIFA 47': 'T47', 'TARIFA 50': 'T50',
  'TARIFA 60': 'T60', 'T60 - PISTA DE SILLA': 'T60', AMAEXO: 'T36', E100: 'T36',
  'TARIFA ECO': 'ECOTRANS', DORADO: 'ESTEBAN', HIQI: 'T36', 'NORPETROL 24': 'T24',
  ROR: 'ROR', TARJETERA: 'T36', 'TAX MOVING 24': 'COMPRAS_ESPECIAL_REF', TORTUGA: 'T36', VRIO: 'T24',
};
const firstFive = ['TORREJON', 'ARCOS JALON', 'ALFAJARIN', 'TORREMOCHA', 'MADRID'];
const formula = (rawFormula: string) => ({ rawFormula, evaluatedValue: 0, updatedAt: '2026-10-15T14:00:00.000Z' });
const format = (price: number) => price.toFixed(3).replace('.', ',');

test('all PDF station/tariff cells follow Sabana and HVO follows Postes, including independent VAT formulas', async ({ page, request }, testInfo) => {
  test.setTimeout(180000);
  await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
  const original = (await (await request.get('/api/sync')).json()).data;
  const date = '2026-10-15';
  const purchases = { data: Object.fromEntries(firstFive.map((name, i) => [`${name}_GOA`, {
    curr: format(1.290 + i / 100), prev: '1,100', sale: format(1.400 + i / 100), prevSale: '1,300',
    porte: '0,000', pase: '0,000', fin: '0,000', clh: 'TORREJON', isCustomSale: true,
  }])), modified: [], updatedAt: '2026-10-15T14:00:00.000Z' };
  try {
    const data = {
      ...Object.fromEntries(Object.keys(original).map(key => [key, null])),
      efi_compras_valid_from: date, efi_global_valid_from_date: date, efi_compras_data: purchases,
      [`efi_purchases_${date}`]: purchases,
      efi_custom_tariffs_catalog_v5: [...Object.keys(tariffSources), 'CLIENTE ESPECIAL', 'SIN ENLACE'].map(name => ({ name, markup: 999 })),
      efi_sabana_tariff_source_mapping_v1: { '12::__DEFAULT__': { sourceType: 'COMPRAS_MEDIO', markupDiff: 0.123 } },
      efi_sabana_custom_formulas_global: { STD_TORREJON_T12_conIva: formula('1.710') },
      efi_postes_custom_formulas_global: {
        POSTE_HVO_ALFAJARIN_CON_IVA: formula('1.999'),
        POSTE_HVO_VALDEMORO_SIN_IVA: formula('1.700'),
        POSTE_HVO_VALDEMORO_CON_IVA: formula('2.222'),
      },
      efi_postes_data_v2: { hvoAlfajarinSinIva: '1,600', postes: {}, modified: [], updatedAt: '2026-10-15T14:00:00.000Z' },
      efi_sabana_custom_block_tariffs_v1: [{ id: 'client', name: 'CLIENTE ESPECIAL', markup: .135, blockType: 'custom', isCustom: true, specialBlockId: 'client', customBlockName: 'CLIENTES' }],
      efi_pdf_station_source_mapping_v1: {
        'TARIFA 12::VALLECAS': { sourceType: 'SABANA_T36' },
        'HIQI::__DEFAULT__': { sourceType: 'SABANA_T36' },
        'DORADO::ARCOS JALON': { sourceType: 'COMPRAS_ESPECIAL_REF' },
        'TARIFA ECO::PETREM FIGUERES': { sourceType: 'COMPRAS_ESPECIAL_REF' },
        'TAX MOVING 24::__DEFAULT__': { sourceType: 'COMPRAS_ESPECIAL_REF', manualPriceSinIva: 999 },
      },
    };
    expect((await request.post('/api/sync', { data: { data, baseData: original } })).ok()).toBe(true);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');
    await openLogin(page);
    await page.getByLabel('Usuario o correo electrónico').fill('admin@efidataoil.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toHaveValue('1,290');
    await page.getByRole('button', { name: 'Sábana de Precios', exact: true }).click();
    await expect(page.getByTestId('sabana-price-TORREJON-12-sinIva')).toContainText('1,413');
    await expect(page.getByTestId('sabana-price-TORREJON-12-conIva')).toContainText('1,710');
    const standard = await page.locator('td[data-testid^="sabana-price-"]').evaluateAll(cells => Object.fromEntries(cells.map(cell => [cell.getAttribute('data-testid'), cell.textContent!.match(/-?\d+,\d{3}/)![0]])));
    await page.getByRole('button', { name: 'Postes', exact: true }).click();
    const hvo = { alfajarinSinIva: '1,600', alfajarinConIva: '1,999', valdemoroSinIva: '1,700', valdemoroConIva: '2,222' };
    for (const [key, price] of Object.entries(hvo)) await expect(page.getByTestId(`postes-hvo-${key}`)).toContainText(price);
    await page.getByRole('button', { name: 'PDFs & Clientes', exact: true }).click();
    for (const [key, price] of Object.entries(hvo)) await expect(page.getByTestId(`pdf-hvo-${key}`)).toContainText(price);
    await expect.poll(async () => (await (await request.get('/api/sync')).json()).data.efi_sabana_prices_v1?.sources?.['SABANA_CUSTOM:client']?.TORREJON?.sinIva).toBe(1.535);
    const published = (await (await request.get('/api/sync')).json()).data.efi_sabana_prices_v1;
    await page.getByPlaceholder('Filtrar por nombre o ubicación...').fill('TORREJON');
    await page.getByRole('button', { name: 'Validar tarifas PDF', exact: true }).click();
    const validation = page.getByRole('dialog', { name: 'Validación de tarifas PDF', exact: true });
    const stationCount = Object.keys(published.sources.SABANA_T12).length;
    await expect(validation.getByTestId('validation-ok')).toHaveText(`${25 * stationCount} coinciden`);
    await expect(validation.getByTestId('validation-difference')).toHaveText('0 diferencias');
    await expect(validation.getByTestId('validation-review')).toHaveText(`${stationCount} por revisar`);
    await validation.getByLabel('Filtrar validación por tarifa').selectOption('TARIFA 12');
    await validation.getByLabel('Buscar en validación').fill('TORREJON');
    const validatedRow = validation.getByTestId('pdf-validation-row');
    await expect(validatedRow).toHaveCount(1);
    await expect(validatedRow).toContainText('1,413 €');
    await expect(validatedRow).toContainText('1,710 €');
    await validatedRow.getByText('Ver regla', { exact: true }).click();
    await expect(validatedRow).toContainText('Con IVA: 1.710');
    await validation.getByLabel('Filtrar validación por tarifa').selectOption('TAX MOVING 24');
    await expect(validation.getByTestId('pdf-validation-row')).toContainText('PRECIO REFERENCIA');
    await expect(validation.getByTestId('pdf-validation-row')).toContainText('Coincide');
    await validation.getByLabel('Filtrar validación por tarifa').selectOption('SIN ENLACE');
    await expect(validation.getByTestId('pdf-validation-row')).toContainText('no tiene un origen');
    await validation.getByRole('button', { name: 'Volver a validar', exact: true }).click();
    await expect(validation.getByTestId('validation-review')).toHaveText(`${stationCount} por revisar`);
    await validation.getByRole('button', { name: 'Cerrar validación', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Validar tarifas PDF', exact: true })).toBeFocused();
    await page.getByPlaceholder('Filtrar por nombre o ubicación...').fill('');
    let checked = 0;
    for (const [tariff, id] of Object.entries({ ...tariffSources, 'CLIENTE ESPECIAL': 'CUSTOM:client' })) {
      await page.getByRole('button', { name: tariff, exact: true }).click();
      const actual = await page.locator('td[data-testid^="pdf-price-"]').evaluateAll(cells => Object.fromEntries(cells.map(cell => [cell.getAttribute('data-testid'), cell.textContent!.replace('€', '').trim()])));
      const rows = published.sources[id.startsWith('COMPRAS_') ? id : `SABANA_${id}`];
      expect(Object.keys(actual).length).toBe(Object.keys(rows).length * 2);
      for (const [station, price] of Object.entries(rows) as [string, { sinIva: number; conIva: number }][]) {
        const expected = tariff === 'TARIFA 12' && station === 'VALLECAS' ? published.sources.SABANA_T36.VALLECAS : ((tariff === 'DORADO' && station === 'ARCOS JALON') || (tariff === 'TARIFA ECO' && station === 'PETREM FIGUERES')) ? published.sources.COMPRAS_ESPECIAL_REF[station] : price;
        for (const field of ['sinIva', 'conIva'] as const) {
          expect(actual[`pdf-price-${station}-${field}`], `${tariff}/${station}/${field}`).toBe(format(expected[field]));
          checked++;
        }
      }
      if (tariff === 'TARIFA 12') for (const station of firstFive) for (const field of ['sinIva', 'conIva']) {
        expect(actual[`pdf-price-${station}-${field}`]).toBe(standard[`sabana-price-${station}-12-${field}`]);
      }
    }
    console.log('PDF_PRICE_CELLS_CHECKED', checked);
    await page.getByRole('button', { name: 'SIN ENLACE', exact: true }).click();
    await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('Sin origen');
    await page.getByRole('button', { name: /Descargar \/ Imprimir PDF/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No se puede generar' })).toContainText('No se puede generar');
    await page.getByRole('button', { name: 'Compras', exact: true }).click();
    await page.getByLabel('TORREJON GOA curr', { exact: true }).fill('1,400');
    await page.getByRole('button', { name: 'Tarifas Especiales', exact: true }).click();
    await page.getByLabel('Precio especial referencia TORREJON', { exact: true }).fill('1,510');
    await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
    await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Postes', exact: true }).click();
    await page.getByLabel('HVO Alfajarin sin IVA', { exact: true }).fill('1,800');
    await page.getByRole('button', { name: 'PDFs & Clientes', exact: true }).click();
    await page.getByRole('button', { name: 'TAX MOVING 24', exact: true }).click();
    await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,510');
    await expect(page.getByTestId('pdf-price-TORREJON-conIva')).toContainText('1,827');
    await page.getByRole('button', { name: 'TARIFA 12', exact: true }).click();
    await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,523');
    await expect(page.getByTestId('pdf-price-TORREJON-conIva')).toContainText('1,710');
    await expect(page.getByTestId('pdf-hvo-alfajarinSinIva')).toContainText('1,800');
    await expect(page.getByTestId('pdf-hvo-alfajarinConIva')).toContainText('1,999');
    await page.locator('input[type="date"]').last().fill('2026-10-20');
    await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,523');
    await page.evaluate(() => { (window as any).printCalls = 0; window.print = () => { (window as any).printCalls++; }; });
    await page.getByRole('button', { name: /Descargar \/ Imprimir PDF/ }).click();
    expect(await page.evaluate(() => (window as any).printCalls)).toBe(1);
    await page.pdf({ path: testInfo.outputPath('tarifa12.pdf'), format: 'A4', printBackground: true });
    await expect.poll(async () => (await (await request.get('/api/sync')).json()).data.efi_postes_data_v2?.hvoAlfajarinSinIva).toBe('1,800');
    await page.reload();
    await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toHaveValue('1,400');
    await page.getByRole('button', { name: 'PDFs & Clientes', exact: true }).click();
    await page.getByRole('button', { name: 'TARIFA 12', exact: true }).click();
    await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,523');
    await expect(page.getByTestId('pdf-hvo-alfajarinSinIva')).toContainText('1,800');
    await page.getByRole('button', { name: 'Modificar Origen de Datos', exact: true }).click();
    const origins = page.getByRole('dialog', { name: 'Orígenes de precios' });
    await origins.getByLabel('Origen Sábana TORREJON', { exact: true }).selectOption('SABANA_T24');
    expect(await origins.locator('option[value="MANUAL"]').count()).toBe(0);
    await origins.getByRole('button', { name: 'Cerrar orígenes', exact: true }).click();
    await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,424');
    await expect.poll(async () => (await (await request.get('/api/sync')).json()).data.efi_pdf_station_source_mapping_v1?.['TARIFA 12::TORREJON']?.sourceType).toBe('SABANA_T24');
    await page.getByRole('button', { name: 'Añadir Nueva Tarifa', exact: true }).click();
    await page.getByPlaceholder('Ej: TARIFA 32, TARIFA GRUPO LOGISTICO').fill('CLIENTE NUEVO');
    await page.getByLabel('Origen de nueva tarifa PDF', { exact: true }).selectOption('SABANA_CUSTOM:client');
    await page.getByRole('button', { name: 'Guardar y Usar Tarifa', exact: true }).click();
    await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,535');
    await expect.poll(async () => (await (await request.get('/api/sync')).json()).data.efi_pdf_station_source_mapping_v1?.['CLIENTE NUEVO::__DEFAULT__']?.sourceType).toBe('SABANA_CUSTOM:client');
    await page.reload();
    await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toHaveValue('1,400');
    await page.getByRole('button', { name: 'PDFs & Clientes', exact: true }).click();
    await page.getByRole('button', { name: 'TARIFA 12', exact: true }).click();
    await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,424');
    await page.getByRole('button', { name: 'CLIENTE NUEVO', exact: true }).click();
    await expect(page.getByTestId('pdf-price-TORREJON-sinIva')).toContainText('1,535');
  } finally {
    await page.close();
    const current = (await (await request.get('/api/sync')).json()).data;
    const data = Object.fromEntries([...new Set([...Object.keys(original), ...Object.keys(current)])].map(key => [key, key in original ? original[key] : null]));
    expect((await request.post('/api/sync', { data: { data, baseData: current } })).ok()).toBe(true);
  }
});
