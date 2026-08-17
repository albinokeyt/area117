'use client';

import React, { useState } from 'react';
import { useAuth, User } from '@/context/AuthContext';
import { UserPlus, Trash2, Shield, ChevronDown, Check, X, Users } from 'lucide-react';

const ROLE_LABELS: Record<User['role'], string> = {
  ADMIN: 'Administrador',
  COMPANERO_1: 'Compañero 1 (Compras)',
  COMPANERO_2_3: 'Compañero 2/3 (EFI)',
  VISITOR: 'Visualizador',
};

const ROLE_COLORS: Record<User['role'], string> = {
  ADMIN: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  COMPANERO_1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  COMPANERO_2_3: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  VISITOR: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
};

export function UserManager() {
  const { users, addUser, deleteUser, currentUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<User['role']>('COMPANERO_1');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    addUser(name, email, role);
    setName('');
    setEmail('');
    setRole('COMPANERO_1');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Users className="h-4 w-4" />
          <span>Administración del Sistema</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Gestión de Usuarios</h2>
        <p className="text-slate-400 text-sm mt-1">Crea, consulta y elimina usuarios del sistema EFI DATA OIL.</p>
      </div>

      {/* Add User Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white text-base mb-4 flex items-center space-x-2">
          <UserPlus className="h-5 w-5 text-amber-400" />
          <span>Crear Nuevo Usuario</span>
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Nombre Completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del usuario"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Rol del Sistema</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as User['role'])}
                className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none pr-9"
              >
                {(Object.keys(ROLE_LABELS) as User['role'][]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <button
            type="submit"
            className={`flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${
              saved
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:from-amber-400 hover:to-amber-300 shadow-amber-500/20'
            }`}
          >
            {saved ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            <span>{saved ? 'Usuario Creado' : 'Agregar Usuario'}</span>
          </button>
        </form>
      </div>

      {/* User List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Shield className="h-5 w-5 text-amber-400" />
            <span>Usuarios del Sistema ({users.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3.5 px-5">Nombre</th>
                <th className="py-3.5 px-5">Correo</th>
                <th className="py-3.5 px-5">Rol</th>
                <th className="py-3.5 px-5">Fecha Creación</th>
                <th className="py-3.5 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-800/50 transition-colors ${u.id === currentUser?.id ? 'bg-amber-500/5' : ''}`}>
                  <td className="py-3.5 px-5 font-semibold text-white">
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">YO</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-slate-400 font-mono text-xs">{u.email}</td>
                  <td className="py-3.5 px-5">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-400 text-xs font-mono">{u.createdAt}</td>
                  <td className="py-3.5 px-5 text-right">
                    {confirmDelete === u.id ? (
                      <div className="flex items-center justify-end space-x-2">
                        <span className="text-xs text-rose-400 font-semibold">¿Confirmar?</span>
                        <button
                          onClick={() => { deleteUser(u.id); setConfirmDelete(null); }}
                          className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-400 transition-all"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="p-1.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        disabled={u.id === '1'}
                        className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
