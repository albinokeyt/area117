'use client';

import { workspaceStorage } from '@/lib/workspaceStorage';

import React, { useEffect, useState } from 'react';
import { getFreshestPurchasesData } from '@/lib/sabanaFormulaEngine';

const number = (value: unknown) => Number(String(value ?? '0').replace(',', '.')) || 0;
const price = (value: number) => value.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function ExecutiveDashboard({ onNavigateTab }: { onNavigateTab?: (tab: string) => void }) {
  const [rows, setRows] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<{ date: string; count: number }[]>([]);
  useEffect(() => {
    const refresh = () => {
      setRows(getFreshestPurchasesData());
      const closes: { date: string; count: number }[] = [];
      for (let index = 0; index < workspaceStorage.length; index++) {
        const key = workspaceStorage.key(index);
        if (!key?.startsWith('efi_cierre_completo_')) continue;
        try {
          const close = JSON.parse(workspaceStorage.getItem(key) || '{}');
          closes.push({ date: key.slice('efi_cierre_completo_'.length), count: Object.keys(close.purchases || {}).length });
        } catch { /* Ignore malformed legacy history. */ }
      }
      setHistory(closes.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30));
    };
    refresh();
    const events = ['efi_compras_updated', 'efi_server_state_applied', 'efi_cierre_dia', 'efi_stations_updated'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => events.forEach(event => window.removeEventListener(event, refresh));
  }, []);

  const entries = Object.entries(rows);
  const products = [...new Set(entries.map(([key]) => key.slice(key.lastIndexOf('_') + 1)))];
  const ranking = entries.map(([key, row]) => {
    const cost = number(row.curr) + number(row.porte) + number(row.pase) + number(row.fin);
    return { key, buy: number(row.curr), sale: number(row.sale), margin: number(row.sale) - cost };
  }).sort((a, b) => b.margin - a.margin).slice(0, 15);

  return <div className="space-y-6">
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <h2 className="text-2xl font-bold">Resumen de precios</h2>
      <p className="text-slate-400 mt-2">Precios vigentes de Compras y cierres registrados.</p>
      <button onClick={() => onNavigateTab?.('comp1')} className="mt-4 rounded-lg bg-amber-500 text-slate-950 px-4 py-2 font-semibold">Abrir Compras</button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {products.map(product => {
        const values = entries.filter(([key]) => key.endsWith(`_${product}`)).map(([, row]) => row);
        const average = (field: string) => values.reduce((sum, row) => sum + number(row[field]), 0) / values.length;
        return <div key={product} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="font-bold text-amber-400">{product}</h3>
          <p className="text-xs text-slate-400 mt-1">{values.length} precios de estaciones · media simple</p>
          <p className="mt-3">Compra: <strong>{price(average('curr'))} €/L</strong></p>
          <p>Venta: <strong>{price(average('sale'))} €/L</strong></p>
        </div>;
      })}
    </div>
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-auto">
      <h3 className="font-bold mb-4">Mayores márgenes actuales por litro</h3>
      <table className="w-full text-sm text-left">
        <thead className="text-slate-400"><tr><th className="p-2">Estación y producto</th><th>Compra €/L</th><th>Venta €/L</th><th>Margen tras costes €/L</th></tr></thead>
        <tbody>{ranking.map(row => <tr key={row.key} className="border-t border-slate-800">
          <td className="p-2">{row.key.replace(/_/g, ' ')}</td><td>{price(row.buy)}</td><td>{price(row.sale)}</td><td>{price(row.margin)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="font-bold mb-3">Últimos cierres registrados</h3>
      {history.length ? <ul className="space-y-1 text-slate-300">{history.map(close => <li key={close.date}>{close.date}: {close.count} filas de precios</li>)}</ul>
        : <p className="text-slate-400">Aún no hay cierres registrados.</p>}
    </div>
  </div>;
}
