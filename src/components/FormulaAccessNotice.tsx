'use client';
import { useAuth } from '@/context/AuthContext';
import { canManageFormulas } from '@/lib/formulaPermissions';

export function useFormulaAccess() { return canManageFormulas(useAuth().currentUser); }

export function FormulaAccessNotice({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
    <div role="dialog" aria-modal="true" aria-label="Fórmulas protegidas" className="bg-slate-900 rounded-2xl p-6 max-w-md space-y-4 border border-slate-700">
      <h3 className="text-lg font-bold">Fórmulas protegidas</h3>
      <p className="text-sm text-slate-300">Las fórmulas y los orígenes se conservan hasta que un usuario designado los cambie o elimine. Solicita al administrador el permiso Gestionar fórmulas en Usuarios.</p>
      <button type="button" autoFocus onClick={onClose} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Cerrar</button>
    </div>
  </div>;
}
