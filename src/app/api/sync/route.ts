import { NextRequest, NextResponse } from 'next/server';
import { getServerState, saveServerState, isPostgresConfigured, ServerStatePayload } from '@/lib/db';

// GET /api/sync - Obtener versión o estado completo
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const versionOnly = searchParams.get('versionOnly') === 'true';
    const currentState = await getServerState();

    if (versionOnly) {
      return NextResponse.json({
        success: true,
        version: currentState.version,
        updatedAt: currentState.updatedAt,
        updatedBy: currentState.updatedBy,
        hasData: Object.keys(currentState.data || {}).length > 0,
        isPostgres: isPostgresConfigured(),
      });
    }

    return NextResponse.json({
      success: true,
      version: currentState.version,
      updatedAt: currentState.updatedAt,
      updatedBy: currentState.updatedBy,
      data: currentState.data,
      isPostgres: isPostgresConfigured(),
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

    const currentState = await getServerState();
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

    const ok = await saveServerState(newPayload);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Fallo al escribir en la base de datos o disco del servidor.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
      updatedAt: now,
      updatedBy: updatedBy || 'Usuario',
      keysCount: Object.keys(nextData).length,
      isPostgres: isPostgresConfigured(),
      message: isPostgresConfigured()
        ? 'Todos los datos han sido guardados y sincronizados en PostgreSQL con éxito.'
        : 'Todos los datos han sido guardados y sincronizados en el servidor central con éxito.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar sincronización' },
      { status: 500 }
    );
  }
}
