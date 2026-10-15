'use client';

import { useState } from 'react';
import { PdfSourceConfig, SabanaPrices, pdfStationSource, publishedStationPrice } from '@/lib/publishedPrices';

interface Props {
  initialTariff: string;
  tariffs: { name: string }[];
  stations: { name: string }[];
  mapping: Record<string, PdfSourceConfig>;
  published: SabanaPrices | null;
  date: string;
  onSave: (mapping: Record<string, PdfSourceConfig>) => void;
  onClose: () => void;
}

export function PdfPriceSourcesModal({ initialTariff, tariffs, stations, mapping, published, date, onSave, onClose }: Props) {
  const [tariff, setTariff] = useState(initialTariff);
  const [search, setSearch] = useState('');
  const [bulkSource, setBulkSource] = useState('DEFAULT');
  const options = published ? [...new Map(Object.entries(published.tariffs).map(([name, id]) => [id, { id, name }])).values()] : [];
  const priceText = (price?: number) => price !== undefined && Number.isFinite(price) ? price.toFixed(3).replace('.', ',') : 'Sin origen';
  const saveSource = (source: string, station?: string) => {
    const updated = { ...mapping };
    for (const st of station ? [{ name: station }] : stations) {
      const clean = st.name.toUpperCase().replace(/^ES\s+/, '').trim();
      updated[`${tariff}::${st.name}`] = { sourceType: source };
      updated[`${tariff}::${clean}`] = { sourceType: source };
    }
    if (!station) updated[`${tariff}::__DEFAULT__`] = { sourceType: source };
    onSave(updated);
  };
  const sourceOptions = <><option value="DEFAULT">Tarifa correspondiente en Sábana</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</>;

  return <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 print:hidden">
    <div role="dialog" aria-modal="true" aria-label="Orígenes de precios en Sábana" className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-auto space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div><h3 className="text-lg font-bold">Origen de precios en Sábana</h3><p className="text-sm text-slate-400">Los precios sin IVA y con IVA siguen las celdas de la estación y tarifa seleccionadas en Sábana.</p></div>
        <button aria-label="Cerrar orígenes" onClick={onClose}>✕</button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <select aria-label="Tarifa PDF a configurar" value={tariff} onChange={e => setTariff(e.target.value)} className="bg-slate-950 rounded-lg p-2">{tariffs.map(t => <option key={t.name}>{t.name}</option>)}</select>
        <select aria-label="Origen Sábana para todas las estaciones" value={bulkSource} onChange={e => setBulkSource(e.target.value)} className="bg-slate-950 rounded-lg p-2">{sourceOptions}</select>
        <button className="bg-purple-600 rounded-lg p-2" onClick={() => saveSource(bulkSource)}>Aplicar a todas</button>
        <input aria-label="Buscar estación para asignar origen" placeholder="Buscar estación" value={search} onChange={e => setSearch(e.target.value)} className="bg-slate-950 rounded-lg p-2" />
      </div>
      <table className="w-full text-sm"><thead><tr><th className="text-left p-2">Estación</th><th>Origen en Sábana</th><th>Sin IVA</th><th>Con IVA</th></tr></thead>
        <tbody>{stations.filter(st => st.name.toLowerCase().includes(search.toLowerCase())).map(st => {
          const source = pdfStationSource(tariff, st.name, mapping, published);
          const price = publishedStationPrice(published, date, source, st.name);
          return <tr key={st.name} className="border-t border-slate-800"><td className="p-2">{st.name}</td>
            <td className="p-2"><select aria-label={`Origen Sábana ${st.name}`} value={source || 'DEFAULT'} onChange={e => saveSource(e.target.value, st.name)} className="w-full bg-slate-950 rounded-lg p-2">
              {sourceOptions}{source && !options.some(o => o.id === source) && <option value={source}>Origen no disponible</option>}
            </select></td><td className="p-2 text-right font-mono">{priceText(price?.sinIva)}</td><td className="p-2 text-right font-mono">{priceText(price?.conIva)}</td></tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}
