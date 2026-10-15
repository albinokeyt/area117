import { sessionUser } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';
import { getServerState, patchServerState } from '@/lib/db';
import { StateConflictError } from '@/lib/stateMerge';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!await sessionUser(req)) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 });
    const state = await getServerState();
    const versionOnly = req.nextUrl.searchParams.get('versionOnly') === 'true';
    return NextResponse.json({ success: true, ...state,
      data: versionOnly ? undefined : state.data,
      hasData: Object.keys(state.data).length > 0, isPostgres: true,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'No se pudo leer PostgreSQL.' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await sessionUser(req);
    if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 });
    if (user.role === 'VISITOR') return NextResponse.json({ error: 'No tienes permiso para guardar.' }, { status: 403 });
    const { data, baseData, updatedBy } = await req.json();
    const record = (v: unknown) => v !== null && typeof v === 'object' && !Array.isArray(v);
    if (!record(data) || !record(baseData) || Object.keys(data).some(key =>
      !/^(efi_|sabana_|compras_)/.test(key) || ['efi_current_user', 'efi_users_list', 'efi_last_server_version', 'efi_last_server_sync_time'].includes(key))) {
      return NextResponse.json({ success: false, error: 'Datos de sincronización no válidos. Recarga la aplicación.' }, { status: 400 });
    }
    const state = await patchServerState(data, baseData, user.name);
    return NextResponse.json({ success: true, ...state, isPostgres: true, keysCount: Object.keys(state.data).length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof StateConflictError ? error.message : 'No se pudo guardar en PostgreSQL.' },
      { status: error instanceof StateConflictError ? 409 : 503 });
  }
}
