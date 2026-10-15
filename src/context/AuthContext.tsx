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
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addUser: (name: string, email: string, role: User['role'], password?: string) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const refreshUsers = async () => {
    const res = await fetch('/api/users', { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();
    if (Array.isArray(json.users)) setUsers(json.users);
  };

  useEffect(() => {
    localStorage.removeItem('efi_current_user');
    localStorage.removeItem('efi_users_list');
    fetch('/api/auth', { cache: 'no-store' }).then(r => r.json()).then(json => {
      setCurrentUser(json.user || null);
      if (json.user) void refreshUsers();
    }).catch(() => {});
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!res.ok) return false;
    const json = await res.json();
    setCurrentUser(json.user);
    await refreshUsers();
    return true;
  };

  const logout = async () => {
    if (!(await fetch('/api/auth', { method: 'DELETE' })).ok) throw new Error('No se pudo cerrar sesión.');
    setCurrentUser(null);
    setUsers([]);
    // Clear in-memory sync queues and observers for the previous session.
    window.location.reload();
  };

  const addUser = async (name: string, email: string, role: User['role'], password?: string): Promise<boolean> => {
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, role, password }) });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'No se pudo guardar el usuario.');
    setUsers(json.users);
    return true;
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'No se pudo eliminar el usuario.');
    setUsers(json.users);
    return true;
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
