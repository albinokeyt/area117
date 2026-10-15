import { storedValuesEqual } from './jsonEquality';

/**
 * Servicio Central de Sincronización en Tiempo Real
 * Sincroniza el almacenamiento local del navegador con el servidor persistente
 */

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  serverVersion: number;
  online: boolean;
  error: string | null;
}

// Recopila todo el estado local relevante de la aplicación
export function collectAllLocalState(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  const state: Record<string, any> = {};

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isBusinessKey(key)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw !== null) {
            // Intentar parsear JSON para guardar objetos limpios en el servidor
            try {
              state[key] = JSON.parse(raw);
            } catch {
              state[key] = raw;
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error('[SyncService] Error al recopilar estado local:', e);
  }

  return state;
}

// Flag para evitar bucles cuando el cliente aplica datos descargados del servidor
let isApplyingFromServer = false;
let isSyncInitialized = false;
let pendingKeysToSync = new Set<string>();
let inFlightKeys = new Set<string>();
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pushQueue: Promise<void> = Promise.resolve();
let syncUserNameGetter: (() => string) | undefined;
let lastPushError: string | null = null;
let acknowledgedState: Record<string, any> = {};
let conflictBlocked = false;
let confirmedVersion = 0;

export function isBusinessKey(key: string) {
  return /^(efi_|sabana_|compras_)/.test(key) && ![
    'efi_last_server_version', 'efi_last_server_sync_time', 'efi_current_user', 'efi_users_list'
  ].includes(key);
}

export function markKeyModifiedLocally(key: string) {
  if (!isBusinessKey(key)) return;
  pendingKeysToSync.add(key);
  if (!conflictBlocked) scheduleSync();
}

function scheduleSync(delayMs = 600) {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    void flushPendingSync().catch(() => {});
  }, delayMs);
}

// Serialize requests so an older response can never overwrite a later edit.
export async function flushPendingSync(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = null;
  const run = pushQueue.catch(() => {}).then(async () => {
    if (conflictBlocked) throw new Error(lastPushError || 'Conflicto de guardado: descarga los datos del servidor.');
    while (pendingKeysToSync.size > 0) {
      const keys = Array.from(pendingKeysToSync);
      pendingKeysToSync.clear();
      keys.forEach(k => inFlightKeys.add(k));
      try {
        await pushIncrementalStateToServer(keys, syncUserNameGetter?.() || 'Usuario');
        lastPushError = null;
      } catch (error) {
        keys.forEach(k => pendingKeysToSync.add(k));
        lastPushError = error instanceof Error ? error.message : 'Error de sincronización';
        window.dispatchEvent(new CustomEvent('efi_sync_error', { detail: lastPushError }));
        if (!conflictBlocked) scheduleSync(5000);
        throw error;
      } finally {
        keys.forEach(k => inFlightKeys.delete(k));
      }
    }
  });
  pushQueue = run;
  return run;
}

export function hasUnsyncedChanges(): boolean {
  return pendingKeysToSync.size > 0 || inFlightKeys.size > 0;
}

// Guarda la versión del servidor sin retroceder nunca (las respuestas pueden llegar desordenadas)
function setLocalServerVersion(version: number, updatedAt?: string) {
  if (version >= confirmedVersion) {
    confirmedVersion = version;
    localStorage.setItem('efi_last_server_version', version.toString());
    if (updatedAt) localStorage.setItem('efi_last_server_sync_time', updatedAt);
  }
}

// Aplica el estado recibido del servidor en el localStorage del cliente
export function applyServerStateToLocal(serverData: Record<string, any>): number {
  if (typeof window === 'undefined' || !serverData) return 0;
  let count = 0;
  const changedKeys: string[] = [];
  acknowledgedState = structuredClone(serverData);
  isApplyingFromServer = true;
  try {
    for (const key of Object.keys(collectAllLocalState())) {
      if (!(key in serverData) && !pendingKeysToSync.has(key) && !inFlightKeys.has(key)) {
        localStorage.removeItem(key);
        changedKeys.push(key);
      }
    }
    Object.entries(serverData).forEach(([key, val]) => {
      if (!isBusinessKey(key)) return;
      try {
        if (pendingKeysToSync.has(key) || inFlightKeys.has(key)) return;
        const strVal = typeof val === 'string' ? val : JSON.stringify(val);
        if (storedValuesEqual(localStorage.getItem(key), strVal)) return;
        localStorage.setItem(key, strVal);
        changedKeys.push(key);
        count++;
      } catch (e) {}
    });

    // Acknowledging our own unchanged save must not reset controlled inputs.
    if (changedKeys.length === 0) return 0;
    window.dispatchEvent(new CustomEvent('efi_server_state_applied', { detail: { keys: changedKeys } }));
    // Notificar a todos los módulos que los datos cambiaron
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('efi_compras_updated'));
    window.dispatchEvent(new Event('efi_postes_updated'));
    window.dispatchEvent(new Event('efi_sabana_updated'));
    window.dispatchEvent(new Event('efi_valid_date_changed'));
    if (changedKeys.includes('efi_stations_catalog_v1')) window.dispatchEvent(new Event('efi_stations_updated'));
    window.dispatchEvent(new Event('efi_export_updated'));
    window.dispatchEvent(new Event('efi_users_updated'));
  } catch (e) {
    console.error('[SyncService] Error al aplicar estado del servidor:', e);
  } finally {
    isApplyingFromServer = false;
  }

  return count;
}

let lastUserActivityTimestamp = Date.now();

export function recordUserActivity() {
  lastUserActivityTimestamp = Date.now();
}

