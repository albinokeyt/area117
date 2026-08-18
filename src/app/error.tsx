'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Captured by Next.js ErrorBoundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Recuperación de Interfaz</h2>
        <p className="text-xs text-slate-400">
          El sistema ha detectado una actualización en la interfaz. Pulsa el botón inferior para recargar los componentes limpios.
        </p>
        {error?.message && (
          <pre className="p-3 bg-slate-950 rounded-xl text-[11px] text-rose-400 font-mono overflow-x-auto text-left border border-slate-800">
            {error.message}
          </pre>
        )}
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            } else {
              reset();
            }
          }}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Recargar Panel de Control</span>
        </button>
      </div>
    </div>
  );
}
