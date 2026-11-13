import { test } from 'node:test';
import assert from 'node:assert/strict';
import { utils } from 'xlsx';
import { planExcelImport } from '../src/lib/excelPriceImport';
import { DEFAULT_EXCEL_MAPPINGS, EXCEL_VALUES_KEY, excelVariable, targetId } from '../src/lib/excelImportMappings';
import { evaluateFormula } from '../src/lib/sabanaFormulaEngine';

const date = '2026-11-13';
const madrid = 'STD_MADRID_TTRAJOTA_sinIva';
const formula = (rawFormula: string, evaluatedValue: number) => ({ rawFormula, evaluatedValue, updatedAt: date });
const workbook = (values: Record<string, number | string>, name = 'CÁLCULO INICIAL') => {
  const book = utils.book_new();
  const sheet = Object.fromEntries(Object.entries(values).map(([cell, v]) => [cell, { v, t: typeof v === 'number' ? 'n' : 's' }]));
  utils.book_append_sheet(book, { ...sheet, '!ref': 'A1:X100' }, name);
  return book;
};

test('applies the requested destinations and recalculates the derived prices without overriding an unrelated formula', () => {
  const state = {
    efi_compras_data: { data: { TORREJON_GOA: { curr: '1,100', prev: '1,200', sale: '1,555', prevSale: '1,433', isCustomSale: true } }, modified: [] },
    efi_sabana_custom_formulas_global: { [madrid]: formula('=1,230', 1.230), 'STD_MADRID_T12_sinIva': formula('=1+0.12', 1.12) },
  };
  const book = workbook({
    K2: 'TORREJÓN', M2: 1259, B64: 1.247107, E64: 1.2, B30: 'TORREJON', C30: 1.299,
    A2: 'ALCUBILLAS', B2: 'GOA', C2: 1.759, B3: 'GASOLINA', C3: 1.699,
    A16: 'VALDEMORO', B16: 'GOA', C16: 1.699, E17: 1.887,
    B67: 1.39723, C67: 0.083, E6: 1.503305, E5: 1.819, A83: 'UCLES', B83: 1.28, E83: 1.61898, I68: 1.293,
  });
  const { patch } = planExcelImport(book, state, date);
  assert.equal(state.efi_compras_data.data.TORREJON_GOA.curr, '1,100');
  assert.equal(patch.efi_compras_data.data.TORREJON_GOA.curr, '1,259');
  assert.equal(patch.efi_compras_data.data.TORREJON_GOA.sale, '1,555');
  assert.equal(patch.efi_compras_data.data.TORREJON_GOA.prevSale, '1,433');
  assert.ok(patch.efi_compras_data.modified.includes('TORREJON_GOA_curr'));
  assert.equal(patch.efi_compras_gasolina_bronco.conIva, '1,509');
  assert.equal(patch.efi_compras_gasolina_bronco.beneficio, '0,032');
  const special = patch.efi_special_rates_b50_f82_v4.find((row: { id: string }) => row.id === 'torrejon');
  assert.deepEqual([special.actualPrice, special.isCustomActual, special.refPrice], ['1,299', true, '']);
  const postes = patch.efi_postes_data_v2;
  assert.deepEqual([postes.postes.ALCUBILLAS.goa, postes.postes.ALCUBILLAS.gasolina], ['1,759', '1,699']);
  assert.equal(postes.hvoGeneralBase, '1,39723');
  assert.equal(postes.hvoValdemoroAddition, '0,1880');
  assert.equal(postes.gasoleoBRows.UCLES.transfer, '1,297');
  for (const name of ['UCLES', 'TORREMOCHA', 'ARCOS']) {
    assert.equal(postes.gasoleoBRows[name].poste, '1,619');
    assert.equal(postes.gasoleoBRows[name].isCustomPoste, true);
  }
  const rules = patch.efi_sabana_custom_formulas_global;
  assert.equal(rules[madrid].rawFormula, `=[${excelVariable(madrid)}]`);
  assert.equal(rules.STD_MADRID_T12_sinIva.rawFormula, '=1+0.12');
  const next = planExcelImport(workbook({ I68: 1.311 }), { ...state, ...patch }, date);
  assert.equal(next.patch.efi_sabana_custom_formulas_global, undefined);
  const tokens = { [excelVariable(madrid)]: next.patch[EXCEL_VALUES_KEY][madrid] };
  assert.deepEqual(evaluateFormula(rules[madrid].rawFormula, tokens), { success: true, value: 1.311 });
  assert.equal(evaluateFormula(rules[madrid].rawFormula, {}).success, false);
  assert.equal(planExcelImport(book, { ...state, ...patch, efi_sabana_custom_formulas_global: {} }, date)
    .rows.find(r => r.mapping.cell === 'I68')?.status, 'issue');
  const edited = { ...state, ...patch, efi_sabana_custom_formulas_global: { [madrid]: formula('1.900', 1.9) } };
  assert.equal(planExcelImport(book, edited, date).rows.find(r => r.mapping.cell === 'I68')?.status, 'issue');
  const replace = planExcelImport(book, edited, date, DEFAULT_EXCEL_MAPPINGS.map(rule => rule.cell === 'I68' ? { ...rule, replaceFormula: true } : rule));
  assert.equal(replace.patch.efi_excel_import_mappings_v1.find((rule: { cell: string }) => rule.cell === 'I68').replaceFormula, undefined);
});

test('reports wrong station, product, missing numeric result and preserved formulas; accepts a mapped zero', () => {
  const { rows, patch } = planExcelImport(workbook({
    K2: 'MADRID', M2: 1333, A2: 'ALCUBILLAS', B2: 'GASOLINA', C2: 1.55,
    A4: 'ALFAJARIN', B4: 'GOA', C4: 1.599, B64: '#DIV/0!', I68: 1.293, X1: '0',
  }), {
    efi_postes_custom_formulas_global: { POSTE_ALFAJARIN_GOA: formula('=1.7', 1.7) },
    efi_sabana_custom_formulas_global: { [madrid]: formula('=1.2+0.03', 1.23) },
  }, date, [
    ...DEFAULT_EXCEL_MAPPINGS, { target: targetId('purchase', 'TORREJON', 'GOA', 'pase'), sheet: 'CÁLCULO INICIAL', cell: 'X1', scale: 'euros' },
  ]);
  for (const cell of ['M2', 'C2', 'C4', 'B64', 'I68']) assert.equal(rows.find(r => r.mapping.cell === cell)?.status, 'issue', cell);
  assert.equal(patch.efi_compras_data.data.TORREJON_GOA.pase, '0,000');
  assert.equal(patch.efi_postes_data_v2, undefined);
  assert.equal(patch[EXCEL_VALUES_KEY], undefined);
});
