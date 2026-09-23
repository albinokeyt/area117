'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { LoginForm } from '@/components/LoginForm';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import {
  initClientAutoSync,
  checkServerVersion,
  pullStateFromServer
} from '@/lib/serverSyncService';

// Componente de carga elegante para pestañas cargadas dinámicamente bajo demanda
const TabLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center py-24 space-y-4">
    <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-sm font-semibold text-slate-400 font-sans">Cargando módulo...</p>
  </div>
);

// Code-splitting con Next.js dynamic para reducir drásticamente el bundle inicial
const Comp1PurchaseManager = dynamic(
  () => import('@/components/Comp1PurchaseManager').then((m) => m.Comp1PurchaseManager),
  { ssr: false, loading: TabLoadingFallback }
);
const PostesManager = dynamic(
  () => import('@/components/PostesManager').then((m) => m.PostesManager),
  { ssr: false, loading: TabLoadingFallback }
);
const SabanaPreciosManager = dynamic(
  () => import('@/components/SabanaPreciosManager').then((m) => m.SabanaPreciosManager),
  { ssr: false, loading: TabLoadingFallback }
);
const PdfGeneratorManager = dynamic(
  () => import('@/components/PdfGeneratorManager').then((m) => m.PdfGeneratorManager),
  { ssr: false, loading: TabLoadingFallback }
);
const Comp2EfiExporter = dynamic(
  () => import('@/components/Comp2EfiExporter').then((m) => m.Comp2EfiExporter),
  { ssr: false, loading: TabLoadingFallback }
);
const UserManager = dynamic(
  () => import('@/components/UserManager').then((m) => m.UserManager),
  { ssr: false, loading: TabLoadingFallback }
);
const InstructionsManager = dynamic(
  () => import('@/components/InstructionsManager').then((m) => m.InstructionsManager),
  { ssr: false, loading: TabLoadingFallback }
);

function AppContent() {
  const { currentUser } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState('2026-08-18');
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  // Montaje bajo demanda: solo monta componentes en el DOM cuando el usuario entra a su pestaña por primera vez
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['dashboard']));

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    setVisitedTabs((prev) => {
      if (prev.has(newTab)) return prev;
      const next = new Set(prev);
      next.add(newTab);
      return next;
    });
  }, []);

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

    // 2. Comprobación periódica optimizada (cada 10s cuando la pestaña está visible)
    const checkUpdate = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
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
    };

    const interval = setInterval(checkUpdate, 10000);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        checkUpdate();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 3. Escuchar cambios de fecha global
    const handleDateChange = () => {
      const updated = localStorage.getItem('efi_compras_valid_from');
      if (updated) setSelectedDate(updated);
    };
    window.addEventListener('efi_valid_date_changed', handleDateChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
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
        setActiveTab={handleTabChange}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <ExecutiveDashboard onNavigateTab={handleTabChange} />
        </div>

        {visitedTabs.has('comp1') && (
          <div className={activeTab === 'comp1' ? 'block' : 'hidden'}>
            <Comp1PurchaseManager selectedDate={selectedDate} />
          </div>
        )}

        {visitedTabs.has('postes') && (
          <div className={activeTab === 'postes' ? 'block' : 'hidden'}>
            <PostesManager selectedDate={selectedDate} />
          </div>
        )}

        {visitedTabs.has('sabana') && (
          <div className={activeTab === 'sabana' ? 'block' : 'hidden'}>
            <SabanaPreciosManager selectedDate={selectedDate} />
          </div>
        )}

        {visitedTabs.has('pdf') && (
          <div className={activeTab === 'pdf' ? 'block' : 'hidden'}>
            <PdfGeneratorManager selectedDate={selectedDate} />
          </div>
        )}

        {visitedTabs.has('comp2') && (
          <div className={activeTab === 'comp2' ? 'block' : 'hidden'}>
            <Comp2EfiExporter selectedDate={selectedDate} />
          </div>
        )}

        {visitedTabs.has('users') && (
          <div className={activeTab === 'users' ? 'block' : 'hidden'}>
            <UserManager />
          </div>
        )}

        {visitedTabs.has('instructions') && (
          <div className={activeTab === 'instructions' ? 'block' : 'hidden'}>
            <InstructionsManager />
          </div>
        )}
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
