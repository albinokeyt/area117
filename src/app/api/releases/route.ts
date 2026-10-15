import { NextRequest, NextResponse } from 'next/server';
import { sessionUser } from '@/lib/auth';
import { getDatabasePool } from '@/lib/db';
import { APP_RELEASES, latestRelease } from '@/lib/releases';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const user = await sessionUser(req);
    if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 });
    const result = await getDatabasePool()!.query('SELECT release_index FROM efi_release_reads WHERE user_id=$1', [user.id]);
    return NextResponse.json({ releases: APP_RELEASES, currentVersion: latestRelease.version,
      unread: (result.rows[0]?.release_index ?? 0) < APP_RELEASES.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudo consultar el historial en PostgreSQL.' }, { status: 503 }); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await sessionUser(req);
    if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 });
    const { version } = await req.json();
    const position = APP_RELEASES.findIndex(release => release.version === version);
    if (position < 0) return NextResponse.json({ error: 'Versión no válida.' }, { status: 400 });
    await getDatabasePool()!.query(`INSERT INTO efi_release_reads(user_id, release_index, read_at) VALUES($1,$2,NOW())
      ON CONFLICT(user_id) DO UPDATE SET release_index=GREATEST(efi_release_reads.release_index,EXCLUDED.release_index), read_at=NOW()`, [user.id, APP_RELEASES.length - position]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'No se pudo guardar la lectura en PostgreSQL.' }, { status: 503 }); }
}
