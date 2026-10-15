import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeState, StateConflictError } from '../src/lib/stateMerge';
import { closePurchaseDay } from '../src/lib/purchaseState';
import { hashPassword, verifyPassword } from '../src/lib/passwords';

test('day close copies only the two previous columns, preserves zero and custom sale', () => {
  const row = { prev: '1,100', curr: '0,000', sale: '1,750', prevSale: '1,400', isCustomSale: true, porte: '0,015' };
  const result = closePurchaseDay({ station: row });
  assert.deepEqual(result.station, { ...row, prev: '0,000', prevSale: '1,750' });
  assert.equal(row.prev, '1,100');
});
test('concurrent changes to different purchase cells are merged', () => {
  const base = { data: { A: { curr: '1' }, B: { curr: '2' } }, modified: ['old'] };
  const local = { data: { A: { curr: '3' }, B: { curr: '2' } }, modified: ['old', 'A'] };
  const remote = { data: { A: { curr: '1' }, B: { curr: '4' } }, modified: ['old', 'B'] };
  const merged = mergeState(base, local, remote, 'efi_compras_data');
  assert.equal(merged.data.A.curr, '3');
  assert.equal(merged.data.B.curr, '4');
  assert.deepEqual(merged.modified, ['old', 'A', 'B']);
});
test('same-cell conflicts cannot silently overwrite another user', () => {
  assert.throws(() => mergeState({ curr: '1' }, { curr: '2' }, { curr: '3' }), StateConflictError);
});
test('deletion survives unrelated concurrent edits', () => {
  const merged = mergeState({ A: 1, B: 2 }, { B: 2 }, { A: 1, B: 3 });
  assert.equal(merged.A, undefined);
  assert.equal(merged.B, 3);
});
test('hashed credentials and existing production credentials have no master bypass', () => {
  const hash = hashPassword('secret');
  assert.equal(verifyPassword('secret', hash), true);
  assert.equal(verifyPassword('admin123', hash), false);
  assert.equal(verifyPassword('legacy', 'legacy'), true);
});
