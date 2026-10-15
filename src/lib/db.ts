import { hashPassword } from "./passwords";
import { jsonValuesEqual } from './jsonEquality';
import { mergeState } from "./stateMerge";
import { Pool } from 'pg';

export interface ServerStatePayload {
  version: number;
  updatedAt: string;
  updatedBy?: string;
  data: Record<string, any>;
}

export interface ServerUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COMPANERO_1' | 'COMPANERO_2_3' | 'VISITOR';
  password?: string;
  createdAt: string;
}

export const DEFAULT_USERS: ServerUser[] = [
  {
    id: '1',
    name: 'Administrador Principal',
    email: 'admin@efidataoil.com',
    role: 'ADMIN',
    password: 'admin123',
    createdAt: '2026-08-08',
  },
  {
    id: '2',
    name: 'Compañero 1 (Compras)',
    email: 'compras@efidataoil.com',
    role: 'COMPANERO_1',
    password: 'compras123',
    createdAt: '2026-08-08',
  },
  {
    id: '3',
    name: 'Compañeros 2 y 3 (EFI)',
    email: 'efi@efidataoil.com',
    role: 'COMPANERO_2_3',
    password: 'efi123',
    createdAt: '2026-08-08',
  },
];

let pool: Pool | null = null;
let isDbInitialized = false;

export function isPostgresConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return !!url && (url.startsWith('postgres://') || url.startsWith('postgresql://'));
}

export function getDatabasePool(): Pool | null {
  if (!isPostgresConfigured()) return null;
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL] Error inesperado en el pool inactivo:', err);
    });
  }
  return pool;
}

