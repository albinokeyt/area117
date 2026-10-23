import { createHash, randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getDatabasePool, ensureTables, ServerUser } from './db';
import { ENVIRONMENT_ADMIN_ID, getEnvironmentAdmin, equalSecret } from './environmentAdmin';

export const SESSION_COOKIE = 'efi_session';
export const publicUser = ({ password, ...user }: ServerUser) => user;
const digest = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string) {
  await ensureTables();
  const pool = getDatabasePool();
  if (!pool) throw new Error('PostgreSQL no está configurado.');
  const token = randomBytes(32).toString('hex');
  await pool.query('DELETE FROM efi_sessions WHERE expires_at < NOW()');
  const environment = userId === ENVIRONMENT_ADMIN_ID ? getEnvironmentAdmin() : null;
  if (userId === ENVIRONMENT_ADMIN_ID && !environment) throw new Error('Acceso de entorno deshabilitado.');
  await pool.query(`INSERT INTO efi_sessions (token_hash, user_id, environment_fingerprint, expires_at)
    VALUES ($1, $2, $3, NOW() + INTERVAL '12 hours')`,
    [digest(token), environment ? null : userId, environment?.fingerprint ?? null]);
  return token;
}

export async function sessionUser(req: NextRequest): Promise<ServerUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureTables();
  const pool = getDatabasePool();
  if (!pool) throw new Error('PostgreSQL no está configurado.');
  const { rows } = await pool.query(`SELECT u.id, u.name, u.email, u.role, u.created_at, u.manage_formulas, s.environment_fingerprint FROM efi_sessions s
    LEFT JOIN efi_server_users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > NOW()`, [digest(token)]);
  const row = rows[0];
  if (!row) return null;
  if (row.environment_fingerprint) {
    const environment = getEnvironmentAdmin();
    return environment && equalSecret(row.environment_fingerprint, environment.fingerprint) ? environment.user : null;
  }
  return row.id ? { id: row.id, name: row.name, email: row.email, role: row.role, canManageFormulas: row.role === 'ADMIN' || row.manage_formulas, createdAt: row.created_at.toISOString() } : null;
}

export async function deleteSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await getDatabasePool()?.query('DELETE FROM efi_sessions WHERE token_hash = $1', [digest(token)]);
}
