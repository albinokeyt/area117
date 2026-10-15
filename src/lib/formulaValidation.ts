import { CellFormula, evaluateFormula } from './sabanaFormulaEngine';

/** Unlike the legacy evaluator, an absent bracketed variable is never a valid zero. */
export function checkSabanaFormula(formula: CellFormula, variables: Record<string, number>, station?: string): string | null {
  if (!formula || typeof formula.rawFormula !== 'string') return 'La fórmula guardada no tiene una expresión válida.';
  const norms = station ? [station, station.toUpperCase().replace(/^ES\s+/, '')].map(name => name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()) : [];
  for (const [, raw] of formula.rawFormula.matchAll(/\[([^\]]+)\]/g)) {
    const token = raw.trim();
    const upper = token.toUpperCase();
    const candidates = [token, upper];
    for (const norm of norms) for (const scope of ['COMPRAS', 'SABANA', 'ESPECIAL', 'POSTES']) {
      candidates.push(`${scope}:${norm}:${token}`, `${scope}:${norm}:${upper}`);
      if (scope === 'ESPECIAL' && upper.startsWith('ESPECIAL_')) candidates.push(`${scope}:${norm}:${upper.slice(9)}`);
    }
    if (!candidates.some(key => Number.isFinite(variables[key]))) return `Referencia ausente o inválida: [${token}].`;
  }
  const result = evaluateFormula(formula.rawFormula, variables, { stationName: station });
  if (!result.success) return result.error || 'No se puede evaluar la fórmula.';
  if (!Number.isFinite(formula.evaluatedValue) || Math.abs(result.value - formula.evaluatedValue) > 0.0001) return 'El resultado guardado de la fórmula no coincide con su cálculo actual.';
  return null;
}
