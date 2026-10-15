import { test, expect } from './fixtures';

test('PDF validator catches invalid formulas, includes inactive stations and invalidates the report after remote edits', async ({ page, request }, testInfo) => {
  await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
  const original = (await (await request.get('/api/sync')).json()).data;
  const date = '2026-10-15';
  const formula = (rawFormula: string, evaluatedValue: number) => ({ rawFormula, evaluatedValue, updatedAt: new Date().toISOString() });
  try {
    const purchases = { data: { TORREJON_GOA: { curr: '1,290', sale: '1,400', isCustomSale: true } }, modified: [], updatedAt: new Date().toISOString() };
    const data = { ...Object.fromEntries(Object.keys(original).map(key => [key, null])),
      efi_compras_valid_from: date, efi_global_valid_from_date: date, efi_compras_data: purchases, [`efi_purchases_${date}`]: purchases,
      efi_custom_tariffs_catalog_v5: [{ name: 'TARIFA 12', markup: 999 }, { name: 'TARIFA 24', markup: 999 }],
      efi_tariff_active_stations_map: { 'TARIFA 12': [] },
      efi_sabana_custom_formulas_global: { STD_TORREJON_T12_conIva: formula('1 / 0', 1.710) },
    };
    expect((await request.post('/api/sync', { data: { data, baseData: original } })).ok()).toBe(true);
    await page.setViewportSize({ width: 1500, height: 1000 });
    await page.goto('/');
    await page.getByLabel('Usuario o correo electrónico').fill('admin@efidataoil.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page.getByLabel('TORREJON GOA sale', { exact: true })).toHaveValue('1,400');
    await page.getByRole('button', { name: 'PDFs & Clientes', exact: true }).click();
    await expect.poll(async () => (await (await request.get('/api/sync')).json()).data.efi_sabana_prices_v1?.sources?.SABANA_T12?.TORREJON?.conIva).toBe(1.710);
    const beforeValidation = (await (await request.get('/api/sync')).json()).version;
    await page.getByRole('button', { name: 'Validar tarifas PDF', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Validación de tarifas PDF', exact: true });
    await expect(dialog.getByTestId('validation-review')).toHaveText('1 por revisar');
    await expect(dialog).toContainText('Fórmulas de Sábana por revisar (1)');
    await dialog.getByLabel('Filtrar validación por tarifa').selectOption('TARIFA 12');
    await dialog.getByLabel('Buscar en validación').fill('TORREJON');
    const row = dialog.getByTestId('pdf-validation-row');
    await expect(row).toContainText('Desactivada en PDF');
    await expect(row).toContainText('Fórmula con IVA: El resultado no es un número válido');
    await expect(row).toContainText('1,710 €');
    await dialog.getByRole('button', { name: 'Volver a validar', exact: true }).click();
    expect((await (await request.get('/api/sync')).json()).version).toBe(beforeValidation);

    // Another user's correction arrives through the normal background PostgreSQL sync.
    const current = (await (await request.get('/api/sync')).json()).data;
    const corrected = { STD_TORREJON_T12_conIva: formula('1.999', 1.999) };
    expect((await request.post('/api/sync', { data: { data: { efi_sabana_custom_formulas_global: corrected, [`efi_sabana_custom_formulas_${date}`]: corrected }, baseData: current } })).ok()).toBe(true);
    await page.waitForTimeout(11000); // The normal sync defers pulls for 10s after user activity.
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(dialog.getByRole('status')).toContainText('Informe desactualizado', { timeout: 15000 });
    await expect.poll(async () => (await (await request.get('/api/sync')).json()).data.efi_sabana_prices_v1?.sources?.SABANA_T12?.TORREJON?.conIva).toBe(1.999);
    await dialog.getByRole('button', { name: 'Volver a validar', exact: true }).click();
    await expect(dialog.getByTestId('validation-review')).toHaveText('0 por revisar');
    await expect(dialog.getByRole('status')).toContainText('Todos los precios PDF coinciden');
    await expect(row).toContainText('1,999 €');
    await page.screenshot({ path: testInfo.outputPath('validacion-tarifas-pdf.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Validar tarifas PDF', exact: true })).toBeFocused();
  } finally {
    await page.close();
    const current = (await (await request.get('/api/sync')).json()).data;
    const data = Object.fromEntries([...new Set([...Object.keys(original), ...Object.keys(current)])].map(key => [key, key in original ? original[key] : null]));
    expect((await request.post('/api/sync', { data: { data, baseData: current } })).ok()).toBe(true);
  }
});
