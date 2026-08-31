'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { LoginForm } from '@/components/LoginForm';
import { Comp1PurchaseManager } from '@/components/Comp1PurchaseManager';
import { Comp2EfiExporter } from '@/components/Comp2EfiExporter';
import { PostesManager } from '@/components/PostesManager';
import { SabanaPreciosManager } from '@/components/SabanaPreciosManager';
import { PdfGeneratorManager } from '@/components/PdfGeneratorManager';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import { UserManager } from '@/components/UserManager';
import { InstructionsManager } from '@/components/InstructionsManager';

function AppContent() {
  const { currentUser } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState('2026-08-18');

  useEffect(() => {
    setMounted(true);
    try {
      const savedDate = localStorage.getItem('efi_compras_valid_from') || new Date().toISOString().split('T')[0];
      setSelectedDate(savedDate);
    } catch (e) {}
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-400 font-sans">Cargando EFI DATA OIL...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <ExecutiveDashboard onNavigateTab={setActiveTab} />
        </div>
        <div className={activeTab === 'comp1' ? 'block' : 'hidden'}>
          <Comp1PurchaseManager selectedDate={selectedDate} />
        </div>
        <div className={activeTab === 'postes' ? 'block' : 'hidden'}>
          <PostesManager />
        </div>
        <div className={activeTab === 'sabana' ? 'block' : 'hidden'}>
          <SabanaPreciosManager selectedDate={selectedDate} />
        </div>
        <div className={activeTab === 'pdf' ? 'block' : 'hidden'}>
          <PdfGeneratorManager selectedDate={selectedDate} />
        </div>
        <div className={activeTab === 'comp2' ? 'block' : 'hidden'}>
          <Comp2EfiExporter selectedDate={selectedDate} />
        </div>
        <div className={activeTab === 'users' ? 'block' : 'hidden'}>
          <UserManager />
        </div>
        <div className={activeTab === 'instructions' ? 'block' : 'hidden'}>
          <InstructionsManager />
        </div>
      </main>
      <footer className="border-t border-slate-800/80 py-5 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span><strong className="text-slate-400">EFI DATA OIL App</strong> &bull; Sistema de Gestión de Compras y Precios</span>
          <div className="flex items-center space-x-4">
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-500/20">Docker Ready (Easypanel)</span>
            <span>v1.2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
