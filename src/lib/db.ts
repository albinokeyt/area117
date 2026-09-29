import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Directorio de fallback en caso de no contar con DATABASE_URL
const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'server_state.json');
const USERS_FILE = path.join(DATA_DIR, 'server_users.json');

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

function getPool(): Pool | null {
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
      console.error('[PostgreSQL] Error inesperado en el cliente inactivo:', err);
    });
  }
  return pool;
}

async function ensureTables() {
  if (isDbInitialized) return;
  const p = getPool();
  if (!p) return;

  try {
    await p.query(`
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
    `);

    // 1. Migración automática de usuarios existentes (o valores por defecto)
    const userRes = await p.query('SELECT COUNT(*) FROM efi_server_users');
    if (parseInt(userRes.rows[0].count, 10) === 0) {
      const existingUsers = readUsersFromFile();
      const usersToInsert = existingUsers && existingUsers.length > 0 ? existingUsers : DEFAULT_USERS;
      for (const u of usersToInsert) {
        await p.query(
          `INSERT INTO efi_server_users (id, name, email, role, password, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.name, u.email, u.role, u.password || '', u.createdAt]
        );
      }
      console.log(`[PostgreSQL] Migrados ${usersToInsert.length} usuarios a PostgreSQL.`);
    }

    // 2. Migración automática de datos del estado anterior (server_state.json -> PostgreSQL)
    const stateRes = await p.query("SELECT COUNT(*) FROM efi_server_state WHERE id = 1 AND data != '{}'::jsonb");
    if (parseInt(stateRes.rows[0].count, 10) === 0) {
      const existingState = readStateFromFile();
      if (existingState && existingState.data && Object.keys(existingState.data).length > 0) {
        await p.query(
          `INSERT INTO efi_server_state (id, version, updated_at, updated_by, data)
           VALUES (1, $1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET
             version = EXCLUDED.version,
             updated_at = EXCLUDED.updated_at,
             updated_by = EXCLUDED.updated_by,
             data = EXCLUDED.data`,
          [
            existingState.version || 1,
            existingState.updatedAt || new Date().toISOString(),
            existingState.updatedBy || 'Migración Automática',
            JSON.stringify(existingState.data),
          ]
        );
        console.log(`[PostgreSQL] Migración automática completada con éxito: ${Object.keys(existingState.data).length} registros migrados desde server_state.json a PostgreSQL.`);
      }
    }

    isDbInitialized = true;
    console.log('[PostgreSQL] Tablas efi_server_state y efi_server_users verificadas y sincronizadas.');
  } catch (err) {
    console.error('[PostgreSQL] Error al inicializar tablas:', err);
  }
}

// ---------------- Fallback con Archivo JSON ----------------
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStateFromFile(): ServerStatePayload {
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
    console.error('[DB Fallback] Error al leer server_state.json:', err);
  }
  return {
    version: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Inicial',
    data: {},
  };
}

function writeStateToFile(payload: ServerStatePayload): boolean {
  try {
    ensureDataDir();
    const tempFile = `${STATE_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tempFile, STATE_FILE);
    return true;
  } catch (err) {
    console.error('[DB Fallback] Error al escribir server_state.json:', err);
    return false;
  }
}

function readUsersFromFile(): ServerUser[] {
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[DB Fallback] Error al leer server_users.json:', e);
  }
  writeUsersToFile(DEFAULT_USERS);
  return DEFAULT_USERS;
}

function writeUsersToFile(users: ServerUser[]): boolean {
  try {
    ensureDataDir();
    const tempFile = `${USERS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(users, null, 2), 'utf-8');
    fs.renameSync(tempFile, USERS_FILE);
    return true;
  } catch (e) {
    console.error('[DB Fallback] Error al escribir server_users.json:', e);
    return false;
  }
}

// ---------------- Funciones Públicas Unificadas (PostgreSQL + Fallback) ----------------

export async function getServerState(): Promise<ServerStatePayload> {
  const p = getPool();
  if (p) {
    try {
      await ensureTables();
      const res = await p.query('SELECT version, updated_at, updated_by, data FROM efi_server_state WHERE id = 1');
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          version: row.version,
          updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
          updatedBy: row.updated_by,
          data: row.data || {},
        };
      }
      return {
        version: 0,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Inicial',
        data: {},
      };
    } catch (err) {
      console.error('[PostgreSQL] Error al leer estado del servidor:', err);
    }
  }
  return readStateFromFile();
}

export async function saveServerState(payload: ServerStatePayload): Promise<boolean> {
  const p = getPool();
  if (p) {
    try {
      await ensureTables();
      await p.query(
        `INSERT INTO efi_server_state (id, version, updated_at, updated_by, data)
         VALUES (1, $1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           version = EXCLUDED.version,
           updated_at = EXCLUDED.updated_at,
           updated_by = EXCLUDED.updated_by,
           data = EXCLUDED.data`,
        [payload.version, payload.updatedAt, payload.updatedBy || 'Usuario', JSON.stringify(payload.data)]
      );
      return true;
    } catch (err) {
      console.error('[PostgreSQL] Error al guardar estado en PostgreSQL:', err);
      return false;
    }
  }
  return writeStateToFile(payload);
}

export async function getServerUsers(): Promise<ServerUser[]> {
  const p = getPool();
  if (p) {
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
      console.error('[PostgreSQL] Error al leer usuarios:', err);
    }
  }
  return readUsersFromFile();
}

export async function saveServerUsers(users: ServerUser[]): Promise<boolean> {
  const p = getPool();
  if (p) {
    try {
      await ensureTables();
      const client = await p.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM efi_server_users');
        for (const u of users) {
          await client.query(
            `INSERT INTO efi_server_users (id, name, email, role, password, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [u.id, u.name, u.email, u.role, u.password || '', u.createdAt]
          );
        }
        await client.query('COMMIT');
        return true;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[PostgreSQL] Error al guardar lista de usuarios:', err);
      return false;
    }
  }
  return writeUsersToFile(users);
}

export async function upsertServerUser(user: ServerUser): Promise<boolean> {
  const p = getPool();
  if (p) {
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
        [user.id, user.name, user.email, user.role, user.password || '', user.createdAt]
      );
      return true;
    } catch (err) {
      console.error('[PostgreSQL] Error al upsert usuario:', err);
      return false;
    }
  }

  const users = readUsersFromFile();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  return writeUsersToFile(users);
}

export async function deleteServerUser(id: string): Promise<boolean> {
  const p = getPool();
  if (p) {
    try {
      await ensureTables();
      await p.query('DELETE FROM efi_server_users WHERE id = $1', [id]);
      return true;
    } catch (err) {
      console.error('[PostgreSQL] Error al borrar usuario:', err);
      return false;
    }
  }

  const users = readUsersFromFile();
  const filtered = users.filter((u) => u.id !== id);
  return writeUsersToFile(filtered);
}
