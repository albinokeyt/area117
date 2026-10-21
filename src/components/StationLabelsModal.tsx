'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tag, X } from 'lucide-react';
import { useStationLabels } from './useStationLabels';
import { assignStationLabel, setAllStationRoutesActive, setStationRouteActive } from '@/lib/stationLabels';

export function StationLabelsModal({ stations, initialStation = '', onClose }: {
  stations: { name: string }[]; initialStation?: string; onClose: () => void;
}) {
  const { labels, labelsFor, routeActive } = useStationLabels();
  const [station, setStation] = useState(initialStation);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]') || [])];
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const nodes = focusable(), first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [onClose]);
  const assigned = stations.filter(item => labelsFor(item.name).length > 0);
  const names = [...new Set(Object.values(labels).flat())];
  return createPortal(<div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:hidden">
    <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl max-h-[90dvh] overflow-y-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="font-bold flex items-center gap-2"><Tag className="w-5 h-5 text-orange-400" />Etiquetas de Estaciones</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar etiquetas" className="p-2 rounded-xl hover:bg-slate-800"><X className="w-5 h-5" /></button>
      </div>
      <p className="text-xs text-slate-300">La asignación se conserva al desactivar una ruta. Activarla marca la fila en verde en Compras y muestra sus etiquetas naranjas en todas las tarifas PDF. Los cambios se guardan automáticamente en PostgreSQL.</p>
      <form className="rounded-2xl border border-slate-700 p-3 space-y-3" onSubmit={event => {
        event.preventDefault(); assignStationLabel(station, text); setNotice(`Etiqueta ${text.trim().toUpperCase()} asignada y activada en ${station}.`); setText('');
      }}>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold">Estación a asignar
            <select required value={station} onChange={event => setStation(event.target.value)} className="block w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
              <option value="">Selecciona una estación</option>
              {stations.map(item => <option key={item.name} value={item.name}>{item.name}{labelsFor(item.name).length ? ` (${labelsFor(item.name).join(', ')})` : ''}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold">Nombre de la etiqueta
            <input required maxLength={60} value={text} onChange={event => setText(event.target.value)} list={`${id}-names`} placeholder="Ej: MADRID o RUTA A2" className="block w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 uppercase" />
            <datalist id={`${id}-names`}>{names.map(name => <option key={name} value={name} />)}</datalist>
          </label>
        </div>
        <button type="submit" disabled={!station || !text.trim()} className="px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl disabled:opacity-40">Asignar etiqueta</button>
      </form>
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <strong className="mr-auto">{assigned.filter(item => routeActive(item.name)).length} rutas activas · {assigned.length} estaciones con etiqueta</strong>
        <button type="button" onClick={() => setAllStationRoutesActive(true)} className="p-2 rounded-lg bg-emerald-500/15">Activar todas</button>
        <button type="button" onClick={() => setAllStationRoutesActive(false)} className="p-2 rounded-lg bg-slate-800">Desactivar todas</button>
      </div>
      <input aria-label="Buscar estación o etiqueta" placeholder="Buscar estación o etiqueta…" value={search} onChange={event => setSearch(event.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs" />
      <div className="overflow-y-auto min-h-0 space-y-2">
        {assigned.filter(item => `${item.name} ${labelsFor(item.name).join(' ')}`.toLocaleUpperCase().includes(search.toLocaleUpperCase())).map(item => <label key={item.name} className="flex items-center gap-3 rounded-xl border border-slate-700 px-3 py-2 cursor-pointer">
          <input type="checkbox" aria-label={`Ruta activa ${item.name}`} checked={routeActive(item.name)} onChange={event => setStationRouteActive(item.name, event.target.checked)} className="h-4 w-4 accent-emerald-600" />
          <span className="font-bold text-xs mr-auto">{item.name}<small className="block font-normal text-slate-400">{routeActive(item.name) ? 'Activa en Compras y PDFs' : 'Inactiva · asignación conservada'}</small></span>
          <span className="flex gap-1 flex-wrap justify-end">{labelsFor(item.name).map(label => <span key={label} className="rounded bg-orange-500 px-2 py-1 text-white text-[10px] font-bold">{label}</span>)}</span>
        </label>)}
        {!assigned.length && <p className="text-xs text-slate-400 py-3">Asigna la primera etiqueta para poder activar su ruta.</p>}
      </div>
      {notice && <p role="status" className="text-xs text-emerald-400">{notice}</p>}
      <button type="button" onClick={onClose} className="self-end rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold">Cerrar</button>
    </div>
  </div>, document.querySelector('.efi-app') || document.body);
}
