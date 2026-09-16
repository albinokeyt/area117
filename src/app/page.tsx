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
import {
  initClientAutoSync,
  checkServerVersion,
  pullStateFromServer
} from '@/lib/serverSyncService';

function AppContent() {
  const { currentUser } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState('2026-08-18');
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    // Iniciar interceptor de auto-sincronización en segundo plano
    initClientAutoSync(() => currentUser?.name || 'Usuario');

    try {
      const savedDate = localStorage.getItem('efi_compras_valid_from') || new Date().toISOString().split('T')[0];
      setSelectedDate(savedDate);
    } catch (e) {}

    // 1. Auto-hidratación inicial desde el servidor
    const initialSync = async () => {
      try {
        const status = await checkServerVersion();
        if (status.hasData) {
          const localVerStr = localStorage.getItem('efi_last_server_version') || '0';
          const localVer = parseInt(localVerStr, 10);
          const hasLocalPurchases = localStorage.getItem('efi_compras_data');

          // Si el servidor tiene datos y hay versión más reciente, o este navegador está vacío, descargar de inmediato
          if (status.serverVersion > localVer || !hasLocalPurchases) {
            console.log('[AutoSync] Hidratando navegador desde servidor central...');
            await pullStateFromServer();
            const syncedDate = localStorage.getItem('efi_compras_valid_from');
            if (syncedDate) setSelectedDate(syncedDate);
          }
        }
      } catch (err) {
        console.warn('[AutoSync] Error en hidratación inicial:', err);
      }
    };
    initialSync();

    // 2. Comprobación periódica cada 4 segundos para actualización en tiempo real
    const interval = setInterval(async () => {
      try {
        const status = await checkServerVersion();
        if (status.needsUpdate) {
          console.log(`[AutoSync] Nueva versión #${status.serverVersion} detectada. Descargando datos...`);
          const res = await pullStateFromServer();
          if (res.success) {
            setSyncNotification(
              `⚡ Datos actualizados en tiempo real (${status.updatedBy || 'otro usuario'}, v#${status.serverVersion})`
            );
            setTimeout(() => setSyncNotification(null), 4000);
          }
        }
      } catch (err) {
        // Fallo silencioso ante micro-cortes
      }
    }, 4000);

    // 3. Escuchar cambios de fecha global
    const handleDateChange = () => {
      const updated = localStorage.getItem('efi_compras_valid_from');
      if (updated) setSelectedDate(updated);
    };
    window.addEventListener('efi_valid_date_changed', handleDateChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('efi_valid_date_changed', handleDateChange);
    };
  }, [currentUser]);

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

      {/* Notificación flotante de sincronización en tiempo real */}
      {syncNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-amber-500/40 text-amber-300 font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs">{syncNotification}</span>
        </div>
      )}
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
