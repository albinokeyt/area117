'use client';

import React from 'react';
import { useAuth, User } from '@/context/AuthContext';
import { Fuel, BarChart3, FileSpreadsheet, ShieldCheck, Layers, Download, Users, LogOut, ChevronDown, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const ROLE_LABELS: Record<User['role'], string> = {
  ADMIN: 'Administrador',
  COMPANERO_1: 'Compañero 1',
  COMPANERO_2_3: 'Compañero 2/3',
  VISITOR: 'Visualizador',
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'comp1', label: 'Compras', icon: FileSpreadsheet },
  { id: 'comp2', label: 'EFI Export', icon: ShieldCheck },
  { id: 'postes', label: 'Postes', icon: Layers },
  { id: 'sabana', label: 'Sábana/PDFs', icon: Download },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'instructions', label: 'Instrucciones', icon: BookOpen },
];

export function Header({ activeTab, setActiveTab, selectedDate, setSelectedDate }: HeaderProps) {
  const { currentUser, logout } = useAuth();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Fuel className="h-5 w-5 text-slate-950" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-base font-bold tracking-tight leading-tight text-white">
                EFI DATA OIL
              </h1>
              <p className="text-[10px] text-amber-400 font-medium leading-tight">Gestión de Combustibles</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex space-x-0.5 bg-slate-800/50 p-1 rounded-xl border border-slate-700/40 overflow-x-auto">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all duration-150 ${
                  activeTab === id
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          {/* Right Side: Date + User */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="hidden md:flex items-center bg-slate-800/80 rounded-lg px-2.5 py-1.5 border border-slate-700/60">
              <span className="text-[10px] font-semibold text-slate-400 mr-2 uppercase">Fecha:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-amber-300 font-semibold focus:outline-none cursor-pointer"
              />
            </div>

            {/* User Badge */}
            {currentUser && (
              <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5">
                <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <p className="text-[11px] font-bold text-white leading-tight truncate max-w-[100px]">{currentUser.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{ROLE_LABELS[currentUser.role]}</p>
                </div>
                <button
                  onClick={logout}
                  className="ml-1 p-1.5 rounded-lg bg-slate-700 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
