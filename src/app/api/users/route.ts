import { NextRequest, NextResponse } from 'next/server';
import { getServerUsers, upsertServerUser, deleteServerUser, isPostgresConfigured, ServerUser } from '@/lib/db';

export async function GET() {
  const users = await getServerUsers();
  return NextResponse.json({
    success: true,
    users,
    isPostgres: isPostgresConfigured(),
  });
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

      await upsertServerUser(userToSave);
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

      await upsertServerUser(newUser);
    }

    const updatedUsers = await getServerUsers();

    return NextResponse.json({
      success: true,
      users: updatedUsers,
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

    await deleteServerUser(id);
    const updated = await getServerUsers();

    return NextResponse.json({
      success: true,
      users: updated,
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
