'use client';

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { LoginForm } from '@/components/LoginForm';
import { Comp1PurchaseManager } from '@/components/Comp1PurchaseManager';
import { Comp2EfiExporter } from '@/components/Comp2EfiExporter';
import { PostesManager } from '@/components/PostesManager';
import { SabanaPreciosManager } from '@/components/SabanaPreciosManager';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import { UserManager } from '@/components/UserManager';
import { InstructionsManager } from '@/components/InstructionsManager';

function AppContent() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
        {activeTab === 'dashboard' && <ExecutiveDashboard />}
        {activeTab === 'comp1' && <Comp1PurchaseManager selectedDate={selectedDate} />}
        {activeTab === 'comp2' && <Comp2EfiExporter selectedDate={selectedDate} />}
        {activeTab === 'postes' && <PostesManager />}
        {activeTab === 'sabana' && <SabanaPreciosManager selectedDate={selectedDate} />}
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'instructions' && <InstructionsManager />}
      </main>
      <footer className="border-t border-slate-800/80 py-5 text-center text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span><strong className="text-slate-400">EFI DATA OIL App</strong> &bull; Sistema de Gestión de Compras y Precios</span>
          <div className="flex items-center space-x-4">
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-500/20">Docker Ready (Easypanel)</span>
            <span>v1.1.0</span>
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
