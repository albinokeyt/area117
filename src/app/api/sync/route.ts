import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Directorio de persistencia en servidor
const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'server_state.json');

interface ServerStatePayload {
  version: number;
  updatedAt: string;
  updatedBy?: string;
  data: Record<string, any>;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readServerState(): ServerStatePayload {
  try {
    ensureDataDir();
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return {
          version: typeof parsed.version === 'number' ? parsed.version : 1,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          updatedBy: parsed.updatedBy || 'Sistema',
          data: parsed.data || {},
        };
      }
    }
  } catch (err) {
    console.error('[API /api/sync] Error al leer server_state.json:', err);
  }
  return {
    version: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Inicial',
    data: {},
  };
}

function writeServerState(payload: ServerStatePayload): boolean {
  try {
    ensureDataDir();
    // Escritura atómica mediante archivo temporal para evitar corrupción
    const tempFile = `${STATE_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tempFile, STATE_FILE);
    return true;
  } catch (err) {
    console.error('[API /api/sync] Error al escribir server_state.json:', err);
    return false;
  }
}

// GET /api/sync - Obtener versión o estado completo
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const versionOnly = searchParams.get('versionOnly') === 'true';
    const currentState = readServerState();

    if (versionOnly) {
      return NextResponse.json({
        success: true,
        version: currentState.version,
        updatedAt: currentState.updatedAt,
        updatedBy: currentState.updatedBy,
        hasData: Object.keys(currentState.data).length > 0,
      });
    }

    return NextResponse.json({
      success: true,
      version: currentState.version,
      updatedAt: currentState.updatedAt,
      updatedBy: currentState.updatedBy,
      data: currentState.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

// POST /api/sync - Guardar estado maestro o cambios incrementales
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, data, updatedBy, mode } = body;

    // Si se envía con contraseña para carga maestra, validarla con claves sencillas aceptadas
    if (password !== undefined) {
      const cleanPass = (password || '').toString().trim().toLowerCase();
      const validPasswords = ['admin', 'admin123', '117', 'area117', '1234', 'master'];
      if (!validPasswords.includes(cleanPass)) {
        return NextResponse.json(
          { success: false, error: 'Contraseña incorrecta para subir datos maestros al servidor.' },
          { status: 401 }
        );
      }
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Datos no válidos proporcionados.' },
        { status: 400 }
      );
    }

    const currentState = readServerState();
    let nextData: Record<string, any> = {};

    if (mode === 'incremental' && currentState.data) {
      // Fusionar solo las claves enviadas manteniendo el resto
      nextData = {
        ...currentState.data,
        ...data,
      };
    } else {
      // Carga maestra autoritativa: el estado del usuario que sube es el estado del servidor
      nextData = { ...data };
    }

    const newVersion = (currentState.version || 0) + 1;
    const now = new Date().toISOString();

    const newPayload: ServerStatePayload = {
      version: newVersion,
      updatedAt: now,
      updatedBy: updatedBy || 'Usuario',
      data: nextData,
    };

    const ok = writeServerState(newPayload);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Fallo al escribir en el disco del servidor.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
      updatedAt: now,
      updatedBy: updatedBy || 'Usuario',
      keysCount: Object.keys(nextData).length,
      message: 'Todos los datos han sido guardados y sincronizados en el servidor central con éxito.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar sincronización' },
      { status: 500 }
    );
  }
}
