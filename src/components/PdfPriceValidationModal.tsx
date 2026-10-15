'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, X } from 'lucide-react';
import { PdfValidationReport, PdfValidationRow } from '@/lib/pdfPriceValidation';
import { normalizePriceName } from '@/lib/publishedPrices';
import { workspaceStorage } from '@/lib/workspaceStorage';
import { isBusinessKey } from '@/lib/serverSyncService';

interface Props { date: string; runValidation: () => PdfValidationReport; onClose: () => void }
const price = (value?: number) => value !== undefined && Number.isFinite(value) ? `${value.toFixed(3).replace('.', ',')} €` : 'No disponible';
const labels = { ok: 'Coincide', difference: 'Diferencia', review: 'Revisar' };
function capture(run: Props['runValidation']) {
  try { return { report: run(), error: '' }; }
  catch { return { report: null, error: 'No se pudo completar la validación. Vuelve a intentarlo cuando terminen de cargar los datos.' }; }
}

export function PdfPriceValidationModal({ date, runValidation, onClose }: Props) {
  const [result, setResult] = useState(() => capture(runValidation));
  const [status, setStatus] = useState('all');
  const [tariff, setTariff] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const unsubscribe = workspaceStorage.subscribe(key => {
      if (isBusinessKey(key)) setResult(previous => previous.report && !previous.report.stale
        ? { ...previous, report: { ...previous.report, stale: true } } : previous);
    });
    return () => { unsubscribe(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const report = result.report;
  const stale = report?.stale || (report && report.date !== date);
  const counts = { ok: 0, difference: 0, review: 0 };
  report?.rows.forEach(row => counts[row.status]++);
  const hasIssues = counts.difference + counts.review > 0 || !!report?.formulaIssues.length || !report?.rows.length;
  const filtered = report?.rows.filter(row => (!tariff || row.tariff === tariff) &&
    (status === 'all' || (status === 'issues' ? row.status !== 'ok' : row.status === status)) &&
    normalizePriceName(`${row.station} ${row.tariff} ${row.sourceLabel}`).includes(normalizePriceName(search))) || [];
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const currentPage = Math.min(page, pages - 1);
  const rows = filtered.slice(currentPage * 50, (currentPage + 1) * 50);
  const rerun = () => { setResult(capture(runValidation)); setPage(0); };

  return <div className="fixed inset-0 z-[70] bg-slate-950/90 flex items-center justify-center p-3 sm:p-6 print:hidden" onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, summary'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <section role="dialog" aria-modal="true" aria-labelledby="pdf-validation-title" className="w-full max-w-7xl max-h-[92vh] overflow-auto bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 space-y-4 text-slate-100 shadow-2xl">
      <div className="flex justify-between items-start gap-3">
        <div><h2 id="pdf-validation-title" className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="text-teal-400" />Validación de tarifas PDF</h2>
          <p className="text-sm text-slate-400 mt-1">Cruce de todas las tarifas y estaciones con las celdas y fórmulas actuales de Sábana, sin IVA y con IVA. Se respetan las excepciones de origen guardadas.</p>
          <p className="text-xs text-slate-400 mt-1">Comprueba los precios de los PDF que se generan ahora. Los PDF ya descargados conservan sus precios originales.</p></div>
        <button ref={closeRef} onClick={onClose} aria-label="Cerrar validación" className="p-2 rounded-lg hover:bg-slate-700"><X className="h-5 w-5" /></button>
      </div>
      {result.error && <p role="alert" className="bg-rose-950 text-rose-200 rounded-xl p-3">{result.error}</p>}
      {report && <>
        <div role="status" className={`rounded-xl p-3 text-sm border ${stale ? 'border-amber-500/50 bg-amber-500/10 text-amber-200' : hasIssues ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'}`}>
          <p className="font-bold">{stale ? 'Informe desactualizado: los datos han cambiado. Vuelve a validar.' : hasIssues ? 'Hay resultados que necesitan revisión.' : 'Todos los precios PDF coinciden con sus orígenes configurados.'}</p>
          <p className="mt-1">{report.tariffCount} tarifas · {report.stationCount} estaciones · {report.rows.length} combinaciones · {report.rows.length * 2} precios comprobados.</p>
          <p className="text-xs mt-1">Fecha de trabajo: {report.date.split('-').reverse().join('/')} · Validado: {new Date(report.checkedAt).toLocaleString('es-ES')}. Incluye estaciones desactivadas. La fecha de validez del documento no cambia el origen del precio.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <p className="rounded-xl bg-emerald-500/10 p-3 text-emerald-300" data-testid="validation-ok"><strong>{counts.ok}</strong> coinciden</p>
          <p className="rounded-xl bg-rose-500/10 p-3 text-rose-300" data-testid="validation-difference"><strong>{counts.difference}</strong> diferencias</p>
          <p className="rounded-xl bg-amber-500/10 p-3 text-amber-300" data-testid="validation-review"><strong>{counts.review}</strong> por revisar</p>
        </div>
        {report.formulaIssues.length > 0 && <details className="rounded-xl border border-amber-500/40 p-3 text-sm text-amber-200"><summary className="cursor-pointer font-bold">Fórmulas de Sábana por revisar ({report.formulaIssues.length})</summary>
          <ul className="mt-2 space-y-1">{report.formulaIssues.map(issue => <li key={issue.cell} className="break-words"><strong>{issue.cell}</strong>: {issue.message}</li>)}</ul></details>}
        <div className="flex flex-wrap gap-2">
          <select aria-label="Filtrar validación por tarifa" value={tariff} onChange={event => { setTariff(event.target.value); setPage(0); }} className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm max-w-full">
            <option value="">Todas las tarifas</option>{[...new Set(report.rows.map(row => row.tariff))].map(name => <option key={name}>{name}</option>)}
          </select>
          <select aria-label="Filtrar validación por resultado" value={status} onChange={event => { setStatus(event.target.value); setPage(0); }} className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm">
            <option value="all">Todos los resultados</option><option value="issues">Solo incidencias</option><option value="ok">Coinciden</option><option value="difference">Diferencias</option><option value="review">Por revisar</option>
          </select>
          <input aria-label="Buscar en validación" placeholder="Buscar estación, tarifa u origen" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm flex-1 min-w-48" />
        </div>
        <div className="overflow-x-auto border border-slate-700 rounded-xl">
          <table className="w-full text-xs text-left"><caption className="sr-only">Comparación de precios PDF con Sábana y reglas de origen</caption>
            <thead className="bg-slate-950 text-slate-300"><tr>{['Tarifa / estación', 'Origen y fórmula', 'PDF sin IVA', 'Origen sin IVA', 'PDF con IVA', 'Origen con IVA', 'Resultado'].map(title => <th key={title} className="p-3 whitespace-nowrap">{title}</th>)}</tr></thead>
            <tbody>{rows.map(row => <ValidationRow key={`${row.tariff}::${row.station}`} row={row} />)}</tbody>
          </table>
          {!rows.length && <p className="text-center p-6 text-slate-400">No hay resultados para estos filtros.</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span>{filtered.length} resultados · Página {currentPage + 1} de {pages}</span>
          <div className="flex gap-2"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="rounded-lg bg-slate-800 px-3 py-2 disabled:opacity-40">Anterior</button><button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg bg-slate-800 px-3 py-2 disabled:opacity-40">Siguiente</button></div>
        </div>
      </>}
      <div className="flex flex-wrap justify-between items-center gap-3 border-t border-slate-700 pt-4">
        <p className="text-xs text-slate-400">La validación comprueba las reglas configuradas; no cambia precios ni fórmulas.</p>
        <button onClick={rerun} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-xl text-sm font-bold"><RefreshCw className="h-4 w-4" />Volver a validar</button>
      </div>
    </section>
  </div>;
}

function ValidationRow({ row }: { row: PdfValidationRow }) {
  return <tr className="border-t border-slate-800 align-top" data-testid="pdf-validation-row">
    <td className="p-3"><strong className="block text-amber-200">{row.tariff}</strong><span className="block mt-1">{row.station}</span><span className="text-slate-400">{row.active ? 'Activa en PDF' : 'Desactivada en PDF'}</span></td>
    <td className="p-3 min-w-48 max-w-xs"><p>{row.sourceLabel}</p><details className="mt-1 text-slate-400"><summary className="cursor-pointer">Ver regla</summary><p className="break-words mt-1">Sin IVA: {row.sinFormula || 'Resultado de la regla del origen indicado.'}</p><p className="break-words mt-1">Con IVA: {row.conFormula || 'Sin IVA × 1,21.'}</p><p className="break-all text-[10px] mt-1">{row.source}</p></details></td>
    <td className="p-3 font-mono whitespace-nowrap">{price(row.pdf?.sinIva)}</td><td className="p-3 font-mono whitespace-nowrap">{price(row.expected?.sinIva)}</td>
    <td className="p-3 font-mono whitespace-nowrap">{price(row.pdf?.conIva)}</td><td className="p-3 font-mono whitespace-nowrap">{price(row.expected?.conIva)}</td>
    <td className={`p-3 min-w-40 ${row.status === 'ok' ? 'text-emerald-300' : row.status === 'difference' ? 'text-rose-300' : 'text-amber-300'}`}><strong>{labels[row.status]}</strong>{row.messages.map(message => <p key={message} className="mt-1">{message}</p>)}</td>
  </tr>;
}
