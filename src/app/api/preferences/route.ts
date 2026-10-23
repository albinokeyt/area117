import { NextRequest, NextResponse } from 'next/server';
import { sessionUser } from '@/lib/auth';
import { getDatabasePool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const user = await sessionUser(req);
    if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 });
    const { rows } = await getDatabasePool()!.query('SELECT theme FROM efi_user_preferences WHERE user_id = $1', [user.id]);
    return NextResponse.json({ theme: rows[0]?.theme || 'crystal' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudo leer el tema.' }, { status: 503 }); }
}
export async function PUT(req: NextRequest) {
  try {
    const user = await sessionUser(req);
    if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 });
    const { theme } = await req.json();
    if (!['crystal', 'dark', 'cream'].includes(theme)) return NextResponse.json({ error: 'Tema no válido.' }, { status: 400 });
    await getDatabasePool()!.query('INSERT INTO efi_user_preferences (user_id, theme) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET theme = EXCLUDED.theme', [user.id, theme]);
    return NextResponse.json({ theme });
  } catch { return NextResponse.json({ error: 'No se pudo guardar el tema.' }, { status: 503 }); }
}
