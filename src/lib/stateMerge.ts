const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const object = (v: any): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v);

export class StateConflictError extends Error {
  constructor(public path: string) { super(`Otro usuario modificó ${path}. Recarga los datos antes de volver a guardar.`); }
}

// Three-way merge: preserve unrelated edits; reject conflicting edits to a cell.
export function mergeState(base: any, local: any, remote: any, path = ''): any {
  if (equal(local, base)) return remote;
  if (equal(remote, base) || equal(local, remote)) return local;
  if (object(local) && object(remote) && (base === undefined || object(base))) {
    const result = Object.create(null);
    for (const key of new Set([...Object.keys(base || {}), ...Object.keys(local), ...Object.keys(remote)])) {
      if (key === 'updatedAt') { result[key] = local[key] || remote[key]; continue; }
      const value = mergeState(base?.[key], local[key], remote[key], path ? `${path}.${key}` : key);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  // Daily highlights accumulate across independent edits; closing is an explicit reset.
  if (path.endsWith('.modified') && Array.isArray(local) && Array.isArray(remote)) {
    if (!local.length || !remote.length) throw new StateConflictError(path);
    return [...new Set([...local, ...remote])];
  }
  throw new StateConflictError(path);
}
