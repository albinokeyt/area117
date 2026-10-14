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
      console.error('[PostgreSQL] Error inesperado en el pool inactivo:', err);
    });
  }
  return pool;
}

async function ensureTables() {
  if (isDbInitialized) return;
  const p = getPool();
  if (!p) {
    console.warn('[PostgreSQL] Advertencia: DATABASE_URL no está configurada.');
    return;
  }

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

    // Inicializar fila de estado si está vacía
    await p.query(`
      INSERT INTO efi_server_state (id, version, updated_at, updated_by, data)
      VALUES (1, 1, NOW(), 'Inicial', '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Inicializar usuarios si la tabla está vacía
    const userRes = await p.query('SELECT COUNT(*) FROM efi_server_users');
    if (parseInt(userRes.rows[0].count, 10) === 0) {
      for (const u of DEFAULT_USERS) {
        await p.query(
          `INSERT INTO efi_server_users (id, name, email, role, password, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.name, u.email, u.role, u.password || '', u.createdAt]
        );
      }
      console.log(`[PostgreSQL] ${DEFAULT_USERS.length} usuarios iniciales creados en PostgreSQL.`);
    }

    isDbInitialized = true;
    console.log('[PostgreSQL] Tablas efi_server_state y efi_server_users verificadas en PostgreSQL.');
  } catch (err) {
    console.error('[PostgreSQL] Error al inicializar tablas en PostgreSQL:', err);
  }
}

// ---------------- Funciones Públicas Exclusivamente PostgreSQL ----------------

export async function getServerState(): Promise<ServerStatePayload> {
  const p = getPool();
  if (!p) {
    console.warn('[PostgreSQL] DATABASE_URL no configurada.');
    return {
      version: 0,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Inicial',
      data: {},
    };
  }

  try {
    await ensureTables();
    const res = await p.query('SELECT version, updated_at, updated_by, data FROM efi_server_state WHERE id = 1');
    if (res.rows.length > 0) {
      const row = res.rows[0];
      let dataObj: Record<string, any> = {};
      if (typeof row.data === 'string') {
        try {
          dataObj = JSON.parse(row.data);
        } catch {
          dataObj = {};
        }
      } else if (row.data && typeof row.data === 'object' && !Array.isArray(row.data)) {
        dataObj = row.data;
      }

      return {
        version: typeof row.version === 'number' ? row.version : 1,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
        updatedBy: row.updated_by || 'Sistema',
        data: dataObj,
      };
    }
  } catch (err) {
    console.error('[PostgreSQL] Error al leer estado de PostgreSQL:', err);
  }

  return {
    version: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Inicial',
    data: {},
  };
}

export async function saveServerState(payload: ServerStatePayload): Promise<boolean> {
  const p = getPool();
  if (!p) {
    console.error('[PostgreSQL] Error: DATABASE_URL no está configurada para guardar.');
    return false;
  }

  try {
    await ensureTables();
    const jsonStr = typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data);
    await p.query(
      `INSERT INTO efi_server_state (id, version, updated_at, updated_by, data)
       VALUES (1, $1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         version = EXCLUDED.version,
         updated_at = EXCLUDED.updated_at,
         updated_by = EXCLUDED.updated_by,
         data = EXCLUDED.data`,
      [payload.version, payload.updatedAt, payload.updatedBy || 'Usuario', jsonStr]
    );
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Error al guardar estado en PostgreSQL:', err);
    return false;
  }
}

export async function getServerUsers(): Promise<ServerUser[]> {
  const p = getPool();
  if (!p) {
    return DEFAULT_USERS;
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
    console.error('[PostgreSQL] Error al leer usuarios de PostgreSQL:', err);
  }

  return DEFAULT_USERS;
}

export async function saveServerUsers(users: ServerUser[]): Promise<boolean> {
  const p = getPool();
  if (!p) {
    console.error('[PostgreSQL] Error: DATABASE_URL no configurada para guardar usuarios.');
    return false;
  }

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
    console.error('[PostgreSQL] Error al guardar lista de usuarios en PostgreSQL:', err);
    return false;
  }
}

export async function upsertServerUser(user: ServerUser): Promise<boolean> {
  const p = getPool();
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
      [user.id, user.name, user.email, user.role, user.password || '', user.createdAt]
    );
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Error al upsert usuario en PostgreSQL:', err);
    return false;
  }
}

export async function deleteServerUser(id: string): Promise<boolean> {
  const p = getPool();
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
