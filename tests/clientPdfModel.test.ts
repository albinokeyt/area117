import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientPdfFilename, pdfValidityDate, mergePdfExportNames, parsePdfExportNames, snapshotClientPdfs } from '../src/lib/clientPdfModel';

test('export aliases preserve original tariff identity; order and validity date are resolved for every download', () => {
  const names = { 'TARIFA 12': 'TARIFA NEXO', 'TARIFA 18': 'ESTACIÓN ÁREA' };
  assert.equal(clientPdfFilename('TARIFA 12', 0, names, '2026-11-04'), '01 TARIFA NEXO VALIDA A PARTIR DE 04-11-2026.pdf');
  assert.equal(clientPdfFilename('TARIFA 12', 3, names, '2026-11-05'), '04 TARIFA NEXO VALIDA A PARTIR DE 05-11-2026.pdf');
  assert.equal(clientPdfFilename('TARIFA 18', 1, names, '2026-11-04'), '02 ESTACIÓN ÁREA VALIDA A PARTIR DE 04-11-2026.pdf');
  assert.equal(clientPdfFilename('TARIFA 24', 9, names, '2026-11-04'), '10 TARIFA 24 VALIDA A PARTIR DE 04-11-2026.pdf');
  assert.equal(names['TARIFA 12'], 'TARIFA NEXO');
});

test('file names cannot introduce paths and valid leap days are accepted without timezone shifts', () => {
  assert.equal(clientPdfFilename('TARIFA 12', 0, { 'TARIFA 12': '../NEXO\\ÁREA:*?.PDF' }, '2028-02-29'), '01 ..-NEXO-ÁREA--- VALIDA A PARTIR DE 29-02-2028.pdf');
  assert.equal(pdfValidityDate('2026-11-04'), '04/11/2026');
  for (const date of ['', '2026-02-29', '2026-13-01', '2026-11-31', '04/11/2026']) assert.throws(() => pdfValidityDate(date));
  assert.throws(() => clientPdfFilename('TARIFA 12', -1, {}, '2026-11-04'));
});

test('names are merged per tariff without losing unrelated aliases or silently replacing another user’s change', () => {
  assert.deepEqual(mergePdfExportNames({ A: 'A1' }, { A: 'A2' }, { A: 'A1', B: 'B2' }), { A: 'A2', B: 'B2' });
  assert.deepEqual(mergePdfExportNames({ A: 'A1' }, { A: '' }, { A: 'A1', B: 'B2' }), { B: 'B2' });
  assert.deepEqual(mergePdfExportNames({ A: 'A1' }, { A: 'A2' }, { A: 'A2' }), { A: 'A2' });
  assert.throws(() => mergePdfExportNames({ A: 'A1' }, { A: 'A2' }, { A: 'A3' }), /Otro usuario/);
  assert.deepEqual(parsePdfExportNames('{"A":"A1"}'), { A: 'A1' });
  for (const raw of ['[]', '{"A":12}', JSON.stringify({ A: 'x'.repeat(101) })]) assert.throws(() => parsePdfExportNames(raw));
});

const input = () => ({
  tariffs: [{ name: 'TARIFA 12' }, { name: 'TARIFA 18' }], allTariffs: [{ name: 'TARIFA 12' }, { name: 'TARIFA 18' }],
  names: { 'TARIFA 12': 'NEXO' }, validFrom: '2026-11-04', pricingDate: '2026-11-04', stations: [{ name: 'A' }, { name: 'B' }],
  isActive: (tariff: string, station: string) => tariff === 'TARIFA 12' || station === 'B',
  price: () => ({ sinIva: 0, conIva: 1.999 }), metadata: () => ({ bandera: 'AREA117', ubicacion: 'Madrid' }),
  labels: () => ['RUTA A2'], includeHvo: (tariff: string) => tariff === 'TARIFA 12',
  hvo: { date: '2026-11-04', alfajarin: { sinIva: 1.578, conIva: 1.909 }, valdemoro: { sinIva: 1.56, conIva: 1.887 } },
});
test('a batch freezes each tariff’s active stations, independent VAT, labels and HVO before asynchronous generation', () => {
  const data = input(), snapshot = snapshotClientPdfs(data);
  assert.deepEqual(snapshot.map(doc => doc.rows.map(row => row.station)), [['A', 'B'], ['B']]);
  assert.equal(snapshot[0].tariff, 'TARIFA 12');
  assert.equal(snapshot[0].rows[0].sinIva, 0); assert.equal(snapshot[0].rows[0].conIva, 1.999);
  assert.equal(snapshot[1].hvo, null);
  data.hvo.alfajarin.sinIva = 99; data.names['TARIFA 12'] = 'CAMBIO';
  assert.equal(snapshot[0].hvo!.alfajarin.sinIva, 1.578); assert.match(snapshot[0].filename, /^01 NEXO /);
});
test('a missing VAT value or stale HVO blocks the batch before producing files; empty selections remain deliberate', () => {
  assert.throws(() => snapshotClientPdfs({ ...input(), price: () => ({ sinIva: 1.4, conIva: NaN }) }), /TARIFA 12.*A/);
  assert.throws(() => snapshotClientPdfs({ ...input(), hvo: { ...input().hvo, date: '2026-11-03' } }), /HVO/);
  assert.throws(() => snapshotClientPdfs({ ...input(), tariffs: [] }), /No hay tarifas/);
  assert.equal(snapshotClientPdfs({ ...input(), isActive: () => false, includeHvo: () => false })[0].rows.length, 0);
});
