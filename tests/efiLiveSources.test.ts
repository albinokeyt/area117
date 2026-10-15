import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceStorage } from '../src/lib/workspaceStorage';
import { getLivePriceContext, resolveLivePrice, stationIdentity } from '../src/lib/livePriceSources';
import { getProgramVariables } from '../src/lib/sabanaFormulaEngine';
import { buildImportacionTable } from '../src/lib/excelExportService';
const date = '2026-10-15';
const set = (key: string, value: unknown) => workspaceStorage.setItem(key, JSON.stringify(value));
const purchase = (sale: string) => set('efi_compras_data', { data: { TORREJON_GOA: { sale, curr: '1,2', porte: '0', pase: '0', fin: '0' } }, updatedAt: '2026-10-15T14:00:00Z' });
const row = (name: string, rows = buildImportacionTable(date, '2026-10-16', '2026-10-31')) => rows.find(r => r[8] === name && r[1] === 73 && r[2] === 1)!;
beforeEach(() => {
  (globalThis as any).window = {};
  workspaceStorage.clear();
  purchase('1,400');
  set('efi_special_rates_b50_f82_v4', [{ name: 'TORREJON', refPrice: '', actualPrice: '' }]);
});
afterEach(() => { workspaceStorage.clear(); delete (globalThis as any).window; });
test('special origin reads the displayed reference, derived values, overrides and zero', () => {
  assert.equal(resolveLivePrice('ESPECIAL_REF', 'GANESHA TORREJON', getLivePriceContext(date)), 1.704);
  purchase('1,500');
  assert.equal(resolveLivePrice('ESPECIAL_REF', 'TORREJON', getLivePriceContext(date)), 1.825);
  set('efi_special_rates_b50_f82_v4', [{ name: 'TORREJON', isCustomRef: true, refPrice: '0' }]);
  assert.equal(resolveLivePrice('ESPECIAL_REF', 'TORREJON', getLivePriceContext(date)), 0);
  assert.equal(stationIdentity('PETREM TRUCKS FIGUERES'), stationIdentity('PETREM FIGUERES'));
});
test('old source overrides ignore cached PVP, follow tomorrow and preserve metadata and global dates', () => {
  set('efi_export_custom_overrides_v1', { 'TARIFA 12::73::1': { pvp: 1.780, sourceType: 'ESPECIAL_REF', markupDiff: .01, codeA: 93, pago: 'MENSUAL', initialDate: '01/08/2025', finalDate: '20/08/2025' } });
  assert.deepEqual(row('TARIFA 12').slice(0,6), [93,73,1,'16/10/2026','31/10/2026',1.714]);
  purchase('1,500');
  assert.equal(row('TARIFA 12', buildImportacionTable('2026-10-16'))[5], 1.835);
  const cfg = workspaceStorage.readJson<any>('efi_export_custom_overrides_v1')!['TARIFA 12::73::1'];
  assert.equal(cfg.sourceType, 'ESPECIAL_REF');
  assert.equal(cfg.pvp, 1.780);
});
test('explicit manual prices survive, including previous prepago magic numbers', () => {
  set('efi_export_custom_overrides_v1', { 'TARIFA PREPAGO 20::73::1': { priceMode: 'DIRECT', manualPriceConIva: 1.802 } });
  assert.equal(row('TARIFA PREPAGO 20')[5], 1.802);
  purchase('1,500');
  assert.equal(row('TARIFA PREPAGO 20')[5], 1.802);
});
test('EFI references resolve later rows dynamically and reject cycles and missing sources', () => {
  set('efi_export_custom_overrides_v1', { 'TARIFA 12::73::1': { sourceType: 'EFI_TARIFA_18', markupDiff: .01 }, 'TARIFA 18::73::1': { sourceType: 'ESPECIAL_REF' } });
  assert.equal(row('TARIFA 12')[5], 1.714);
  set('efi_export_custom_overrides_v1', { 'TARIFA 12::73::1': { sourceType: 'EFI_TARIFA_18' }, 'TARIFA 18::73::1': { sourceType: 'EFI_TARIFA_12' } });
  assert.equal(row('TARIFA 12')[5], null);
  assert.equal(row('TARIFA 18')[5], null);
  set('efi_export_custom_overrides_v1', { 'TARIFA 12::73::1': { sourceType: 'SABANA_MISSING', pvp: 99 } });
  assert.equal(row('TARIFA 12')[5], null);
});
test('source chooses exact final VAT from Sabana, not a multiplication of the other cell', () => {
  set('efi_sabana_prices_v1', { date, tariffs: { 'TARIFA 12': 'SABANA_T12' }, sources: { SABANA_T12: { TORREJON: { sinIva: 1, conIva: 1.999 } } } });
  assert.equal(resolveLivePrice('SABANA_T12', 'GANESHA TORREJON', getLivePriceContext(date)), 1.999);
  assert.equal(row('TARIFA 12')[5], 1.999);
});

test('source alias matching is exact and missing stations never borrow another price', () => {
  const context = getLivePriceContext(date);
  assert.equal(resolveLivePrice('COMPRAS_PRECIO_COMPRA', 'TORREJON NUEVO', context), null);
  assert.equal(resolveLivePrice('ESPECIAL_REF', 'TORREJON NUEVO', context), null);
  purchase('0');
  assert.equal(getProgramVariables(date).map['ESPECIAL:TORREJON:REF'], 0);
});
test('Postes origins respect current formulas and custom GOB transfer prices', () => {
  const context = getLivePriceContext(date);
  context.postes = { postes: { ARCOS: { goa: '1,600', gasolina: '1,700' } }, gasoleoBRows: { ARCOS: { compra: '1,000', transfer: '1,100' } }, modified: ['gasb_transfer_ARCOS'] };
  context.postesFormulas = { POSTE_ARCOS_GOA: { evaluatedValue: 1.999 }, POSTE_GASB_ARCOS_TRANSFER_CON_IVA: { evaluatedValue: 2.222 } };
  assert.equal(resolveLivePrice('POSTES_GOA', 'ARCOS JALON', context), 1.999);
  assert.equal(resolveLivePrice('POSTES_GAS95', 'ARCOS JALON', context), 1.700);
  assert.equal(resolveLivePrice('POSTES_GOB', 'ARCOS JALON', context), 2.222);
  context.postesFormulas = {};
  assert.equal(resolveLivePrice('POSTES_GOB', 'ARCOS JALON', context), 1.331);
  context.postes.modified = [];
  assert.equal(resolveLivePrice('POSTES_GOB', 'ARCOS JALON', context), 1.231);
});
