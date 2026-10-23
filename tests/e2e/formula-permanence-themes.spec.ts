import { test, expect } from './fixtures';
import { navigate } from './navigation';
import type { APIRequestContext, Page } from '@playwright/test';
test.use({ actionTimeout: 15000 });

const admin = { email: 'admin@efidataoil.com', password: 'admin123' };
const f = (rawFormula: string, evaluatedValue = 0) => ({ rawFormula, evaluatedValue, updatedAt: '2026-10-23T10:00:00Z' });
async function state(api: APIRequestContext) { return (await (await api.get('/api/sync')).json()).data; }
async function patch(api: APIRequestContext, data: any) { return api.post('/api/sync', { data: { data, baseData: await state(api) } }); }
async function editFormula(page: Page, formula: string) {
  await page.getByTestId('sabana-price-TORREJON-50-sinIva').click();
  await page.getByRole('dialog', { name: 'Editor de fórmula' }).getByLabel('Fórmula', { exact: true }).fill(formula);
  await page.getByRole('button', { name: 'Guardar Fórmula', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Editor de fórmula' })).toBeHidden();
}

test('saved definitions survive dates, live recalculation, closure and reload; explicit removal never revives a daily formula', async ({ page, request }) => {
  test.setTimeout(180000);
  await request.post('/api/auth', { data: admin });
  const original = await state(request);
  const definition = f('=[COMPRAS:TORREJON:COMPRA_HOY]+0.060');
  try {
    const data = {
      ...Object.fromEntries(Object.keys(original).map(key => [key, null])),
      efi_compras_valid_from: '2026-10-23', efi_global_valid_from_date: '2026-10-23',
      efi_compras_data: { data: { TORREJON_GOA: { curr: '1,500', prev: '1,400', sale: '1,600', prevSale: '1,500', porte: '0,006', pase: '0,010', fin: '0,010' } }, modified: [], updatedAt: '2026-10-23T10:00:00Z' },
      efi_sabana_custom_formulas_global: { STD_TORREJON_T50_sinIva: definition },
      'efi_sabana_custom_formulas_2026-10-20': { STD_TORREJON_T50_sinIva: f('9.999') },
      efi_postes_custom_formulas_global: { POSTE_HVO_ALFAJARIN_SIN_IVA: f('=[COMPRAS:TORREJON:COMPRA_HOY]+0.1') },
      'efi_postes_custom_formulas_2026-10-20': { POSTE_HVO_ALFAJARIN_SIN_IVA: f('9.998') },
      efi_pdf_station_source_mapping_v1: { 'TARIFA 12::TORREJON': { sourceType: 'SABANA_T50' } },
      efi_export_custom_overrides_v1: { 'TARIFA TALAEXPRESS::73::1': { priceMode: 'SOURCE', sourceType: 'COMPRAS_ESPECIAL_REF', markupDiff: .012, codeA: 93, pago: 'MENSUAL' } },
    };
    expect((await patch(request, data)).ok()).toBe(true);
    await page.request.post('/api/auth', { data: admin });
    await page.goto('/');
    await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toHaveValue('1,500');
    await navigate(page, 'Sábana de Precios');
    const cell = page.getByTestId('sabana-price-TORREJON-50-sinIva');
    await expect(cell).toContainText('1,560');
    await page.getByLabel('Fecha de trabajo').fill('2026-10-20');
    await expect(cell).toContainText('1,560');
    await page.getByRole('button', { name: /^Formular(?: \d+)?$/ }).click();
    await editFormula(page, '=[COMPRAS:TORREJON:COMPRA_HOY]+0.070');
    expect((await state(request)).efi_sabana_custom_formulas_global.STD_TORREJON_T50_sinIva.rawFormula).toBe('=[COMPRAS:TORREJON:COMPRA_HOY]+0.070');
    await navigate(page, 'Compras');
    await page.getByLabel('TORREJON GOA curr', { exact: true }).fill('1,700');
    await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
    await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
    await navigate(page, 'Sábana de Precios');
    await expect(cell).toContainText('1,770');
    await navigate(page, 'Postes');
    await expect(page.getByTestId('postes-hvo-alfajarinSinIva')).toContainText('1,800');
    await navigate(page, 'Compras');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /Cierre.*Día/ }).click(); await download;
    await page.reload();
    await navigate(page, 'Sábana de Precios');
    await expect(cell).toContainText('1,770');
    const saved = await state(request);
    expect(saved.efi_postes_custom_formulas_global).toEqual(data.efi_postes_custom_formulas_global);
    expect(saved.efi_pdf_station_source_mapping_v1).toEqual(data.efi_pdf_station_source_mapping_v1);
    expect(saved.efi_export_custom_overrides_v1).toEqual(data.efi_export_custom_overrides_v1);
    await page.getByRole('button', { name: /^Formular(?: \d+)?$/ }).click();
    await cell.click();
    await page.getByRole('button', { name: 'Restablecer a Fórmula Original', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Editor de fórmula' })).toBeHidden();
    expect((await state(request)).efi_sabana_custom_formulas_global.STD_TORREJON_T50_sinIva).toBeUndefined();
    await page.reload(); await navigate(page, 'Sábana de Precios');
    await page.getByLabel('Fecha de trabajo').fill('2026-10-20');
    await expect(cell).not.toContainText('9,999');
    await expect(cell.locator('span', { hasText: 'fx' })).toHaveCount(0);
  } finally {
    await page.close();
    const current = await state(request);
    await patch(request, { ...Object.fromEntries(Object.keys(current).map(key => [key, null])), ...original });
  }
});

test('administrator designates and revokes formula access; server blocks forged edits and resets while ordinary purchase edits still save', async ({ page, request, browser }) => {
  await request.post('/api/auth', { data: admin });
  const initial = await state(request);
  const userContext = await browser.newContext();
  try {
    await request.patch('/api/users', { data: { id: '2', canManageFormulas: false } });
    await userContext.request.post('/api/auth', { data: { email: 'compras@efidataoil.com', password: 'compras123' } });
    const unauthorized = await userContext.request.patch('/api/users', { data: { id: '2', canManageFormulas: true } });
    expect(unauthorized.status()).toBe(403);
    for (const key of ['efi_sabana_custom_formulas_global','efi_postes_custom_formulas_global','efi_pdf_station_source_mapping_v1','efi_export_custom_overrides_v1','efi_sabana_tariff_source_mapping_v1','efi_sabana_custom_standard_tariffs_v1']) {
      const result = await patch(userContext.request, { [key]: { ATTACK: f('9.999') } });
      expect(result.status(), key).toBe(403);
    }
    expect((await patch(userContext.request, { compras_permission_probe: 'purchase edit allowed' })).ok()).toBe(true);
    const userPage = await userContext.newPage();
    await userPage.addLocatorHandler(userPage.getByRole('dialog', { name: /^Novedades / }), async () => {
      await userPage.getByRole('dialog', { name: /^Novedades / }).getByRole('button', { name: 'Entendido', exact: true }).click();
    });
    await userPage.goto('/');
    await navigate(userPage, 'Sábana de Precios');
    await expect(userPage.getByRole('button', { name: /^Formular(?: \d+)?$/ })).toBeDisabled();
    await page.request.post('/api/auth', { data: admin }); await page.goto('/'); await navigate(page, 'Usuarios');
    const permission = page.getByLabel('Gestionar fórmulas Compañero 1 (Compras)', { exact: true });
    await permission.check();
    await expect(permission).toBeChecked();
    await userPage.reload(); await navigate(userPage, 'Sábana de Precios');
    await expect(userPage.getByRole('button', { name: /^Formular(?: \d+)?$/ })).toBeEnabled();
    expect((await patch(userContext.request, { efi_sabana_custom_formulas_global: { PERMISSION_PROBE: f('2.345') } })).ok()).toBe(true);
    await permission.uncheck(); await expect(permission).not.toBeChecked();
    // Already-authenticated session loses permission without signing in again.
    expect((await patch(userContext.request, { efi_sabana_custom_formulas_global: {} })).status()).toBe(403);
    expect((await state(request)).efi_sabana_custom_formulas_global.PERMISSION_PROBE.rawFormula).toBe('2.345');
  } finally {
    await page.close(); await userContext.close();
    await request.patch('/api/users', { data: { id: '2', canManageFormulas: false } });
    const current = await state(request);
    await patch(request, { ...Object.fromEntries(Object.keys(current).map(key => [key, null])), ...initial });
  }
});

test('themes persist per account, highlight the entire row and keep official PDF colours', async ({ page, request, browser }, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1700, height: 1050 });
  await page.request.post('/api/auth', { data: admin }); await page.goto('/');
  const theme = page.getByLabel('Tema visual', { exact: true });
  await expect(theme).toBeEnabled();
  try {
    for (const value of ['dark','cream']) {
      await theme.selectOption(value);
      await expect(page.locator('html')).toHaveAttribute('data-efi-theme', value);
      const row = page.locator('.efi-purchase-table tbody tr').first();
      await row.hover();
      const shadows = await row.locator('td').evaluateAll(cells => cells.map(cell => getComputedStyle(cell).boxShadow));
      expect(shadows.length).toBeGreaterThan(8); expect(shadows.every(shadow => shadow !== 'none')).toBe(true);
      await page.screenshot({ path: info.outputPath(`compras-${value}.png`) });
      await navigate(page, 'Sábana de Precios');
      await page.getByTestId('sabana-price-TORREJON-12-sinIva').hover();
      await expect(page.locator('.efi-view.is-active')).toHaveCSS('opacity', '1');
      await page.screenshot({ path: info.outputPath(`sabana-${value}.png`) });
      await navigate(page, 'PDFs & Clientes');
      const header = page.locator('.printable-document thead').first();
      const before = await header.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, text: getComputedStyle(el).color }));
      await page.emulateMedia({ media: 'print' });
      expect(await header.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgb(35, 49, 71)');
      await page.emulateMedia({ media: 'screen' });
      await expect(page.locator('.efi-view.is-active')).toHaveCSS('opacity', '1');
      expect(before.background).not.toBe('rgb(35, 49, 71)');
      await page.screenshot({ path: info.outputPath(`pdf-${value}.png`) });
      await navigate(page, 'Compras');
      await page.reload();
      await expect(theme).toHaveValue(value);
      expect((await (await page.request.get('/api/preferences')).json()).theme).toBe(value);
    }
    const other = await browser.newContext();
    await other.request.post('/api/auth', { data: { email: 'efi@efidataoil.com', password: 'efi123' } });
    expect((await (await other.request.get('/api/preferences')).json()).theme).toBe('crystal');
    await other.close();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: info.outputPath('tema-movil.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await page.request.put('/api/preferences', { data: { theme: 'crystal' } }); }
});

