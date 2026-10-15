import { sessionUser, publicUser } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';
import { getServerUsers, upsertServerUser, deleteServerUser, isPostgresConfigured, ServerUser } from '@/lib/db';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const user = await sessionUser(req);
    if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 });
    const users = user.role === 'ADMIN' ? await getServerUsers() : [user];
    return NextResponse.json({ success: true, users: users.map(publicUser), isPostgres: true });
  } catch { return NextResponse.json({ error: 'No se pudieron leer usuarios.' }, { status: 503 }); }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await sessionUser(req);
    if (actor?.role !== 'ADMIN') return NextResponse.json({ error: 'Se requiere administrador.' }, { status: 403 });
    const body = await req.json();
    const { name, email, role, password, id } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Nombre y correo son obligatorios' },
        { status: 400 }
      );
    }

    const roles = ['ADMIN', 'COMPANERO_1', 'COMPANERO_2_3', 'VISITOR'];
    if (role && !roles.includes(role)) return NextResponse.json({ error: 'Rol no válido.' }, { status: 400 });
    const currentUsers = await getServerUsers();

    if (id) {
      // Modificar existente
      const existing = currentUsers.find((u) => u.id === id);
      const userToSave: ServerUser = {
        id,
        name,
        email,
        role: role || (existing ? existing.role : 'VISITOR'),
        password: password || (existing ? existing.password : '123456'),
        createdAt: existing ? existing.createdAt : new Date().toISOString().split('T')[0],
      };

      if (existing?.role === 'ADMIN' && userToSave.role !== 'ADMIN' && currentUsers.filter(u => u.role === 'ADMIN').length <= 1) return NextResponse.json({ error: 'Debe quedar un administrador.' }, { status: 400 });
      if (!await upsertServerUser(userToSave)) throw new Error('No se pudo guardar el usuario.');
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

      if (!await upsertServerUser(newUser)) throw new Error('No se pudo guardar el usuario.');
    }

    const updatedUsers = await getServerUsers();

    return NextResponse.json({
      success: true,
      users: updatedUsers.map(publicUser),
      isPostgres: isPostgresConfigured(),
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
    const actor = await sessionUser(req);
    if (actor?.role !== 'ADMIN') return NextResponse.json({ error: 'Se requiere administrador.' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    const currentUsers = await getServerUsers();
    if (currentUsers.length <= 1) {
      return NextResponse.json(
        { success: false, error: 'No puedes eliminar el único usuario del sistema' },
        { status: 400 }
      );
    }

    if (currentUsers.find(u => u.id === id)?.role === 'ADMIN' && currentUsers.filter(u => u.role === 'ADMIN').length <= 1) return NextResponse.json({ error: 'No puedes eliminar el último administrador.' }, { status: 400 });
    if (!await deleteServerUser(id)) throw new Error('No se pudo eliminar el usuario.');
    const updated = await getServerUsers();

    return NextResponse.json({
      success: true,
      users: updated.map(publicUser),
      isPostgres: isPostgresConfigured(),
      message: 'Usuario eliminado exitosamente del servidor.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