export async function ensureTables() {
  if (isDbInitialized) return;
  const p = getDatabasePool();
  if (!p) {
    throw new Error('PostgreSQL no está configurado.');
  }

  const client = await p.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(1170001)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS efi_server_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by TEXT NOT NULL DEFAULT 'Sistema',
        data JSONB NOT NULL DEFAULT '{}'::jsonb
      );

      CREATE TABLE IF NOT EXISTS efi_server_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'VISITOR',
        password TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS efi_release_reads (
        user_id TEXT PRIMARY KEY, release_index INTEGER NOT NULL, read_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS efi_sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT REFERENCES efi_server_users(id) ON DELETE CASCADE,
        environment_fingerprint TEXT, expires_at TIMESTAMPTZ NOT NULL
      );
      ALTER TABLE efi_sessions ALTER COLUMN user_id DROP NOT NULL;
      ALTER TABLE efi_sessions ADD COLUMN IF NOT EXISTS environment_fingerprint TEXT;
    `);

    // Inicializar fila de estado si está vacía
    await client.query(`
      INSERT INTO efi_server_state (id, version, updated_at, updated_by, data)
      VALUES (1, 1, NOW(), 'Inicial', '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Inicializar usuarios si la tabla está vacía
    const userRes = await client.query('SELECT COUNT(*) FROM efi_server_users');
    if (parseInt(userRes.rows[0].count, 10) === 0) {
      for (const u of DEFAULT_USERS) {
        await client.query(
          `INSERT INTO efi_server_users (id, name, email, role, password, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.name, u.email, u.role, u.password?.startsWith('scrypt:') ? u.password : hashPassword(u.password || ''), u.createdAt]
        );
      }
      console.log(`[PostgreSQL] ${DEFAULT_USERS.length} usuarios iniciales creados en PostgreSQL.`);
    }

    await client.query('COMMIT');
    isDbInitialized = true;
    console.log('[PostgreSQL] Tablas efi_server_state y efi_server_users verificadas en PostgreSQL.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}

// ---------------- Funciones Públicas Exclusivamente PostgreSQL ----------------

export async function getServerState(): Promise<ServerStatePayload> {
  const p = getDatabasePool();
  if (!p) {
    throw new Error('PostgreSQL no está configurado: falta DATABASE_URL.');
  }

  try {
    await ensureTables();
    const res = await p.query('SELECT version, updated_at, updated_by, data FROM efi_server_state WHERE id = 1');
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const dataObj = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      if (!dataObj || typeof dataObj !== 'object' || Array.isArray(dataObj)) throw new Error('Estado PostgreSQL no válido.');

      for (const key of ['efi_current_user', 'efi_users_list', 'efi_last_server_version', 'efi_last_server_sync_time']) delete dataObj[key];
      return {
        version: typeof row.version === 'number' ? row.version : 1,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
        updatedBy: row.updated_by || 'Sistema',
        data: dataObj,
      };
    }
  } catch (err) {
    throw new Error('No se pudo leer PostgreSQL. No se cargarán datos iniciales sobre los datos existentes.');
  }

  throw new Error('No se encontró el estado en PostgreSQL.');
}

export async function getServerUsers(): Promise<ServerUser[]> {
  const p = getDatabasePool();
  if (!p) {
    throw new Error('PostgreSQL no está configurado.');
  }

  try {
    await ensureTables();
    const res = await p.query('SELECT id, name, email, role, password, created_at FROM efi_server_users ORDER BY id ASC');
    if (res.rows.length > 0) {
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        password: r.password,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      }));
    }
  } catch (err) {
    throw new Error('No se pudieron leer usuarios de PostgreSQL.');
  }

  return [];
}

export async function upsertServerUser(user: ServerUser): Promise<boolean> {
  const p = getDatabasePool();
  if (!p) {
    console.error('[PostgreSQL] Error: DATABASE_URL no configurada para upsert usuario.');
    return false;
  }

  try {
    await ensureTables();
    await p.query(
      `INSERT INTO efi_server_users (id, name, email, role, password, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         role = EXCLUDED.role,
         password = EXCLUDED.password`,
      [user.id, user.name, user.email, user.role, user.password?.startsWith('scrypt:') ? user.password : hashPassword(user.password || ''), user.createdAt]
    );
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Error al upsert usuario en PostgreSQL:', err);
    return false;
  }
}

export async function deleteServerUser(id: string): Promise<boolean> {
  const p = getDatabasePool();
  if (!p) {
    console.error('[PostgreSQL] Error: DATABASE_URL no configurada para borrar usuario.');
    return false;
  }

  try {
    await ensureTables();
    await p.query('DELETE FROM efi_server_users WHERE id = $1', [id]);
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Error al borrar usuario de PostgreSQL:', err);
    return false;
  }
}

// Row lock works across processes/containers, unlike a JavaScript write queue.
export async function patchServerState(data: Record<string, any>, base: Record<string, any>, updatedBy: string): Promise<ServerStatePayload> {
  const p = getDatabasePool();
  if (!p) throw new Error('PostgreSQL no está configurado.');
  await ensureTables();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM efi_server_state WHERE id = 1 FOR UPDATE');
    const current = rows[0];
    if (!current) throw new Error('No se encontró el estado en PostgreSQL.');
    const next = { ...current.data };
    for (const key of ['efi_current_user', 'efi_users_list', 'efi_last_server_version', 'efi_last_server_sync_time']) delete next[key];
    for (const key of Object.keys(data)) {
      const value = mergeState(base[key], data[key] === null ? undefined : data[key], current.data[key], key);
      if (value === undefined) delete next[key]; else next[key] = value;
    }
    if (jsonValuesEqual(next, current.data)) {
      await client.query('COMMIT');
      return { version: current.version, updatedAt: current.updated_at.toISOString(), updatedBy: current.updated_by, data: current.data };
    }
    const result = await client.query(`UPDATE efi_server_state SET data = $1::jsonb,
      version = version + 1, updated_at = NOW(), updated_by = $2 WHERE id = 1
      RETURNING version, updated_at, updated_by, data`, [JSON.stringify(next), updatedBy]);
    await client.query('COMMIT');
    const row = result.rows[0];
    return { version: row.version, updatedAt: row.updated_at.toISOString(), updatedBy: row.updated_by, data: row.data };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
