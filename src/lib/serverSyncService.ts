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
      if (key && (key.startsWith('efi_') || key.startsWith('sabana_') || key.startsWith('compras_'))) {
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
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightPushes: Promise<void>[] = [];
let syncUserNameGetter: (() => string) | undefined;

function scheduleSync(delayMs: number = 2500) {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    const keys = Array.from(pendingKeysToSync);
    pendingKeysToSync.clear();
    if (keys.length > 0) {
      const userName = syncUserNameGetter ? syncUserNameGetter() : 'Usuario';
      trackPush(pushIncrementalStateToServer(keys, userName));
    }
  }, delayMs);
}

function trackPush(p: Promise<void>) {
  inFlightPushes.push(p);
  p.finally(() => {
    inFlightPushes = inFlightPushes.filter((x) => x !== p);
  });
}

// Envía de inmediato los cambios pendientes y espera a que terminen los envíos en curso
export async function flushPendingSync(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  const keys = Array.from(pendingKeysToSync);
  pendingKeysToSync.clear();
  if (keys.length > 0) {
    const userName = syncUserNameGetter ? syncUserNameGetter() : 'Usuario';
    trackPush(pushIncrementalStateToServer(keys, userName));
  }
  await Promise.all(inFlightPushes.slice());
}

// Hay cambios locales aún sin confirmar en el servidor
export function hasUnsyncedChanges(): boolean {
  return pendingKeysToSync.size > 0 || inFlightPushes.length > 0;
}

// Guarda la versión del servidor sin retroceder nunca (las respuestas pueden llegar desordenadas)
function setLocalServerVersion(version: number, updatedAt?: string) {
  const current = parseInt(localStorage.getItem('efi_last_server_version') || '0', 10);
  if (version >= current) {
    localStorage.setItem('efi_last_server_version', version.toString());
    if (updatedAt) localStorage.setItem('efi_last_server_sync_time', updatedAt);
  }
}

// Aplica el estado recibido del servidor en el localStorage del cliente
export function applyServerStateToLocal(serverData: Record<string, any>): number {
  if (typeof window === 'undefined' || !serverData) return 0;
  let count = 0;
  const keysKeptLocal: string[] = [];

  isApplyingFromServer = true;
  try {
    Object.entries(serverData).forEach(([key, val]) => {
      try {
        // No pisar datos locales pendientes de subir (cambios recién guardados por el usuario)
        if (pendingKeysToSync.has(key)) return;

        // Última escritura gana: si el dato local es más reciente que el del servidor, conservarlo
        if (val && typeof val === 'object' && typeof val.updatedAt === 'string') {
          const localRaw = localStorage.getItem(key);
          if (localRaw) {
            try {
              const localVal = JSON.parse(localRaw);
              if (localVal && typeof localVal.updatedAt === 'string' && localVal.updatedAt > val.updatedAt) {
                keysKeptLocal.push(key);
                return;
              }
            } catch {}
          }
        }

        const strVal = typeof val === 'string' ? val : JSON.stringify(val);
        localStorage.setItem(key, strVal);
        count++;
      } catch (e) {}
    });

    // Notificar a todos los módulos que los datos cambiaron
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('efi_compras_updated'));
    window.dispatchEvent(new Event('efi_postes_updated'));
    window.dispatchEvent(new Event('efi_sabana_updated'));
    window.dispatchEvent(new Event('efi_valid_date_changed'));
    window.dispatchEvent(new Event('efi_stations_updated'));
    window.dispatchEvent(new Event('efi_export_updated'));
    window.dispatchEvent(new Event('efi_users_updated'));
  } catch (e) {
    console.error('[SyncService] Error al aplicar estado del servidor:', e);
  } finally {
    isApplyingFromServer = false;
  }

  // Los datos locales más recientes que el servidor deben subirse, no perderse
  if (keysKeptLocal.length > 0) {
    keysKeptLocal.forEach((k) => pendingKeysToSync.add(k));
    scheduleSync(500);
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

    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key: string, value: string) {
      originalSetItem(key, value);

      // Si se está aplicando desde el servidor, no volver a enviarlo
      if (isApplyingFromServer) return;

      if (key && (key.startsWith('efi_') || key.startsWith('sabana_') || key.startsWith('compras_'))) {
        // Ignorar metadatos de sincronización
        if (
          key === 'efi_last_server_version' ||
          key === 'efi_last_server_sync_time' ||
          key === 'efi_current_user' ||
          key === 'efi_users_list'
        ) {
          return;
        }

        recordUserActivity();
        pendingKeysToSync.add(key);
        scheduleSync(2500); // 2.5s debounce para evitar peticiones repetitivas mientras el usuario escribe
      }
    };
  } catch (e) {
    console.warn('[SyncService] No se pudo enganchar autoSync en localStorage:', e);
  }
}

// Subir todos los datos del navegador actual al servidor (Maestro con contraseña)
export async function pushAllStateToServer(password?: string, userName?: string): Promise<{
  success: boolean;
  version?: number;
  keysCount?: number;
  error?: string;
}> {
  try {
    await flushPendingSync();
    const data = collectAllLocalState();
    const totalKeys = Object.keys(data).length;

    if (totalKeys === 0) {
      return { success: false, error: 'No se encontraron datos locales para enviar.' };
    }

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        data,
        updatedBy: userName || 'Administrador',
        mode: 'full',
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Error al comunicarse con el servidor' };
    }

    if (typeof window !== 'undefined') {
      setLocalServerVersion(json.version, json.updatedAt);
      window.dispatchEvent(new CustomEvent('efi_server_sync_event', { detail: { type: 'push', version: json.version } }));
    }

    return {
      success: true,
      version: json.version,
      keysCount: json.keysCount || totalKeys,
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Error de red al sincronizar' };
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
      }),
    });

    const json = await res.json();
    if (json.success && json.version) {
      setLocalServerVersion(json.version, json.updatedAt);
    } else {
      throw new Error(json.error || 'Respuesta de sincronización no válida');
    }
  } catch (e) {
    console.warn('[SyncService] Fallo envío incremental, se reintentará:', e);
    // No perder los cambios: volver a ponerlos en cola y reintentar
    keys.forEach((k) => pendingKeysToSync.add(k));
    scheduleSync(5000);
  }
}

// Descargar el estado completo desde el servidor y aplicarlo localmente
export async function pullStateFromServer(): Promise<{
  success: boolean;
  version?: number;
  keysCount?: number;
  error?: string;
}> {
  try {
    // Antes de descargar, asegurar que los cambios locales ya están en el servidor
    await flushPendingSync();

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
    };
  } catch {
    return {
      needsUpdate: false,
      serverVersion: 0,
      updatedAt: '',
      updatedBy: '',
      hasData: false,
    };
  }
}
