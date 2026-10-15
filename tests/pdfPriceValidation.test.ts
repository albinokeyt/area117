import test from 'node:test';
import assert from 'node:assert/strict';
import { SabanaPrices } from '../src/lib/publishedPrices';
import { captureSabanaForValidation, registerSabanaValidationReader, SabanaValidationSnapshot, validatePdfPrices } from '../src/lib/pdfPriceValidation';
import { checkSabanaFormula } from '../src/lib/formulaValidation';

const date = '2026-10-15';
const live: SabanaValidationSnapshot = { date, tariffs: { 'CLIENTE NUEVO': 'SABANA_CUSTOM:one' }, details: {}, formulaIssues: [], sources: {
  SABANA_T12: { TORREJON: { sinIva: 1.413, conIva: 1.710 }, 'ES PISTA DE SILLA': { sinIva: 0, conIva: 0 } },
  SABANA_T36: { TORREJON: { sinIva: 1.5, conIva: 1.9 }, 'ES PISTA DE SILLA': { sinIva: 1.2, conIva: 1.6 } },
  COMPRAS_ESPECIAL_REF: { TORREJON: { sinIva: 1.409, conIva: 1.705 }, 'ES PISTA DE SILLA': { sinIva: 0, conIva: 0 } },
  'SABANA_CUSTOM:one': { TORREJON: { sinIva: 1, conIva: 2 }, 'ES PISTA DE SILLA': { sinIva: 0, conIva: 0 } },
} };
const run = (published: SabanaPrices | null = live, extra: Partial<Parameters<typeof validatePdfPrices>[0]> = {}) => validatePdfPrices({
  date, tariffs: [{ name: 'TARIFA 12' }, { name: 'TAX MOVING 24' }, { name: 'CLIENTE NUEVO' }],
  stations: [{ name: 'TORREJON' }, { name: 'PISTA DE SILLA' }],
  mapping: { 'TAX MOVING 24::__DEFAULT__': { sourceType: 'COMPRAS_ESPECIAL_REF', manualPriceSinIva: 999 } },
  published, live, isActive: (_, station) => station === 'TORREJON', ...extra,
});

test('validates every tariff/station including inactive ones, zeros, independent VAT and saved exceptions', () => {
  const report = run();
  assert.equal(report.rows.length, 6);
  assert.equal(report.tariffCount, 3);
  assert.equal(report.stationCount, 2);
  assert.ok(report.rows.every(row => row.status === 'ok'));
  assert.equal(report.rows.filter(row => !row.active).length, 3);
  assert.deepEqual(report.rows.find(row => row.tariff === 'TAX MOVING 24')?.expected, { sinIva: 1.409, conIva: 1.705 });
  assert.deepEqual(report.rows.find(row => row.tariff === 'CLIENTE NUEVO')?.expected, { sinIva: 1, conIva: 2 });
});

test('detects a real difference in either displayed VAT column against independently captured source', () => {
  const broken = structuredClone(live);
  broken.sources.SABANA_T12.TORREJON.sinIva = 1.414;
  broken.sources['SABANA_CUSTOM:one'].TORREJON.conIva = 1.999;
  const report = run(broken);
  assert.equal(report.rows.filter(row => row.status === 'difference').length, 2);
  assert.match(report.rows[0].messages.join(' '), /sin IVA/);
  assert.match(report.rows[4].messages.join(' '), /con IVA/);
  assert.equal(live.sources.SABANA_T12.TORREJON.sinIva, 1.413);
});

test('compares three decimals printed in PDFs without arbitrary tolerance', () => {
  const rounded = structuredClone(live);
  rounded.sources.SABANA_T12.TORREJON.sinIva = 1.41301;
  assert.equal(run(rounded).rows[0].status, 'ok');
  rounded.sources.SABANA_T12.TORREJON.sinIva = 1.4136;
  assert.equal(run(rounded).rows[0].status, 'difference');
});

test('flags an incorrect cached tariff link even if the two prices happen to coincide', () => {
  const broken = structuredClone(live);
  broken.tariffs['TARIFA 12'] = 'SABANA_T36';
  broken.sources.SABANA_T36.TORREJON = { ...live.sources.SABANA_T12.TORREJON };
  assert.equal(run(broken).rows[0].status, 'difference');
  assert.match(run(broken).rows[0].messages.join(' '), /Origen del PDF/);
});

test('missing dates, station origins, unknown tariffs and invalid formula results never pass', () => {
  assert.ok(run(null).rows.every(row => row.status === 'review'));
  assert.ok(run({ ...live, date: '2026-10-14' }).rows.every(row => row.status === 'review'));
  assert.ok(run(live, { live: null }).rows.every(row => row.status === 'review'));
  assert.ok(run(live, { tariffs: [{ name: 'SIN ENLACE' }] }).rows.every(row => row.status === 'review'));
  assert.equal(run(live, { mapping: { 'TARIFA 12::TORREJON': { sourceType: 'MANUAL', manualPriceSinIva: 3 } } }).rows[0].status, 'review');
  const broken = structuredClone(live);
  delete broken.sources.SABANA_T12.TORREJON;
  assert.equal(run(broken).rows[0].status, 'review');
  broken.sources.SABANA_T12.TORREJON = { sinIva: 1, conIva: NaN };
  assert.equal(run(broken).rows[0].status, 'review');
  const invalid = { ...live, details: { SABANA_T12: { TORREJON: { issues: ['Fórmula inválida'], sinFormula: '1 / 0' } } }, formulaIssues: [{ cell: 'STD_TORREJON_T12_sinIva', message: 'Fórmula inválida' }] };
  const report = run(live, { live: invalid });
  assert.equal(report.rows[0].status, 'review');
  assert.equal(report.rows[0].sinFormula, '1 / 0');
  assert.equal(report.formulaIssues.length, 1);
});

test('formula audit rejects unknown bracketed references, syntax, division by zero and stale numeric snapshots', () => {
  const formula = (rawFormula: string, evaluatedValue: number) => ({ rawFormula, evaluatedValue, updatedAt: '' });
  assert.match(checkSabanaFormula(formula('[COMPRAS:INEXISTENTE:P_VENTA]+1', 1), {})!, /Referencia ausente/);
  assert.match(checkSabanaFormula(formula('1 / 0', 1), {})!, /número válido/);
  assert.match(checkSabanaFormula(formula('1 +', 1), {})!, /sintaxis/);
  assert.match(checkSabanaFormula(formula('[P_VENTA]+0.012', 9), { 'COMPRAS:TORREJON:P_VENTA': 1.4 }, 'TORREJON')!, /cálculo actual/);
  assert.equal(checkSabanaFormula(formula('[P_VENTA]+0.012', 1.412), { 'COMPRAS:TORREJON:P_VENTA': 1.4 }, 'TORREJON'), null);
  assert.equal(checkSabanaFormula(formula('[COMPRAS:TORREJON:P_VENTA]', 0), { 'COMPRAS:TORREJON:P_VENTA': 0 }), null);
});

test('live reader is replaceable and unregistering an older render cannot erase the current one', () => {
  assert.equal(captureSabanaForValidation(), null);
  const old = registerSabanaValidationReader(() => null);
  const current = registerSabanaValidationReader(() => live);
  old();
  assert.equal(captureSabanaForValidation(), live);
  current();
  assert.equal(captureSabanaForValidation(), null);
});
