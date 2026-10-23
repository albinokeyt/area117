import { workspaceStorage } from './workspaceStorage';
import type { CellFormula } from './sabanaFormulaEngine';

export function loadPersistentFormulas(scope: 'sabana' | 'postes'): Record<string, CellFormula> {
  const prefix = `efi_${scope}_custom_formulas_`;
  const parse = (raw: string): Record<string, CellFormula> => {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Registro de fórmulas no válido.');
    return value;
  };
  // Presence matters: an explicitly emptied global registry must never revive old daily copies.
  const global = workspaceStorage.getItem(prefix + 'global');
  if (global !== null) {
    const value = workspaceStorage.readJson<Record<string, CellFormula>>(prefix + 'global');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Registro de fórmulas no válido.');
    return value;
  }
  // Compatibility for installations with only legacy daily copies. Reading never writes.
  const result: Record<string, CellFormula> = {};
  const keys = Array.from({ length: workspaceStorage.length }, (_, i) => workspaceStorage.key(i))
    .filter((key): key is string => !!key && key.startsWith(prefix)).sort();
  for (const key of keys) {
    for (const [cell, formula] of Object.entries(parse(workspaceStorage.getItem(key)!))) {
      if (!result[cell] || (formula.updatedAt || '') >= (result[cell].updatedAt || '')) result[cell] = formula;
    }
  }
  return result;
}

export function writePersistentFormulas(scope: 'sabana' | 'postes', formulas: Record<string, CellFormula>) {
  workspaceStorage.setItem(`efi_${scope}_custom_formulas_global`, JSON.stringify(formulas));
  window.dispatchEvent(new Event(`efi_${scope}_updated`));
  window.dispatchEvent(new Event('storage'));
}
