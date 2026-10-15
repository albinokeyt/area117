import { createHash, randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getDatabasePool, ensureTables, ServerUser } from './db';

export const SESSION_COOKIE = 'efi_session';
export const publicUser = ({ password, ...user }: ServerUser) => user;
const digest = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string) {
  await ensureTables();
  const pool = getDatabasePool();
  if (!pool) throw new Error('PostgreSQL no está configurado.');
  const token = randomBytes(32).toString('hex');
  await pool.query('DELETE FROM efi_sessions WHERE expires_at < NOW()');
  await pool.query("INSERT INTO efi_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '12 hours')", [digest(token), userId]);
  return token;
}

export async function sessionUser(req: NextRequest): Promise<ServerUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureTables();
  const pool = getDatabasePool();
  if (!pool) throw new Error('PostgreSQL no está configurado.');
  const { rows } = await pool.query(`SELECT u.id, u.name, u.email, u.role, u.created_at FROM efi_sessions s
    JOIN efi_server_users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > NOW()`, [digest(token)]);
  return rows[0] ? { ...rows[0], createdAt: rows[0].created_at.toISOString() } : null;
}

export async function deleteSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await getDatabasePool()?.query('DELETE FROM efi_sessions WHERE token_hash = $1', [digest(token)]);
}
