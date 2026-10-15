import { NextRequest, NextResponse } from 'next/server';
import { getServerUsers, upsertServerUser } from '@/lib/db';
import { verifyPassword } from '@/lib/passwords';
import { createSession, deleteSession, sessionUser, publicUser, SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try { const user = await sessionUser(req); return NextResponse.json({ user: user ? publicUser(user) : null }); }
  catch { return NextResponse.json({ error: 'No se pudo conectar con PostgreSQL.' }, { status: 503 }); }
}
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 512) return NextResponse.json({ error: 'Credenciales no válidas.' }, { status: 400 });
    const user = (await getServerUsers()).find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user?.password || !verifyPassword(password, user.password)) return NextResponse.json({ error: 'Credenciales no válidas.' }, { status: 401 });
    if (!user.password.startsWith('scrypt:') && !await upsertServerUser(user)) throw new Error('No se pudo migrar la contraseña.');
    const token = await createSession(user.id);
    const response = NextResponse.json({ user: publicUser(user) });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https', path: '/', maxAge: 43200 });
    return response;
  } catch { return NextResponse.json({ error: 'No se pudo iniciar sesión en PostgreSQL.' }, { status: 503 }); }
}
export async function DELETE(req: NextRequest) {
  await deleteSession(req);
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
