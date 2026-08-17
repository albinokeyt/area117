'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Fuel, Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@efidataoil.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(email, password);
    if (!success) {
      setError('Credenciales inválidas. Comprueba el email y la contraseña.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 items-center justify-center shadow-lg shadow-amber-500/20 mb-2">
            <Fuel className="h-8 w-8 text-slate-950 font-bold" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            EFI DATA OIL
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Acceso al Sistema de Gestión de Combustibles
          </p>
        </div>

        {/* Credentials Box Info */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs space-y-1">
          <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
            <KeyRound className="h-4 w-4" />
            <span>Credenciales por Defecto:</span>
          </div>
          <p className="text-slate-300 font-mono text-[11px]">
            Email: <strong className="text-white">admin@efidataoil.com</strong>
          </p>
          <p className="text-slate-300 font-mono text-[11px]">
            Contraseña: <strong className="text-white">admin123</strong>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none transition-colors"
                placeholder="usuario@efidataoil.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all active:scale-95 mt-2"
          >
            <span>Iniciar Sesión</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Conexión Protegida &bull; Docker Ready</span>
          </p>
        </div>

      </div>
    </div>
  );
}
