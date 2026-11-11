'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { flushPendingSync } from '@/lib/serverSyncService';
import { savePurchaseLocations } from '@/lib/stationsService';

export function PurchaseLocationsModal({ group, stations, onClose }: {
  group: string;
  stations: { name: string; location: string }[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  return createPortal(
    <dialog ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}
      className="bg-slate-900 text-slate-200 border border-slate-700 rounded-3xl p-0 shadow-2xl w-[calc(100%_-_2rem)] max-w-2xl backdrop:bg-slate-950/65">
      <form className="p-5 sm:p-6 flex flex-col gap-4 max-h-[85dvh]" onSubmit={async event => {
        event.preventDefault();
        if (saving) return;
        setSaving(true); setError('');
        try {
          const edits = stations.flatMap(({ name, location: before }) => {
            const typed = draft[name]?.trim();
            if (typed === undefined) return [];
            if (!typed || /^(0|n\/a)$/i.test(typed)) throw new Error(`Indica un lugar de compra válido para ${name}.`);
            const location = typed.toUpperCase();
            return location === before ? [] : [{ station: name, before, location }];
          });
          savePurchaseLocations(edits);
          await flushPendingSync();
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No se pudo guardar el CLH. Inténtalo de nuevo.');
        } finally { setSaving(false); }
      }}>
        <div>
          <h2 id={title} className="text-xl font-bold">Editar CLH · Lugar de compra</h2>
          <p className="text-sm text-slate-400">{group}. El cambio se aplica a la estación en todos sus productos y se guarda hasta que lo vuelvas a editar.</p>
        </div>
        <div className="overflow-y-auto min-h-0 divide-y divide-slate-700/40">
          {stations.map(({ name, location }) => (
            <label key={name} className="grid sm:grid-cols-2 gap-2 items-center py-2 pr-2 text-sm font-semibold">
              <span>{name}</span>
              <input aria-label={`Lugar de compra ${name}`} required maxLength={80} disabled={saving}
                value={draft[name] ?? location} onChange={event => setDraft({ ...draft, [name]: event.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-bold">
            {saving ? 'Guardando…' : 'Guardar lugares de compra'}
          </button>
        </div>
      </form>
    </dialog>,
    document.querySelector('.efi-app') || document.body,
  );
}
