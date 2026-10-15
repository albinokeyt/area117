import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceStorage } from '../src/lib/workspaceStorage';

test('working copy holds historical snapshots beyond browser storage quota', () => {
  const storage = createWorkspaceStorage();
  const largeSnapshot = 'x'.repeat(6 * 1024 * 1024);
  storage.setItem('efi_history', largeSnapshot);
  storage.setItem('efi_compras_data', '{"sale":"1,401"}');
  assert.equal(storage.getItem('efi_history'), largeSnapshot);
  assert.equal(storage.length, 2);
  assert.equal(storage.key(1), 'efi_compras_data');
  assert.equal(storage.key(2), null);
});

test('subscribers see additions, edits and removals, never unchanged values', () => {
  const storage = createWorkspaceStorage();
  const events: unknown[] = [];
  const unsubscribe = storage.subscribe((...event) => events.push(event));
  storage.setItem('efi_price', '1,401');
  storage.setItem('efi_price', '1,401');
  storage.setItem('efi_price', '1,411');
  storage.removeItem('efi_price');
  storage.removeItem('efi_price');
  unsubscribe();
  storage.setItem('efi_other', '0');
  assert.deepEqual(events, [['efi_price', null, '1,401'], ['efi_price', '1,401', '1,411'], ['efi_price', '1,411', null]]);
});

test('server rendering never retains a working copy', () => {
  let browser = false;
  const storage = createWorkspaceStorage(() => browser);
  storage.setItem('efi_price', 'private');
  assert.equal(storage.getItem('efi_price'), null);
  assert.equal(storage.length, 0);
  browser = true;
  assert.equal(storage.getItem('efi_price'), null);
});

test('read-only lookup tables are parsed once and invalidate on replacement or deletion', () => {
  const storage = createWorkspaceStorage();
  storage.setItem('efi_table', '{"TORREJON":{"conIva":1.5}}');
  const first = storage.readJson<Record<string, { conIva: number }>>('efi_table');
  assert.equal(storage.readJson('efi_table'), first);
  storage.setItem('efi_table', '{"TORREJON":{"conIva":1.6}}');
  const next = storage.readJson<Record<string, { conIva: number }>>('efi_table');
  assert.notEqual(next, first);
  assert.equal(next?.TORREJON.conIva, 1.6);
  storage.removeItem('efi_table');
  assert.equal(storage.readJson('efi_table'), null);
});