export function isUserRecentlyActive(seconds: number = 10): boolean {
  return (Date.now() - lastUserActivityTimestamp) < (seconds * 1000);
}

// Inicia el sincronizador automático de cambios locales hacia el servidor
export function initClientAutoSync(getUserName?: () => string) {
  if (getUserName) syncUserNameGetter = getUserName;
  if (typeof window === 'undefined' || isSyncInitialized) return;
  isSyncInitialized = true;

  try {
    window.addEventListener('keydown', recordUserActivity, { passive: true });
    window.addEventListener('pointerdown', recordUserActivity, { passive: true });

    // Storage instance properties are named storage entries in real browsers.
    // Wrap the prototype methods and preserve their native receiver instead.
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      const changed = !storedValuesEqual(this.getItem(key), String(value));
      originalSetItem.call(this, key, value);
      if (this === window.localStorage && changed && !isApplyingFromServer && isBusinessKey(key)) {
        markKeyModifiedLocally(key);
      }
    };
    Storage.prototype.removeItem = function (key: string) {
      const existed = this.getItem(key) !== null;
      originalRemoveItem.call(this, key);
      if (this === window.localStorage && existed && !isApplyingFromServer && isBusinessKey(key)) {
        markKeyModifiedLocally(key);
      }
    };
    window.addEventListener('beforeunload', event => {
      if (hasUnsyncedChanges()) {
        event.preventDefault();
        event.returnValue = '';
      }
    });

  } catch (e) {
    console.warn('[SyncService] No se pudo enganchar autoSync en localStorage:', e);
  }
}

// Manual synchronization uses the same ordered queue and conflict protection.
export async function pushAllStateToServer(): Promise<{
  success: boolean; version?: number; keysCount?: number; error?: string;
}> {
  try {
    const keys = Object.keys(collectAllLocalState());
    keys.forEach(markKeyModifiedLocally);
    await flushPendingSync();
    return { success: true, version: confirmedVersion, keysCount: keys.length };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo sincronizar.' };
  }
}

// Subir cambios incrementales automáticamente al guardar cualquier formulario
export async function pushIncrementalStateToServer(keys: string[], userName?: string): Promise<void> {
  if (typeof window === 'undefined' || keys.length === 0) return;

  try {
    const data: Record<string, any> = {};
    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      } else {
        data[key] = null;
      }
    });

    if (Object.keys(data).length === 0) return;

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        updatedBy: userName || 'Usuario',
        mode: 'incremental',
        baseData: Object.fromEntries(keys.filter(key => key in acknowledgedState).map(key => [key, acknowledgedState[key]])),
      }),
    });

    const json = await res.json();
    if (res.ok && json.success && json.version) {
      // Acknowledgement is a complete transaction snapshot, including merged edits.
      keys.forEach(key => inFlightKeys.delete(key));
      applyServerStateToLocal(json.data);
      setLocalServerVersion(json.version, json.updatedAt);
      window.dispatchEvent(new CustomEvent('efi_server_sync_event', { detail: { type: 'push', version: json.version } }));
    } else {
      if (res.status === 409) conflictBlocked = true;
      throw new Error(json.error || 'Respuesta de sincronización no válida');
    }
  } catch (e) {
    throw e;

  }
}

// Descargar el estado completo desde el servidor y aplicarlo localmente
export async function pullStateFromServer(discardPending = false): Promise<{
  success: boolean;
  version?: number;
  keysCount?: number;
  error?: string;
}> {
  try {
    if (discardPending) {
      await pushQueue.catch(() => {});
      pendingKeysToSync.clear();
      conflictBlocked = false;
    } else {
      await flushPendingSync();
    }

    const res = await fetch('/api/sync', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return { success: false, error: 'Error del servidor al descargar datos' };
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      return { success: false, error: json.error || 'Respuesta vacía del servidor' };
    }

    if (json.version < confirmedVersion) return { success: true, version: confirmedVersion, keysCount: 0 };
    const applied = applyServerStateToLocal(json.data);

    if (typeof window !== 'undefined') {
      setLocalServerVersion(json.version || 1, json.updatedAt || new Date().toISOString());
      window.dispatchEvent(new CustomEvent('efi_server_sync_event', { detail: { type: 'pull', version: json.version } }));
    }

    return {
      success: true,
      version: json.version,
      keysCount: applied,
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Error de conexión' };
  }
}

// Comprobar si hay una versión más nueva en el servidor
export async function checkServerVersion(): Promise<{
  needsUpdate: boolean;
  serverVersion: number;
  updatedAt: string;
  updatedBy: string;
  hasData: boolean;
  isPostgres: boolean;
}> {
  try {
    const res = await fetch('/api/sync?versionOnly=true', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) throw new Error('Error al consultar versión');

    const json = await res.json();
    const serverVer = typeof json.version === 'number' ? json.version : 0;
    const localVerStr = typeof window !== 'undefined' ? localStorage.getItem('efi_last_server_version') : '0';
    const localVer = parseInt(localVerStr || '0', 10);

    const needsUpdate = serverVer > localVer;

    return {
      needsUpdate,
      serverVersion: serverVer,
      updatedAt: json.updatedAt,
      updatedBy: json.updatedBy,
      hasData: Boolean(json.hasData),
      isPostgres: Boolean(json.isPostgres),
    };
  } catch {
    return {
      needsUpdate: false,
      serverVersion: 0,
      updatedAt: '',
      updatedBy: '',
      hasData: false,
      isPostgres: false,
    };
  }
}