test('formula editor keeps failed saves visible and retries before closing', async ({ page, request }) => {
  await request.post('/api/auth', { data: admin });
  const original = await state(request);
  try {
    await page.request.post('/api/auth', { data: admin }); await page.goto('/'); await navigate(page, 'Sábana de Precios');
    await page.getByRole('button', { name: /^Formular(?: \d+)?$/ }).click();
    await page.getByTestId('sabana-price-TORREJON-50-sinIva').click();
    await page.getByLabel('Fórmula', { exact: true }).fill('=[COMPRAS:TORREJON:COMPRA_HOY]+0.077');
    await page.route('**/api/sync', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, json: { error: 'Prueba de guardado fallido' } }) : route.continue());
    await page.getByRole('button', { name: 'Guardar Fórmula', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Editor de fórmula' }).getByRole('alert')).toContainText('Guardado pendiente');
    await expect(page.getByLabel('Fórmula', { exact: true })).toHaveValue('=[COMPRAS:TORREJON:COMPRA_HOY]+0.077');
    await page.unroute('**/api/sync');
    await page.getByRole('button', { name: 'Guardar Fórmula', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Editor de fórmula' })).toBeHidden();
    expect((await state(request)).efi_sabana_custom_formulas_global.STD_TORREJON_T50_sinIva.rawFormula).toBe('=[COMPRAS:TORREJON:COMPRA_HOY]+0.077');
  } finally { await page.close(); const current = await state(request); await patch(request, { ...Object.fromEntries(Object.keys(current).map(key => [key, null])), ...original }); }
});
