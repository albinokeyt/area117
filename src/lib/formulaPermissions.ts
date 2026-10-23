import { jsonValuesEqual } from './jsonEquality';

export function canManageFormulas(user?: { role: string; canManageFormulas?: boolean } | null) {
  return !!user && (user.role === 'ADMIN' || (user.role !== 'VISITOR' && user.canManageFormulas === true));
}

export class FormulaPermissionError extends Error {
  constructor() { super('Solo los usuarios designados pueden crear, modificar o eliminar fórmulas y orígenes. Solicita el permiso Gestionar fórmulas al administrador.'); }
}

// Compare definitions, not recalculated values or timestamps. Applied to the merged state under the PostgreSQL row lock.
function definitions(key: string, value: any): any {
  if (/^efi_(sabana|postes)_custom_formulas_/.test(key)) {
    return Object.fromEntries(Object.entries(value || {}).map(([cell, f]) => [cell, (f as any)?.rawFormula]));
  }
  if (/^efi_sabana_(custom_(standard|special|block)_tariffs|tariff_source_mapping|modified_tariffs_config|deleted_tariffs)_/.test(key)
    || key === 'efi_pdf_station_source_mapping_v1' || /^efi_custom_tariffs_(catalog_v5|list_v3|list)$/.test(key)
    || key === 'efi_deleted_tariffs_list') return value ?? null;
  if (/^efi_export_(custom_overrides|added_rows|deleted_rows|deleted_tariffs)_/.test(key)) return value ?? null;
  return null;
}

export function assertFormulaPermission(before: Record<string, any>, after: Record<string, any>, user: { role: string; canManageFormulas?: boolean }) {
  if (canManageFormulas(user)) return;
  // A new empty global record must not hide existing legacy daily formulas.
  for (const scope of ['sabana', 'postes']) {
    const prefix = `efi_${scope}_custom_formulas_`;
    const effective = (state: Record<string, any>) => {
      if (state[prefix + 'global'] != null) return definitions(prefix + 'global', state[prefix + 'global']);
      const merged: Record<string, any> = {};
      for (const key of Object.keys(state).filter(k => k.startsWith(prefix)).sort()) {
        for (const [cell, formula] of Object.entries(state[key] || {})) {
          if (!merged[cell] || ((formula as any)?.updatedAt || '') >= (merged[cell]?.updatedAt || '')) merged[cell] = formula;
        }
      }
      return definitions(prefix + 'global', merged);
    };
    if (!jsonValuesEqual(effective(before), effective(after))) throw new FormulaPermissionError();
  }
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!jsonValuesEqual(definitions(key, before[key]), definitions(key, after[key]))) throw new FormulaPermissionError();
  }
}
