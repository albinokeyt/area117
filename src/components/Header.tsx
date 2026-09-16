'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, User } from '@/context/AuthContext';
import {
  Fuel, BarChart3, FileSpreadsheet, ShieldCheck, Layers,
  Download, Users, LogOut, ChevronDown, BookOpen, Calendar, X,
  TrendingUp, Building2, Store, CheckCircle2, DollarSign, Printer, FileText,
  CloudUpload, RefreshCw, Lock, AlertCircle, Check
} from 'lucide-react';
import { pushAllStateToServer, pullStateFromServer } from '@/lib/serverSyncService';

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
  { id: 'postes', label: 'Postes', icon: Layers },
  { id: 'sabana', label: 'Sábana de Precios', icon: Download },
  { id: 'pdf', label: 'PDFs & Clientes', icon: Printer },
  { id: 'comp2', label: 'EFI Export', icon: ShieldCheck },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'instructions', label: 'Instrucciones', icon: BookOpen },
];

export function Header({ activeTab, setActiveTab, selectedDate, setSelectedDate }: HeaderProps) {
  const { currentUser, logout } = useAuth();
  const [showDailySummaryModal, setShowDailySummaryModal] = useState(false);
  
  // Estados para sincronización con el servidor
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [syncPassword, setSyncPassword] = useState('admin123');
  const [isUploading, setIsUploading] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [serverVersion, setServerVersion] = useState<string>('1');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('efi_last_server_version') || '1';
      setServerVersion(v);

      const handleSyncEvent = (e: any) => {
        if (e.detail?.version) {
          setServerVersion(e.detail.version.toString());
        }
      };
      window.addEventListener('efi_server_sync_event', handleSyncEvent);
      return () => window.removeEventListener('efi_server_sync_event', handleSyncEvent);
    }
  }, []);

  const handleMasterUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncPassword.trim()) {
      setUploadResult({ success: false, message: 'Ingresa la contraseña para confirmar la subida.' });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const res = await pushAllStateToServer(syncPassword.trim(), currentUser?.name);
      if (res.success) {
        setUploadResult({
          success: true,
          message: `¡Datos maestros subidos con éxito! (${res.keysCount} registros sincronizados, versión #${res.version}). Todos los demás usuarios ahora ven estos mismos datos.`,
        });
        if (res.version) setServerVersion(res.version.toString());
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadResult(null);
        }, 2200);
      } else {
        setUploadResult({
          success: false,
          message: res.error || 'Error al subir los datos. Revisa la contraseña ingresada.',
        });
      }
    } catch (err: any) {
      setUploadResult({
        success: false,
        message: err.message || 'Error de conexión con el servidor.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualPull = async () => {
    setIsPulling(true);
    try {
      const res = await pullStateFromServer();
      if (res.success) {
        if (res.version) setServerVersion(res.version.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsPulling(false), 600);
    }
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg print:hidden">
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

            {/* Right Side: Sync + Date + User */}
            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
              {/* Sync Status / Manual Refresh */}
              <button
                onClick={handleManualPull}
                disabled={isPulling}
                title="Sincronizar datos con el servidor central"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-sm text-xs font-semibold transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${isPulling ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline text-[11px] text-slate-300">v{serverVersion}</span>
              </button>

              {/* Master Upload Button */}
              <button
                onClick={() => {
                  setUploadResult(null);
                  setShowUploadModal(true);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
                title="Subir todos los datos locales de este navegador al servidor central para que todos los usuarios vean exactamente lo mismo"
              >
                <CloudUpload className="h-4 w-4 shrink-0" />
                <span className="font-extrabold tracking-tight whitespace-nowrap">Subir Todo al Servidor</span>
              </button>

              {/* Date Box with Click to Open Day Summary Modal */}
              <div className="flex items-center bg-slate-800/80 hover:bg-slate-800 rounded-xl px-2.5 py-1 border border-slate-700/60 shadow-sm transition-colors">
                <button
                  onClick={() => setShowDailySummaryModal(true)}
                  className="flex items-center space-x-1.5 text-[10px] font-bold text-amber-400 hover:text-amber-300 mr-2 uppercase tracking-tight"
                  title="Haz clic para ver el resumen consolidado del día"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Resumen Día:</span>
                </button>
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
                    {(currentUser?.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[11px] font-bold text-white leading-tight truncate max-w-[100px]">
                      {currentUser?.name ? currentUser.name.split(' ')[0] : 'Admin'}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {currentUser?.role ? ROLE_LABELS[currentUser.role] : 'Administrador'}
                    </p>
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

      {/* Modal Resumen Consolidado del Día (Ventana Emergente al hacer clic en Fecha) */}
      {showDailySummaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Resumen Consolidado de la Fecha</h3>
                  <p className="text-xs text-slate-400">
                    Fecha operativa seleccionada: <span className="text-amber-300 font-mono font-bold">{selectedDate}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDailySummaryModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">Precio Compra Medio</span>
                  <span className="text-xl font-bold text-amber-300 font-mono">1.1970 €/L</span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">Precio Venta Medio</span>
                  <span className="text-xl font-bold text-blue-400 font-mono">1.2395 €/L</span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">Margen Neto Unitario</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">+0.0425 €/L</span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">Estaciones Activas</span>
                  <span className="text-xl font-bold text-purple-400 font-mono">53 Total</span>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Estado de Carga y Sincronización:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">
                      <strong>Estaciones Propias:</strong> 19 cargadas con GOA, Gasolina y Premium
                    </span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">
                      <strong>Estaciones Colaboradoras:</strong> 34 (13 Fijas sincronizadas)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">
                      <strong>Proveedores Especiales:</strong> Nieves y Petromiralles ÷ 1.21
                    </span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">
                      <strong>Archivo EFI IMPORTACION:</strong> Listo para descargar
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => { setActiveTab('comp1'); setShowDailySummaryModal(false); }}
                  className="flex-1 py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all text-center"
                >
                  Ir a Compras del Día &rarr;
                </button>
                <button
                  onClick={() => { setActiveTab('comp2'); setShowDailySummaryModal(false); }}
                  className="flex-1 py-2.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all text-center"
                >
                  Ir a Exportación EFI &rarr;
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDailySummaryModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Subir Todo al Servidor */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
                  <CloudUpload className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Subir Todo al Servidor Central</h3>
                  <p className="text-xs text-amber-400/90 font-medium">Sincronización Maestra Inmediata</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleMasterUpload} className="p-6 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-200/90 space-y-2">
                <div className="flex items-start space-x-2.5">
                  <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-300">¿Qué hace esta función?</p>
                    <p className="text-slate-300 leading-relaxed">
                      Toma <strong>absolutamente todos los datos</strong> visibles en este navegador (precios de compras, postes de gasolineras, sábana de precios con todas sus fórmulas, tarifas especiales, lista de clientes y PDFs configurados) y los guarda en el servidor central.
                    </p>
                    <p className="text-amber-300/90 leading-relaxed font-semibold">
                      🚀 A partir de este momento, cualquier otro usuario o equipo que abra la aplicación verá exactamente esta misma información.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Contraseña de confirmación simple:</span>
                </label>
                <input
                  type="password"
                  value={syncPassword}
                  onChange={(e) => setSyncPassword(e.target.value)}
                  placeholder="admin123 / 117 / 1234 / admin"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Claves autorizadas aceptadas: <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">admin123</code>, <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">117</code>, <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">admin</code>
                </p>
              </div>

              {uploadResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-start space-x-2 ${
                    uploadResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {uploadResult.success ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <span>{uploadResult.message}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
                  disabled={isUploading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Subiendo al servidor...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="h-4 w-4" />
                      <span>Confirmar y Subir al Servidor</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
