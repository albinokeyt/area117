import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFormula, getPurchaseItemSalePrice, getProgramVariables, reevaluateAllSabanaFormulas } from '../src/lib/sabanaFormulaEngine';
import { getLatestPurchasePayload } from '../src/lib/purchaseState';

import { workspaceStorage } from '../src/lib/workspaceStorage';
(globalThis as any).window = {};

test('absolute formula references preserve zero, relative aliases, bare tokens and percentages', () => {
  const variables = { 'COMPRAS:TORREJON:P_VENTA': 1.5, 'COMPRAS:TORREJON:CERO': 0, 'COMPRAS:MADRID:P_VENTA': 1.9, P_VENTA: 99 };
  const station = { stationName: 'TORREJON' };
  assert.equal(evaluateFormula('=[COMPRAS:TORREJON:P_VENTA] + 0.012', variables, station).value, 1.512);
  assert.equal(evaluateFormula('=[compras:torrejon:p_venta] + [COMPRAS:TORREJON:CERO]', variables, station).value, 1.5);
  assert.equal(evaluateFormula('=[P_VENTA] + [COMPRAS:MADRID:P_VENTA]', variables, station).value, 3.4);
  assert.equal(evaluateFormula('=P_VENTA + 0,012', variables, station).value, 1.512);
  assert.equal(evaluateFormula('=[COMPRAS:TORREJON:P_VENTA] + 21%', variables, station).value, 1.815);
  assert.equal(evaluateFormula('=[COMPRAS:NO_EXISTE:P_VENTA] + 1', variables, station).value, 1);
  assert.equal(evaluateFormula('=alert(1)', variables, station).success, false);
});

test('editor and formulas select freshest copy, including empty daily highlights', () => {
  workspaceStorage.clear();
  workspaceStorage.setItem('efi_compras_data', JSON.stringify({ data: { TORREJON_GOA: { curr: '1,800' } }, modified: [], updatedAt: '2026-10-15T12:00:00Z' }));
  workspaceStorage.setItem('efi_purchases_2026-10-15', JSON.stringify({ data: { TORREJON_GOA: { curr: '1,200' } }, modified: ['old'], updatedAt: '2026-10-14T12:00:00Z' }));
  assert.equal(getLatestPurchasePayload('2026-10-15').data.TORREJON_GOA.curr, '1,800');
  assert.deepEqual(getLatestPurchasePayload('2026-10-15').modified, []);
});
test('zero is a saved price, never replaced by official seed prices', () => {
  assert.equal(getPurchaseItemSalePrice({ sale: '0,000', curr: '1,500' }, 'TORREJON', {}), 0);
});
test('legacy rows created with buyPrice are readable without dropping their values', () => {
  workspaceStorage.clear();
  workspaceStorage.setItem('efi_compras_data', JSON.stringify({ data: { NUEVA_GOA: { buyPrice: 1.5, prevBuyPrice: 1.4, manualSalePrice: 1.6, prevSalePrice: 1.55 } }, modified: [] }));
  const row = getLatestPurchasePayload().data.NUEVA_GOA;
  assert.equal(row.curr, '1,5');
  assert.equal(row.sale, '1,6');
  assert.equal(row.prevSale, '1,55');
});
test('all product columns are dynamic and Gasolina uses its own costs', () => {
  workspaceStorage.clear();
  const purchases = {
    TORREJON_GOA: { curr: '1,500', prev: '1,400', porte: '0,001', pase: '0,002', fin: '0,003', sale: '1,600' },
    TORREJON_GASOLINA: { curr: '1,700', porte: '0,010', pase: '0,020', fin: '0,030', sale: '1,850' },
    TORREJON_ADBLUE: { curr: '0,450', porte: '0', pase: '0', fin: '0', sale: '0,800' },
  };
  const { map } = getProgramVariables('2026-10-15', purchases);
  assert.equal(map['COMPRAS:TORREJON:GASOLINA_COSTO'], 1.76);
  assert.equal(map['COMPRAS:TORREJON:GASOLINA:PORTE'], 0.01);
  assert.equal(map['COMPRAS:TORREJON:ADBLUE:COMPRA_HOY'], 0.45);
  const formulas = { STD_TORREJON_T12_sinIva: { rawFormula: '[COMPRAS:TORREJON:COMPRA_HOY]+0.012', evaluatedValue: 1, updatedAt: '' } };
  assert.equal(reevaluateAllSabanaFormulas(formulas, '2026-10-15', purchases).STD_TORREJON_T12_sinIva.evaluatedValue, 1.512);
  purchases.TORREJON_GOA.curr = '1,800';
  assert.equal(reevaluateAllSabanaFormulas(formulas, '2026-10-15', purchases).STD_TORREJON_T12_sinIva.evaluatedValue, 1.812);
});
