'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet, Settings2, Upload, X } from 'lucide-react';
import type { WorkBook } from 'xlsx';
import { DEFAULT_EXCEL_MAPPINGS, EXCEL_MAPPINGS_KEY, INITIAL_SHEET, validateExcelMappings, type ExcelMapping } from '@/lib/excelImportMappings';
import { excelTargets, matchExcelTarget, type ExcelTarget } from '@/lib/excelImportTargets';
import { planExcelImport, savedExcelMappings, type ExcelImportRow } from '@/lib/excelPriceImport';
import { commitReviewedPatch, getReviewSnapshot, type ReviewSnapshot } from '@/lib/serverSyncService';
import { normalizePriceName } from '@/lib/publishedPrices';

const secondary = 'rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700 disabled:opacity-50';
const primary = 'rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-50';
const input = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal';
const formatPrice = (v?: number) => v === undefined ? '—' : v.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 8 });
type Tab = 'preview' | 'map';
type Preview = ReturnType<typeof planExcelImport>;

export function PurchaseExcelImport({ selectedDate }: { selectedDate: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300"
      onClick={() => setOpen(true)}><FileSpreadsheet size={16} /> Importar Excel</button>
    {open && <ExcelImportDialog selectedDate={selectedDate} onClose={() => setOpen(false)} />}
  </>;
}

function ExcelImportDialog({ selectedDate, onClose }: { selectedDate: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const title = useId();
  const [tab, setTab] = useState<Tab>('preview');
  const [snapshot, setSnapshot] = useState<ReviewSnapshot | null>(null);
  const [file, setFile] = useState<{ name: string; book: WorkBook } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [filter, setFilter] = useState<'all' | ExcelImportRow['status']>('all');
  const [working, setWorking] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stale, setStale] = useState(false);
  const [draft, setDraft] = useState<readonly ExcelMapping[] | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setWorking(true); setError(''); setNotice('');
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); }
    finally { busy.current = false; setWorking(false); }
  }

  async function review(book: WorkBook) {
    const fresh = await getReviewSnapshot();
    const next = planExcelImport(book, fresh.data, selectedDate);
    setSnapshot(fresh);
    setPreview(next);
    setStale(false);
  }

  function choose(file: File | undefined) {
    if (!file) return;
    void run(async () => {
      setPreview(null); setFile(null);
      if (!/\.(xlsm|xlsx)$/i.test(file.name) || !file.size || file.size > 20 * 1024 * 1024) {
        throw new Error('Selecciona un Excel .xlsm o .xlsx de hasta 20 MB.');
      }
      const [{ read }, bytes] = await Promise.all([import('xlsx'), file.arrayBuffer()]);
      let book: WorkBook;
      try { book = read(bytes, { bookVBA: false, cellFormula: false, cellHTML: false, cellStyles: false, cellText: false }); }
      catch { throw new Error('No se pudo abrir el Excel. Comprueba que el archivo sea válido y no esté protegido con contraseña.'); }
      if (!book.SheetNames.length) throw new Error('El Excel no contiene hojas.');
      setFile({ name: file.name, book });
      setFilter('all');
      await review(book);
    });
  }

  function openMap() {
    void run(async () => {
      const fresh = await getReviewSnapshot();
      setSnapshot(fresh);
      if (preview) setStale(true);
      setDraft(savedExcelMappings(fresh.data));
      setTab('map');
    });
  }

  function saveMap() {
    if (!draft || !snapshot) return;
    void run(async () => {
      validateExcelMappings(draft);
      await commitReviewedPatch({ [EXCEL_MAPPINGS_KEY]: draft }, snapshot);
      setDraft(null); setTab('preview');
      if (file) await review(file.book);
      setNotice('Mapa de celdas guardado en PostgreSQL.');
    });
  }

  function apply() {
    if (!snapshot || !preview || stale) return;
    void run(async () => {
      try { await commitReviewedPatch(preview.patch, snapshot); }
      catch (error) { setStale(true); throw error; }
      setPreview(null); setFile(null);
      setNotice(`${counts.change} cambios aplicados en PostgreSQL.${counts.issue ? ` Se omitieron ${counts.issue} reglas con avisos.` : ''}`);
    });
  }

  const counts = { change: 0, same: 0, issue: 0 };
  for (const row of preview?.rows || []) counts[row.status]++;
  return createPortal(
    <dialog ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); if (!working) onClose(); }}
      className="max-h-[92dvh] w-[calc(100%_-_1.5rem)] max-w-6xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-0 text-slate-200 shadow-2xl backdrop:bg-slate-950/65">
      <div className="flex max-h-[90dvh] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-slate-700 p-4 sm:p-6">
          <div>
            <h2 id={title} className="flex items-center gap-2 text-xl font-bold"><FileSpreadsheet className="text-emerald-400" /> Importación diaria de Excel</h2>
            <p className="mt-1 text-sm text-slate-400">Actualiza Compras, Postes y Sábana de Precios desde un mismo archivo.</p>
          </div>
          <button type="button" aria-label="Cerrar importación" disabled={working} onClick={onClose} className={secondary}><X size={18} /></button>
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          {tab === 'preview' ? <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">Revisa los valores antes de aplicarlos. Los avisos se omiten.</p>
              <button type="button" onClick={openMap} disabled={working} className={secondary}><span className="flex items-center gap-2"><Settings2 size={16} /> Configurar mapa de celdas</span></button>
            </div>
            <div onDragOver={event => { event.preventDefault(); if (!working) setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={event => { event.preventDefault(); setDrag(false); if (!working) choose(event.dataTransfer.files[0]); }}
              className={`rounded-2xl border border-dashed p-4 ${drag ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-600'}`}>
              <div className="flex flex-wrap items-center gap-3">
                <input ref={upload} type="file" className="sr-only" tabIndex={-1} aria-label="Archivo Excel" accept=".xlsm,.xlsx" disabled={working}
                  onChange={event => { choose(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
                <button type="button" disabled={working} onClick={() => upload.current?.click()} className={primary}><span className="flex items-center gap-2"><Upload size={16} /> Seleccionar Excel</span></button>
                <span className="break-all text-sm text-slate-400">{file ? file.name : 'También puedes arrastrar aquí un XLSM o XLSX.'}</span>
              </div>
              {file && <p className="mt-2 text-xs text-slate-400">Hojas disponibles: {file.book.SheetNames.join(', ')}</p>}
            </div>
            {preview && <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{counts.change} cambios · {counts.same} sin cambios · {counts.issue} avisos</p>
                <label className="flex items-center gap-2 text-sm">Mostrar <select aria-label="Filtrar vista previa" className={input} value={filter}
                  onChange={event => setFilter(event.target.value as typeof filter)}>
                  <option value="all">Todas las reglas</option><option value="change">Cambios</option>
                  <option value="issue">Avisos</option><option value="same">Sin cambios</option>
                </select></label>
              </div>
              {stale && <p role="status" className="text-sm text-amber-300">Actualiza la vista previa antes de aplicar.</p>}
              <div className="max-h-[41dvh] overflow-auto rounded-xl border border-slate-700">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-800 text-xs uppercase text-slate-400"><tr>
                    {['Destino', 'Origen', 'Actual', 'Nuevo', 'Resultado'].map(t => <th key={t} className="px-3 py-2">{t}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {preview.rows.filter(row => filter === 'all' || row.status === filter).map(row => <tr key={row.mapping.target}>
                      <td className="px-3 py-2"><span className="block text-xs text-slate-400">{row.target?.area}</span>{row.target?.label || readableTarget(row.mapping.target)}</td>
                      <td className="px-3 py-2 text-xs">{row.mapping.sheet} · <strong>{row.mapping.cell}</strong></td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono">{formatPrice(row.current)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono">{formatPrice(row.value)}</td>
                      <td className={`px-3 py-2 text-xs ${row.status === 'issue' ? 'text-amber-300' : row.status === 'change' ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {row.status === 'issue' ? 'Omitido: ' : ''}{row.note || (row.status === 'change' ? 'Actualizar' : 'Sin cambios')}
                      </td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
              {!preview.rows.length && <p className="text-sm">El mapa no tiene reglas. Configúralo para importar precios.</p>}
            </>}
            {file && <div className="flex flex-wrap justify-end gap-2">
              <button type="button" disabled={working} className={secondary} onClick={() => void run(() => review(file.book))}>Actualizar vista previa</button>
              <button type="button" disabled={working || stale || !counts.change} className={primary} onClick={apply}>Aplicar {counts.change} cambios</button>
            </div>}
          </> : snapshot && draft && <MappingEditor rules={draft} setRules={setDraft} state={snapshot.data} sheets={file?.book.SheetNames}
            working={working} onBack={() => { setDraft(null); setTab('preview'); setError(''); }} onSave={saveMap} />}
          {working && <p role="status" className="text-sm text-slate-400">Procesando…</p>}
          {notice && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
          {error && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
        </div>
      </div>
    </dialog>,
    document.querySelector('.efi-app') || document.body,
  );
}

const readableTarget = (id: string) => id.split('|').map(p => { try { return decodeURIComponent(p); } catch { return p; } }).join(' · ');

function MappingEditor({ rules, setRules, state, sheets, working, onBack, onSave }: {
  rules: readonly ExcelMapping[]; setRules: (rules: ExcelMapping[]) => void; state: ReviewSnapshot['data'];
  sheets?: string[]; working: boolean; onBack: () => void; onSave: () => void;
}) {
  const [query, setQuery] = useState('');
  const [edit, setEdit] = useState<{ index: number; rule: ExcelMapping } | null>(null);
  const options = useMemo(() => excelTargets(state), [state]);
  const summaries = useMemo(() => rules.map(rule => matchExcelTarget(rule, options)), [rules, options]);
  return <>
    <p className="text-sm text-slate-400">Cada regla indica qué hoja y celda leer y qué precio actualizar. Puedes añadir reglas o cambiar sus celdas. El mapa se comparte entre los usuarios.</p>
    <div className="flex flex-wrap items-center gap-2">
      <input className={`${input} !w-auto flex-1`} aria-label="Buscar reglas" placeholder="Buscar estación, precio o celda" value={query} onChange={event => setQuery(event.target.value)} />
      <button type="button" className={secondary} disabled={working || !!edit} onClick={() => setEdit({ index: -1, rule: { target: '', sheet: INITIAL_SHEET, cell: '', scale: 'auto' } })}>Añadir regla</button>
      <button type="button" className={secondary} disabled={working || !!edit} onClick={() => setRules([...DEFAULT_EXCEL_MAPPINGS])}>Cargar mapa inicial</button>
    </div>
    {edit ? <RuleEditor key={edit.index} initial={edit.rule} target={summaries[edit.index]} options={options} sheets={sheets} working={working}
      onCancel={() => setEdit(null)} onSave={rule => {
        const next = [...rules];
        if (edit.index < 0) next.push(rule); else next[edit.index] = rule;
        validateExcelMappings(next);
        setRules(next); setEdit(null);
      }} /> : <div className="max-h-[45dvh] overflow-auto rounded-xl border border-slate-700">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-800 text-xs uppercase text-slate-400"><tr>
          {['Destino', 'Hoja · Celda', 'Acciones'].map(t => <th key={t} className="px-3 py-2">{t}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-slate-700/60">
          {rules.map((rule, i) => {
            const target = summaries[i];
            const label = target?.label || readableTarget(rule.target);
            if (!normalizePriceName(`${target?.area || ''} ${label} ${rule.sheet} ${rule.cell}`).includes(normalizePriceName(query))) return null;
            return <tr key={rule.target}>
              <td className="px-3 py-2"><span className="block text-xs text-slate-400">{target?.area || 'Destino no disponible'}</span>{label}</td>
              <td className="px-3 py-2 text-xs">{rule.sheet} · <strong>{rule.cell}</strong></td>
              <td className="px-3 py-2"><div className="flex gap-2">
                <button type="button" className={secondary} disabled={working} aria-label={`Editar ${label}`} onClick={() => setEdit({ index: i, rule })}>Editar</button>
                <button type="button" className={secondary} disabled={working} aria-label={`Quitar ${label}`} onClick={() => setRules(rules.filter((_, index) => index !== i))}>Quitar</button>
              </div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>}
    <div className="flex justify-end gap-2">
      <button type="button" className={secondary} disabled={working} onClick={onBack}>Volver a importar</button>
      <button type="button" className={primary} disabled={working || !!edit} onClick={onSave}>Guardar mapa de celdas</button>
    </div>
  </>;
}

function RuleEditor({ initial, target, options, sheets, working, onCancel, onSave }: {
  initial: ExcelMapping; target?: ExcelTarget; options: ExcelTarget[]; sheets?: string[]; working: boolean;
  onCancel: () => void; onSave: (rule: ExcelMapping) => void;
}) {
  const [rule, setRule] = useState(initial);
  const [destination, setDestination] = useState(target);
  const [area, setArea] = useState<ExcelTarget['area']>(target?.area || 'Compras');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const sheetList = useId();
  const filtered = options.filter(t => t.area === area && normalizePriceName(t.label).includes(normalizePriceName(query)));
  const selected = destination || (rule.target ? { label: readableTarget(rule.target) } : null);
  const update = <K extends keyof ExcelMapping>(key: K, value: ExcelMapping[K]) => setRule(previous => ({ ...previous, [key]: value }));
  return <form className="grid gap-3 rounded-xl border border-slate-700 p-4" onSubmit={event => {
    event.preventDefault();
    setError('');
    try {
      onSave({ ...rule, sheet: rule.sheet.trim(), cell: rule.cell.trim().toUpperCase(),
        stationCell: rule.stationCell?.trim().toUpperCase() || undefined, productCell: rule.productCell?.trim().toUpperCase() || undefined });
    } catch (e) { setError((e as Error).message); }
  }}>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-sm font-semibold">Ventana de destino<select className={input} value={area} onChange={event => setArea(event.target.value as typeof area)}>
        {['Compras', 'Postes', 'Sábana de Precios'].map(a => <option key={a}>{a}</option>)}
      </select></label>
      <label className="text-sm font-semibold">Buscar destino<input className={input} value={query} onChange={event => setQuery(event.target.value)} placeholder="Estación, producto o tarifa" /></label>
    </div>
    <label className="text-sm font-semibold">Destino de la celda<select className={input}
      value={selected ? rule.target : ''} onChange={event => {
        const next = options.find(t => t.id === event.target.value);
        setDestination(next); update('target', event.target.value);
      }}>
      {selected ? <option value={rule.target}>{selected.label}</option> : <option value="">Selecciona un destino</option>}
      {filtered.filter(t => t.id !== rule.target).slice(0, 100).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
    </select></label>
    {filtered.length > 100 && <p className="text-xs text-slate-400">Escribe parte del destino para acotar las opciones.</p>}
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="text-sm font-semibold">Hoja Excel<input required maxLength={31} className={input} value={rule.sheet} list={sheets?.length ? sheetList : undefined} onChange={event => update('sheet', event.target.value)} /></label>
      <datalist id={sheetList}>{sheets?.map(sheet => <option key={sheet} value={sheet} />)}</datalist>
      <label className="text-sm font-semibold">Celda del precio<input required maxLength={10} className={input} value={rule.cell} onChange={event => update('cell', event.target.value.toUpperCase())} placeholder="M2" /></label>
      <label className="text-sm font-semibold">Escala<select className={input} value={rule.scale} onChange={event => update('scale', event.target.value as ExcelMapping['scale'])}>
        <option value="auto">Automática (1259 → 1,259)</option><option value="euros">Euros por litro, tal cual</option><option value="miles">Dividir entre 1.000</option>
      </select></label>
      <label className="text-sm font-semibold">Celda que confirma estación<input maxLength={10} className={input} value={rule.stationCell || ''} onChange={event => update('stationCell', event.target.value.toUpperCase())} placeholder="Opcional, p. ej. K2" /></label>
      <label className="text-sm font-semibold">Celda que confirma producto<input maxLength={10} className={input} value={rule.productCell || ''} onChange={event => update('productCell', event.target.value.toUpperCase())} placeholder="Opcional, p. ej. B2" /></label>
    </div>
    {destination?.formulaKey && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!rule.replaceFormula} onChange={event => update('replaceFormula', event.target.checked)} /> Permitir sustituir la fórmula de este destino una vez</label>}
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    <div className="flex justify-end gap-2">
      <button type="button" className={secondary} onClick={onCancel}>Cancelar regla</button>
      <button type="submit" className={primary} disabled={working}>Aceptar regla</button>
    </div>
  </form>;
}
