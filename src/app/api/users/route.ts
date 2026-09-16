import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'server_users.json');

export interface ServerUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COMPANERO_1' | 'COMPANERO_2_3' | 'VISITOR';
  password?: string;
  createdAt: string;
}

const DEFAULT_USERS: ServerUser[] = [
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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readUsers(): ServerUser[] {
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
    console.error('[API /api/users] Error al leer usuarios:', e);
  }
  // Inicializar con usuarios por defecto si no existe
  writeUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
}

function writeUsers(users: ServerUser[]): boolean {
  try {
    ensureDataDir();
    const tempFile = `${USERS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(users, null, 2), 'utf-8');
    fs.renameSync(tempFile, USERS_FILE);
    return true;
  } catch (e) {
    console.error('[API /api/users] Error al escribir usuarios:', e);
    return false;
  }
}

export async function GET() {
  const users = readUsers();
  // Devolver usuarios
  return NextResponse.json({ success: true, users });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, password, id } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Nombre y correo son obligatorios' },
        { status: 400 }
      );
    }

    const currentUsers = readUsers();
    let updatedUsers: ServerUser[];

    if (id) {
      // Modificar existente
      updatedUsers = currentUsers.map((u) => {
        if (u.id === id) {
          return {
            ...u,
            name,
            email,
            role: role || u.role,
            ...(password ? { password } : {}),
          };
        }
        return u;
      });
    } else {
      // Crear nuevo usuario
      const exists = currentUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un usuario con ese correo electrónico' },
          { status: 400 }
        );
      }

      const newUser: ServerUser = {
        id: Date.now().toString(),
        name,
        email,
        role: role || 'COMPANERO_1',
        password: password || '123456',
        createdAt: new Date().toISOString().split('T')[0],
      };
      updatedUsers = [...currentUsers, newUser];
    }

    writeUsers(updatedUsers);

    return NextResponse.json({
      success: true,
      users: updatedUsers,
      message: 'Usuario guardado exitosamente en el servidor.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al guardar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    const currentUsers = readUsers();
    if (currentUsers.length <= 1) {
      return NextResponse.json(
        { success: false, error: 'No puedes eliminar el único usuario del sistema' },
        { status: 400 }
      );
    }

    const updated = currentUsers.filter((u) => u.id !== id);
    writeUsers(updated);

    return NextResponse.json({
      success: true,
      users: updated,
      message: 'Usuario eliminado exitosamente del servidor.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
