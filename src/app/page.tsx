'use client';

import { workspaceStorage } from '@/lib/workspaceStorage';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APP_VERSION } from '@/lib/version';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { LoginForm } from '@/components/LoginForm';
import { LoginDriveTransition } from '@/components/LoginDriveTransition';
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
  pullStateFromServer,
  isUserRecentlyActive,
  hasUnsyncedChanges
} from '@/lib/serverSyncService';

function AppContent() {
  const { currentUser } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [entryRequested, setEntryRequested] = useState(false);
  const [entryRevealing, setEntryRevealing] = useState(false);
  const revealEntry = useCallback(() => setEntryRevealing(true), []);
  const workspace = useRef<HTMLElement>(null);
  const finishEntry = useCallback(() => {
    setEntryRequested(false);
    setEntryRevealing(false);
    requestAnimationFrame(() => { window.scrollTo(0, 0); if (!document.querySelector('[role=dialog][aria-modal=true]')) workspace.current?.focus({ preventScroll: true }); });
  }, []);
  const [activeTab, setActiveTab] = useState('comp1');
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return (
          workspaceStorage.getItem('efi_compras_valid_from') ||
          workspaceStorage.getItem('efi_global_valid_from_date') ||
          new Date().toISOString().split('T')[0]
        );
      } catch (e) {}
    }
    return '2026-10-15';
  });
  const [syncNotification, setSyncNotification] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    if (!currentUser) { setSyncReady(false); return; }
    let cancelled = false;
    setSyncReady(false);
    // Hydrate before mounting any editor: defaults must never overwrite PostgreSQL.
    const initialSync = async () => {
      const result = await pullStateFromServer();
      if (cancelled) return;
      if (!result.success) { setLoadError(result.error || 'No se pudo conectar con PostgreSQL.'); return; }
      initClientAutoSync(() => currentUser.name);
      const date = workspaceStorage.getItem('efi_compras_valid_from');
      if (date) setSelectedDate(date);
      setLoadError('');
      setSyncReady(true);
    };
    void initialSync();

    // 2. Comprobación periódica no invasiva: cada 25s o al volver a la pestaña (focus)
    const checkServerUpdates = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isSyncingRef.current) return;
      // Si el usuario estuvo interactuando o tecleando en los últimos 10s, no interrumpir con sincronizaciones
      if (isUserRecentlyActive(10)) return;
      // Si hay cambios locales aún sin confirmar en el servidor, no descargar (se perderían)
      if (hasUnsyncedChanges()) return;

      try {
        isSyncingRef.current = true;
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
      } finally {
        isSyncingRef.current = false;
      }
    };

    const interval = setInterval(checkServerUpdates, 25000);
    window.addEventListener('focus', checkServerUpdates);

    // 3. Escuchar cambios de fecha global
    const handleDateChange = () => {
      const updated = workspaceStorage.getItem('efi_compras_valid_from');
      if (updated) setSelectedDate(updated);
    };
    window.addEventListener('efi_valid_date_changed', handleDateChange);
    const onSyncError = (event: Event) => setSyncNotification('Guardado pendiente: ' + (event as CustomEvent).detail);
    window.addEventListener('efi_sync_error', onSyncError);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', checkServerUpdates);
      window.removeEventListener('efi_valid_date_changed', handleDateChange);
      window.removeEventListener('efi_sync_error', onSyncError);
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
    return <LoginForm onLoginStart={() => { setEntryRevealing(false); setEntryRequested(true); }} onLoginFailure={() => setEntryRequested(false)} />;
  }

  return <>
    {!syncReady ? <div className="p-10 text-slate-200 bg-slate-950 min-h-screen" aria-hidden={entryRequested} style={{ visibility: entryRequested ? 'hidden' : undefined }} ref={node => { if (node) node.inert = entryRequested; }}>
      <p>{loadError || 'Cargando datos de PostgreSQL...'}</p>
      {loadError && <button className="mt-4 p-3 bg-amber-600 rounded" onClick={() => window.location.reload()}>Reintentar conexión</button>}
    </div> : <div className="efi-app min-h-screen" style={{ visibility: entryRequested && !entryRevealing ? 'hidden' : undefined }} ref={node => { if (node) node.inert = entryRequested; }}>
      <fieldset disabled={entryRequested} className="contents" role="presentation">
      <Header
        deferNotices={entryRequested}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />
      <div key={activeTab} className="efi-route-sweep print:hidden" aria-hidden="true" />
      <main ref={workspace} tabIndex={-1} className="efi-workspace max-w-[1680px] mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="efi-workspace-route print:hidden"><div><span className="efi-route-mark" />ESTACIÓN DE TRABAJO<span className="efi-route-separator">/</span><strong>{{ dashboard: 'Resumen general', comp1: 'Compras', postes: 'Postes', sabana: 'Sábana de precios', pdf: 'PDFs y clientes', comp2: 'EFI Export', users: 'Usuarios', instructions: 'Instrucciones' }[activeTab]}</strong></div><span>La energía de tenerlo todo bajo control.</span></div>
        {/* Los gestores permanecen montados; las tablas ocultas no se renderizan.
            Garantiza que al pasar a Postes y regresar a Compras todos los valores, marcas amarillas y cálculos permanezcan 100% intactos */}
        <div className={activeTab === 'dashboard' ? 'efi-view is-active' : 'hidden'}>
          <ExecutiveDashboard onNavigateTab={setActiveTab} />
        </div>
        <div className={activeTab === 'comp1' ? 'efi-view is-active' : 'hidden'}>
          <Comp1PurchaseManager selectedDate={selectedDate} isActive={activeTab === 'comp1'} />
        </div>
        <div className={activeTab === 'postes' ? 'efi-view is-active' : 'hidden'}>
          <PostesManager selectedDate={selectedDate} isActive={activeTab === 'postes'} />
        </div>
        <div className={activeTab === 'sabana' ? 'efi-view is-active' : 'hidden'}>
          <SabanaPreciosManager selectedDate={selectedDate} isActive={activeTab === 'sabana'} />
        </div>
        <div className={activeTab === 'pdf' ? 'efi-view is-active' : 'hidden'}>
          <PdfGeneratorManager selectedDate={selectedDate} isActive={activeTab === 'pdf'} />
        </div>
        <div className={activeTab === 'comp2' ? 'efi-view is-active' : 'hidden'}>
          <Comp2EfiExporter selectedDate={selectedDate} isActive={activeTab === 'comp2'} />
        </div>
        <div className={activeTab === 'users' ? 'efi-view is-active' : 'hidden'}>
          <UserManager />
        </div>
        <div className={activeTab === 'instructions' ? 'efi-view is-active' : 'hidden'}>
          <InstructionsManager />
        </div>
      </main>
      <footer className="efi-footer print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span><strong className="text-slate-400">EFI DATA OIL App</strong> &bull; Sistema de Gestión de Compras y Precios</span>
          <div className="flex items-center space-x-4">
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-500/20">AREA117 · Contigo en la carretera</span>
            <span>{APP_VERSION}</span>
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
      </fieldset>
    </div>}
    {entryRequested && <LoginDriveTransition ready={syncReady} error={loadError} onReveal={revealEntry} onComplete={finishEntry} />}
  </>;
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
