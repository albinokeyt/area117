import test from 'node:test';
import assert from 'node:assert/strict';
import { pdfStationSource, pdfTariffSource, publishedStationPrice, SabanaPrices } from '../src/lib/publishedPrices';

const prices: SabanaPrices = { date: '2026-10-15', tariffs: { 'MI TARIFA': 'SABANA_CUSTOM:one' }, sources: {
  SABANA_T12: { TORREJON: { sinIva: 1.413, conIva: 1.710 }, 'ES PISTA DE SILLA': { sinIva: 0, conIva: 0 }, 'ARCOS JALON': { sinIva: 1.2, conIva: 1.9 } },
} };

test('PDF resolves all current tariff names to corresponding Sabana columns', () => {
  const expected = {
    'TARIFA 12': 'T12', 'TARIFA 18': 'T18', 'T18 - PISTA DE SILLA': 'T18', 'TARIFA 24': 'T24',
    'TARIFA 36': 'T36', 'T36 - PISTA DE SILLA': 'T36', 'ESPECIAL COMPLETO': 'C0',
    'TARIFA 40': 'T40', 'TARIFA 42': 'T42', 'TARIFA 47': 'T47', 'TARIFA 50': 'T50',
    'TARIFA 60': 'T60', 'T60 - PISTA DE SILLA': 'T60', AMAEXO: 'T36', E100: 'T36',
    'TARIFA ECO': 'ECOTRANS', DORADO: 'ESTEBAN', HIQI: 'T36', 'NORPETROL 24': 'T24',
    ROR: 'ROR', TARJETERA: 'T36', 'TAX MOVING 24': 'T24', TORTUGA: 'T36', VRIO: 'T24',
  };
  for (const [name, source] of Object.entries(expected)) assert.equal(pdfTariffSource(name), `SABANA_${source}`, name);
  assert.equal(pdfTariffSource('  mí   tárifa ', prices), 'SABANA_CUSTOM:one');
});

test('PDF copies both independent cells, keeps zero and resolves exact station aliases', () => {
  assert.deepEqual(publishedStationPrice(prices, prices.date, 'SABANA_T12', 'TORREJON'), { sinIva: 1.413, conIva: 1.710 });
  assert.deepEqual(publishedStationPrice(prices, prices.date, 'SABANA_T12', 'pista de silla'), { sinIva: 0, conIva: 0 });
  assert.deepEqual(publishedStationPrice(prices, prices.date, 'SABANA_T12', 'ARCOS'), { sinIva: 1.2, conIva: 1.9 });
});

test('missing or outdated sources never invent a fixed price or VAT', () => {
  assert.equal(publishedStationPrice(prices, '2026-10-16', 'SABANA_T12', 'TORREJON'), null);
  assert.equal(publishedStationPrice(prices, prices.date, 'SABANA_T12', 'TORREJON NUEVO'), null);
  assert.equal(publishedStationPrice(prices, prices.date, 'SABANA_MISSING', 'TORREJON'), null);
  assert.equal(pdfTariffSource('INVENTADA'), null);
  assert.equal(publishedStationPrice({ ...prices, sources: { bad: { TORREJON: { sinIva: 1, conIva: NaN } } } }, prices.date, 'bad', 'TORREJON'), null);
});

test('explicit station and default Sabana origins take precedence; saved commercial exceptions are kept as references', () => {
  const mapping = { 'TARIFA 12::TORREJON': { sourceType: 'SABANA_T36' }, 'TARIFA 12::__DEFAULT__': { sourceType: 'SABANA_T24' } };
  assert.equal(pdfStationSource('TARIFA 12', 'TORREJON', mapping, prices), 'SABANA_T36');
  assert.equal(pdfStationSource('TARIFA 12', 'MADRID', mapping, prices), 'SABANA_T24');
  for (const sourceType of ['MANUAL', 'COMPRAS_ESPECIAL_REF']) {
    assert.equal(pdfStationSource('TARIFA 12', 'TORREJON', { 'TARIFA 12::TORREJON': { sourceType, manualPriceSinIva: 999 } }, prices), sourceType);
    // Retaining a mapping never authorizes a missing or fixed publication.
    assert.equal(publishedStationPrice(prices, prices.date, sourceType, 'TORREJON'), null);
  }
  assert.equal(pdfStationSource('TARIFA 12', 'TORREJON', { 'TARIFA 12::TORREJON': { sourceType: 'DEFAULT' } }, prices), 'SABANA_T12');
});
