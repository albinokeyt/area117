'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import { PDF_EXPORT_NAMES_KEY, clientPdfFilename, mergePdfExportNames, parsePdfExportNames, type PdfExportNames } from '@/lib/clientPdfModel';
import { workspaceStorage } from '@/lib/workspaceStorage';
import { flushPendingSync } from '@/lib/serverSyncService';

export function PdfExportNamesModal({ tariffs, names, validFrom, editable, onClose }: {
  tariffs: { name: string }[]; names: PdfExportNames; validFrom: string; editable: boolean; onClose: () => void;
}) {
  const [base] = useState(() => ({ ...names }));
  const [draft, setDraft] = useState(() => ({ ...names }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const nodes = () => [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || [])];
    nodes()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy.current) { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const items = nodes(), first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [onClose]);
  const save = async () => {
    if (!editable || busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const next = mergePdfExportNames(base, draft, parsePdfExportNames(workspaceStorage.getItem(PDF_EXPORT_NAMES_KEY)));
      workspaceStorage.setItem(PDF_EXPORT_NAMES_KEY, JSON.stringify(next));
      await flushPendingSync(); onClose();
    } catch (err) { setError('No se pudieron confirmar los nombres: ' + (err instanceof Error ? err.message : 'Vuelve a intentarlo.')); }
    finally { busy.current = false; setSaving(false); }
  };
  return createPortal(<div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Nombres de archivos PDF" className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 w-full max-w-4xl max-h-[90dvh] flex flex-col gap-4 shadow-2xl">
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-lg">Nombres de archivos PDF</h2><button type="button" aria-label="Cerrar nombres PDF" disabled={saving} onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800"><X size={18} /></button></div>
      <p className="text-xs text-slate-300">Estos nombres se guardan en PostgreSQL y se usan tanto al descargar un PDF como todos juntos. El nombre original de la tarifa y sus fórmulas no cambian. Deja el campo vacío para usar el nombre original. El orden y la fecha se actualizan al descargar.</p>
      <p className="text-xs text-slate-400">Formato: orden + nombre elegido + VALIDA A PARTIR DE + fecha. En los archivos se usa DD-MM-AAAA porque Windows no admite barras /.</p>
      {!editable && <p className="text-xs text-amber-300">Tu cuenta es de solo lectura. Puedes consultar los nombres guardados.</p>}
      <div className="overflow-y-auto min-h-0 space-y-3 pr-1">
        {tariffs.map((tariff, index) => {
          let filename = 'Indica una fecha de validez válida para ver el nombre completo.';
          try { filename = clientPdfFilename(tariff.name, index, draft, validFrom); } catch { /* Date can be incomplete while editing. */ }
          return <div key={tariff.name} className="border border-slate-700 bg-slate-950 rounded-2xl p-3 space-y-2">
            <label className="flex flex-col sm:flex-row gap-2 sm:items-center text-xs font-bold"><span className="sm:w-56 shrink-0">{String(index + 1).padStart(2, '0')} · {tariff.name}</span>
              <input aria-label={`Nombre de archivo ${tariff.name}`} disabled={!editable || saving} maxLength={100} value={draft[tariff.name] || ''} placeholder={tariff.name}
                onChange={event => setDraft(previous => ({ ...previous, [tariff.name]: event.target.value }))} className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-normal" />
            </label><p data-testid="pdf-filename-preview" className="text-[11px] text-slate-400 break-words">{filename}</p>
          </div>;
        })}
      </div>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      <div className="flex justify-end flex-wrap gap-3"><button type="button" disabled={saving} onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold">Cerrar</button>
        {editable && <button type="button" disabled={saving} onClick={() => void save()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"><Save size={15} />{saving ? 'Guardando en PostgreSQL…' : 'Guardar nombres PDF'}</button>}
      </div>
    </div>
  </div>, document.querySelector('.efi-app') || document.body);
}
