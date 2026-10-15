import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsonValuesEqual, storedValuesEqual } from '../src/lib/jsonEquality';
import { mergeState } from '../src/lib/stateMerge';

test('PostgreSQL JSONB property ordering is not an edit', () => {
  assert.equal(storedValuesEqual('{"TORREJON":{"curr":"1,358","porte":"0,006"},"ALFAJARIN":0}',
    '{"ALFAJARIN":0,"TORREJON":{"porte":"0,006","curr":"1,358"}}'), true);
  assert.equal(jsonValuesEqual([{ curr: '1,358', porte: '0,006' }], [{ porte: '0,006', curr: '1,358' }]), true);
});
test('actual edits, zero, deletions and array order remain detectable', () => {
  assert.equal(storedValuesEqual('{"curr":"1,358"}', '{"curr":"1,359"}'), false);
  assert.equal(storedValuesEqual(null, 'null'), false);
  assert.equal(storedValuesEqual('0', 'null'), false);
  assert.equal(storedValuesEqual('1,35', '1,36'), false);
  assert.equal(jsonValuesEqual(['A', 'B'], ['B', 'A']), false);
});
test('a reordered baseline array cannot overwrite another user’s real edit', () => {
  const base = [{ a: 'old', b: 'same' }];
  const local = [{ b: 'same', a: 'old' }];
  const remote = [{ a: 'new', b: 'same' }];
  assert.deepEqual(mergeState(base, local, remote), remote);
});
