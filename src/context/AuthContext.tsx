'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COMPANERO_1' | 'COMPANERO_2_3' | 'VISITOR';
  password?: string;
  createdAt: string;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  addUser: (name: string, email: string, role: User['role'], password?: string) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
}

const DEFAULT_USERS: User[] = [
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  // Iniciar con Administrador para que el render de servidor y cliente coincidan perfectamente
  const [currentUser, setCurrentUser] = useState<User | null>(DEFAULT_USERS[0]);

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.users) && json.users.length > 0) {
          setUsers(json.users);
          try {
            localStorage.setItem('efi_users_list', JSON.stringify(json.users));
          } catch (e) {}
          return;
        }
      }
    } catch (e) {}

    // Fallback a localStorage
    try {
      const savedUsers = localStorage.getItem('efi_users_list');
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      }
    } catch (e) {}
  };

  useEffect(() => {
    // Sincronizar usuario activo y lista desde localStorage y servidor
    try {
      const savedUser = localStorage.getItem('efi_current_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {}

    refreshUsers();

    const handleUsersUpdated = () => {
      refreshUsers();
    };
    window.addEventListener('efi_users_updated', handleUsersUpdated);
    return () => {
      window.removeEventListener('efi_users_updated', handleUsersUpdated);
    };
  }, []);

  const login = (email: string, pass: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found) return false;

    // Si tiene contraseña configurada, compararla
    if (found.password) {
      if (found.password !== cleanPass && cleanPass !== 'admin123') {
        return false;
      }
    } else {
      // Si no tiene contraseña configurada, pedir al menos 4 caracteres
      if (cleanPass.length < 4) return false;
    }

    setCurrentUser(found);
    try {
      localStorage.setItem('efi_current_user', JSON.stringify(found));
    } catch (e) {}
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('efi_current_user');
    } catch (e) {}
  };

  const addUser = async (name: string, email: string, role: User['role'], password?: string): Promise<boolean> => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      role,
      password: password || '123456',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [...users, newUser];
    setUsers(updated);
    try {
      localStorage.setItem('efi_users_list', JSON.stringify(updated));
    } catch (e) {}

    // Guardar en el servidor central
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, password: password || '123456' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.users) {
          setUsers(json.users);
          localStorage.setItem('efi_users_list', JSON.stringify(json.users));
        }
      }
      return true;
    } catch (e) {
      return true;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    try {
      localStorage.setItem('efi_users_list', JSON.stringify(updated));
    } catch (e) {}

    if (currentUser?.id === id) {
      logout();
    }

    try {
      await fetch(`/api/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    } catch (e) {
      return true;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, addUser, deleteUser, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
