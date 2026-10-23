import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceStorage } from '../src/lib/workspaceStorage';
import { loadSabanaFormulas, saveSabanaFormula, removeSabanaFormula, clearAllSabanaFormulas, loadPostesFormulas, savePostesFormula, clearAllPostesFormulas, getProgramVariables, reevaluateAllSabanaFormulas } from '../src/lib/sabanaFormulaEngine';
import { assertFormulaPermission, canManageFormulas, FormulaPermissionError } from '../src/lib/formulaPermissions';
import { getStationsCatalog, getStationExcelCosts, getAllStations, saveStationsCatalog } from '../src/lib/stationsService';
(globalThis as any).window = { dispatchEvent() {} };
const f = (rawFormula: string, updatedAt = '2026-10-23') => ({ rawFormula, evaluatedValue: 999, updatedAt });

test('global definitions persist across dates; editing and deleting never revive old daily copies', () => {
  for (const [scope, load, save, clear] of [
    ['sabana', loadSabanaFormulas, saveSabanaFormula, clearAllSabanaFormulas],
    ['postes', loadPostesFormulas, savePostesFormula, clearAllPostesFormulas],
  ] as const) {
    workspaceStorage.clear();
    workspaceStorage.setItem(`efi_${scope}_custom_formulas_2026-10-20`, JSON.stringify({ A: f('1', '2026-10-20') }));
    save('2026-10-23', 'A', f('2'));
    assert.equal(load('2026-10-20').A.rawFormula, '2');
    assert.equal(load('2027-01-01').A.rawFormula, '2');
    clear('2026-10-23');
    assert.deepEqual(load('2026-10-20'), {});
  }
});

test('legacy daily-only formulas migrate without dropping cells and global empty registry is authoritative', () => {
  workspaceStorage.clear();
  workspaceStorage.setItem('efi_sabana_custom_formulas_2026-10-20', JSON.stringify({ A: f('1', '2026-10-20'), B: f('3') }));
  workspaceStorage.setItem('efi_sabana_custom_formulas_2026-10-21', JSON.stringify({ A: f('2', '2026-10-21') }));
  assert.equal(loadSabanaFormulas('2026-10-20').A.rawFormula, '2');
  assert.equal(loadSabanaFormulas('2027-01-01').B.rawFormula, '3');
  saveSabanaFormula('2026-10-23', 'C', f('4'));
  removeSabanaFormula('2026-10-23', 'A');
  assert.equal(loadSabanaFormulas('2026-10-20').A, undefined);
  assert.equal(loadSabanaFormulas('2026-10-20').B.rawFormula, '3');
});

test('live cross-window calculations resolve definitions without rewriting saved formulas or timestamps', () => {
  workspaceStorage.clear();
  workspaceStorage.setItem('efi_compras_data', JSON.stringify({ data: { TORREJON_GOA: { curr: '1,500', sale: '1,600' } } }));
  const postes = { POSTE_HVO_ALFAJARIN_SIN_IVA: f('=[COMPRAS:TORREJON:COMPRA_HOY]+0.1') };
  const sabana = { STD_TORREJON_T50_sinIva: f('=[POSTES:HVO_ALFAJARIN_SIN_IVA]+0.2') };
  workspaceStorage.setItem('efi_postes_custom_formulas_global', JSON.stringify(postes));
  workspaceStorage.setItem('efi_sabana_custom_formulas_global', JSON.stringify(sabana));
  let writes = 0; const unsubscribe = workspaceStorage.subscribe(key => { if (key.includes("custom_formulas")) writes++; });
  assert.equal(getProgramVariables('2026-10-20').map['SABANA:TORREJON:T50_SIN_IVA'], 1.8);
  assert.equal(reevaluateAllSabanaFormulas(sabana, '2026-10-24').STD_TORREJON_T50_sinIva.evaluatedValue, 1.8);
  assert.equal(writes, 0); unsubscribe();
  assert.deepEqual(loadSabanaFormulas('2026-10-24'), sabana);
});

test('only designated users can change definitions, sources, resets and EFI rules; purchases and recalculated results remain writable', () => {
  const user = { role: 'COMPANERO_1' };
  const key = 'efi_sabana_custom_formulas_global';
  const before = { [key]: { A: f('1') } };
  assert.equal(canManageFormulas(user), false);
  assert.equal(canManageFormulas({ role: 'ADMIN' }), true);
  assert.equal(canManageFormulas({ role: 'VISITOR', canManageFormulas: true }), false);
  assert.throws(() => assertFormulaPermission(before, {}, user), FormulaPermissionError);
  assert.throws(() => assertFormulaPermission({ efi_sabana_custom_formulas_legacy: { A: f('1') } }, { efi_sabana_custom_formulas_legacy: { A: f('1') }, [key]: {} }, user), FormulaPermissionError);
  assert.throws(() => assertFormulaPermission(before, { [key]: { A: f('2') } }, user), FormulaPermissionError);
  assert.doesNotThrow(() => assertFormulaPermission(before, { [key]: { A: { ...f('1'), evaluatedValue: 4 } }, efi_compras_data: { any: 'edit' } }, user));
  assert.doesNotThrow(() => assertFormulaPermission(before, {}, { ...user, canManageFormulas: true }));
  for (const k of ['efi_pdf_station_source_mapping_v1','efi_sabana_tariff_source_mapping_v1','efi_export_custom_overrides_v1','efi_sabana_custom_block_tariffs_v1','efi_custom_tariffs_catalog_v5','efi_export_deleted_rows_v1']) {
    assert.throws(() => assertFormulaPermission({}, { [k]: { rule: 'changed' } }, user), FormulaPermissionError);
  }
});

test('calculation catalog readers stay current while unsaved station edits remain isolated', () => {
  workspaceStorage.clear();
  const editable = getStationsCatalog();
  const station = editable.propias[0].name;
  const original = getStationExcelCosts()[station].porte;
  editable.costs[station].porte = .123;
  assert.equal(getStationExcelCosts()[station].porte, original);
  assert.equal(getAllStations()[0].name, station);
  saveStationsCatalog(editable);
  assert.equal(getStationExcelCosts()[station].porte, .123);
});
