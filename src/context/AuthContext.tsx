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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Cargar sesión persistente si existe
    const savedUser = localStorage.getItem('efi_current_user');
    const savedUsers = localStorage.getItem('efi_users_list');
    
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers));
      } catch (e) {
        console.error(e);
      }
    }
    
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Iniciar sesión por defecto con el Administrador para agilizar pruebas
      setCurrentUser(DEFAULT_USERS[0]);
    }
  }, []);

  const login = (email: string, pass: string): boolean => {
    // Simulación de login (Acepta cualquier password >= 4 caracteres o 'admin123')
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found && pass.length >= 4) {
      setCurrentUser(found);
      localStorage.setItem('efi_current_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('efi_current_user');
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
    localStorage.setItem('efi_users_list', JSON.stringify(updated));
  };

  const deleteUser = (id: string) => {
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    localStorage.setItem('efi_users_list', JSON.stringify(updated));
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
