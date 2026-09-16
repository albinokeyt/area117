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

// Aplica el estado recibido del servidor en el localStorage del cliente
export function applyServerStateToLocal(serverData: Record<string, any>): number {
  if (typeof window === 'undefined' || !serverData) return 0;
  let count = 0;

  isApplyingFromServer = true;
  try {
    Object.entries(serverData).forEach(([key, val]) => {
      try {
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
    window.dispatchEvent(new Event('efi_users_updated'));
  } catch (e) {
    console.error('[SyncService] Error al aplicar estado del servidor:', e);
  } finally {
    isApplyingFromServer = false;
  }

  return count;
}

// Inicia el sincronizador automático de cambios locales hacia el servidor
export function initClientAutoSync(getUserName?: () => string) {
  if (typeof window === 'undefined' || isSyncInitialized) return;
  isSyncInitialized = true;

  try {
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

        pendingKeysToSync.add(key);
        if (syncDebounceTimer) clearTimeout(syncDebounceTimer);

        syncDebounceTimer = setTimeout(() => {
          const keys = Array.from(pendingKeysToSync);
          pendingKeysToSync.clear();
          if (keys.length > 0) {
            const userName = getUserName ? getUserName() : 'Usuario';
            pushIncrementalStateToServer(keys, userName);
          }
        }, 1200); // 1.2s debounce
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
      localStorage.setItem('efi_last_server_version', json.version.toString());
      localStorage.setItem('efi_last_server_sync_time', json.updatedAt);
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
      localStorage.setItem('efi_last_server_version', json.version.toString());
      localStorage.setItem('efi_last_server_sync_time', json.updatedAt);
    }
  } catch (e) {
    console.warn('[SyncService] Fallo envío incremental en segundo plano:', e);
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
    const res = await fetch('/api/sync', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
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
      localStorage.setItem('efi_last_server_version', (json.version || 1).toString());
      localStorage.setItem('efi_last_server_sync_time', json.updatedAt || new Date().toISOString());
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
