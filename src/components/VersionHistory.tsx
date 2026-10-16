'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { History, X } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';
import { AppRelease } from '@/lib/releases';
import { flushPendingSync } from '@/lib/serverSyncService';

export function VersionHistory({ onNoticeChange, enabled = true }: { onNoticeChange?: (message: string | null) => void; enabled?: boolean }) {
  const [releases, setReleases] = useState<AppRelease[]>([]);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const notified = useRef('');
  const closeButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const latest = releases[0];
  const needsReload = !!latest && latest.version !== APP_VERSION;
  const load = useCallback(async (manual = false) => {
    try {
      const response = await fetch('/api/releases', { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar el historial. Vuelve a intentarlo.');
      const result = await response.json();
      setReleases(result.releases);
      onNoticeChange?.(result.currentVersion !== APP_VERSION ? 'Actualización disponible' : result.unread ? 'Hay novedades' : null);
      if (manual || (result.unread && notified.current !== result.currentVersion)) {
        notified.current = result.currentVersion;
        setHistory(manual); setOpen(true);
      }
      setError('');
    } catch (err) { if (manual) { setError((err as Error).message); setOpen(true); } }
  }, [onNoticeChange]);
  useEffect(() => {
    if (!enabled) return;
    void load();
    const onFocus = () => { if (!document.hidden) void load(); };
    const interval = setInterval(onFocus, 60000);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [load, enabled]);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    closeButton.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; previousFocus.current?.focus(); };
  }, [open]);
  const close = async () => {
    if (!latest) { setOpen(false); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/releases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: latest.version }) });
      if (!response.ok) throw new Error('No se pudo guardar tu confirmación. Inténtalo otra vez.');
      setOpen(false); setError('');
      onNoticeChange?.(needsReload ? 'Actualización disponible' : null);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  const reload = async () => {
    setBusy(true);
    try { await flushPendingSync(); window.location.reload(); }
    catch { setError('Hay cambios pendientes de guardar. Revisa el guardado antes de actualizar.'); setBusy(false); }
  };
  return <>
    <button type="button" aria-label="Historial de versiones" onClick={() => void load(true)} className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-xl border border-slate-600 text-xs text-slate-200 hover:bg-slate-700" title="Consultar todos los cambios publicados">
      <History className="h-4 w-4" /><span>Historial de versiones</span>
    </button>
    {open && createPortal(<div className="fixed inset-0 z-[100] bg-slate-950/85 flex items-center justify-center p-4 print:hidden" onKeyDown={event => {
      if (event.key === 'Escape' && !busy) { event.preventDefault(); void close(); }
      if (event.key === 'Tab') {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [href]'));
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="release-title" className="w-full max-w-3xl max-h-[85vh] overflow-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-5">
        <div className="flex justify-between gap-4 items-start"><div><h2 id="release-title" className="text-xl font-bold">{history ? 'Historial de versiones' : `Novedades ${latest?.version || ''}`}</h2><p className="text-sm text-slate-400">{needsReload ? 'Hay una nueva versión disponible. Guarda y actualiza para aplicarla.' : 'Estos son los cambios aplicados al sistema.'}</p></div>
          <button ref={closeButton} disabled={busy} onClick={() => void close()} aria-label="Cerrar novedades" className="p-1 rounded hover:bg-slate-700"><X /></button></div>
        {(history ? releases : releases.slice(0, 1)).map(release => <article key={release.version} className="border-t border-slate-700 pt-4"><h3 className="font-bold text-amber-300">{release.version} · {release.title}</h3><p className="text-xs text-slate-400 mb-3">{release.date}</p><ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">{release.changes.map(change => <li key={change}>{change}</li>)}</ul></article>)}
        {error && <p role="alert" className="text-rose-300">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-700 pt-4">
          {!history && <button onClick={() => setHistory(true)} className="text-sm text-slate-300 underline">Ver todas las versiones</button>}
          {needsReload && <button disabled={busy} onClick={() => void reload()} className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl">Guardar y actualizar aplicación</button>}
          <button disabled={busy} onClick={() => void close()} className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl">Entendido</button>
        </div>
      </section>
    </div>, document.querySelector('.efi-app') || document.body)}
  </>;
}
