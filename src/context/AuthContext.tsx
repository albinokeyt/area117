'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COMPANERO_1' | 'COMPANERO_2_3' | 'VISITOR';
  createdAt: string;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  addUser: (name: string, email: string, role: User['role']) => void;
  deleteUser: (id: string) => void;
}

const DEFAULT_USERS: User[] = [
  {
    id: '1',
    name: 'Administrador Principal',
    email: 'admin@efidataoil.com',
    role: 'ADMIN',
    createdAt: '2026-08-08',
  },
  {
    id: '2',
    name: 'Compañero 1 (Compras)',
    email: 'compras@efidataoil.com',
    role: 'COMPANERO_1',
    createdAt: '2026-08-08',
  },
  {
    id: '3',
    name: 'Compañeros 2 y 3 (EFI)',
    email: 'efi@efidataoil.com',
    role: 'COMPANERO_2_3',
    createdAt: '2026-08-08',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  // Iniciar con Administrador para que el render de servidor y cliente coincidan perfectamente
  const [currentUser, setCurrentUser] = useState<User | null>(DEFAULT_USERS[0]);

  useEffect(() => {
    // Sincronizar desde localStorage solo tras montar en el cliente
    try {
      const savedUser = localStorage.getItem('efi_current_user');
      const savedUsers = localStorage.getItem('efi_users_list');
      
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      }
      
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Error al leer almacenamiento local:', e);
    }
  }, []);

  const login = (email: string, pass: string): boolean => {
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found && pass.length >= 4) {
      setCurrentUser(found);
      try {
        localStorage.setItem('efi_current_user', JSON.stringify(found));
      } catch (e) {}
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('efi_current_user');
    } catch (e) {}
  };

  const addUser = (name: string, email: string, role: User['role']) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      role,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...users, newUser];
    setUsers(updated);
    try {
      localStorage.setItem('efi_users_list', JSON.stringify(updated));
    } catch (e) {}
  };

  const deleteUser = (id: string) => {
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    try {
      localStorage.setItem('efi_users_list', JSON.stringify(updated));
    } catch (e) {}
    if (currentUser?.id === id) {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, addUser, deleteUser }}>
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
