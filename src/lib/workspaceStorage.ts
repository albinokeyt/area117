/**
 * Synchronous working copy for editors, formulas and exports.
 * Hydrated from PostgreSQL before editors mount; persistence is /api/sync.
 * Never writes business data to localStorage: its quota must not block saving.
 */
type ChangeListener = (key: string, before: string | null, after: string | null) => void;

export function createWorkspaceStorage(isAvailable: () => boolean = () => true) {
  const values = new Map<string, string>();
  const listeners = new Set<ChangeListener>();
  const storage = {
    get length() { return isAvailable() ? values.size : 0; },
    key(index: number): string | null {
      return isAvailable() ? Array.from(values.keys())[index] ?? null : null;
    },
    getItem(key: string): string | null {
      return isAvailable() ? values.get(String(key)) ?? null : null;
    },
    setItem(key: string, value: string): void {
      if (!isAvailable()) return;
      key = String(key);
      value = String(value);
      const before = storage.getItem(key);
      values.set(key, value);
      if (before !== value) listeners.forEach(listener => listener(key, before, value));
    },
    removeItem(key: string): void {
      if (!isAvailable()) return;
      key = String(key);
      const before = storage.getItem(key);
      values.delete(key);
      if (before !== null) listeners.forEach(listener => listener(key, before, null));
    },
    clear(): void {
      for (const key of Array.from(values.keys())) storage.removeItem(key);
    },
    subscribe(listener: ChangeListener): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
  return storage;
}

// Server rendering must never read or retain another user's working copy.
export const workspaceStorage = createWorkspaceStorage(() => typeof window !== 'undefined');
