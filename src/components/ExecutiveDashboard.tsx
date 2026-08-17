'use client';

import React from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, PRODUCTS } from '@/lib/dataSeed';
import {
  TrendingUp, TrendingDown, Building2, Store, Fuel,
  ArrowUpRight, ArrowRight, BarChart3, Target, Zap, ShieldCheck
} from 'lucide-react';

const STATION_COUNT = PROPIAS_STATIONS.length;
const COLLAB_COUNT = COLABORADORA_STATIONS.length;
const FIXED_COLLAB = COLABORADORA_STATIONS.filter((s) => s.isFixedColaboradora).length;

// Datos de ejemplo representativos del Excel
const MOCK_PRICES = [
  { station: 'ARCOS', goa: 1.2150, gasolina: 1.3750, margin: 0.0420 },
  { station: 'ALCUBILLAS', goa: 1.2180, gasolina: 1.3800, margin: 0.0390 },
  { station: 'TORREJON', goa: 1.2100, gasolina: 1.3700, margin: 0.0450 },
  { station: 'MADRID', goa: 1.2200, gasolina: 1.3850, margin: 0.0380 },
  { station: 'VALLECAS', goa: 1.2130, gasolina: 1.3720, margin: 0.0410 },
  { station: 'PAMPLONA', goa: 1.2090, gasolina: 1.3680, margin: 0.0480 },
  { station: 'ALFAJARIN', goa: 1.2160, gasolina: 1.3780, margin: 0.0400 },
  { station: 'BENAMEJI', goa: 1.2070, gasolina: 1.3650, margin: 0.0500 },
];

const PURCHASE_TREND = [1.1820, 1.1850, 1.1790, 1.1900, 1.1950, 1.1880, 1.2010, 1.1970];
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Hoy'];

const avgGoa = MOCK_PRICES.reduce((a, b) => a + b.goa, 0) / MOCK_PRICES.length;
const avgMargin = MOCK_PRICES.reduce((a, b) => a + b.margin, 0) / MOCK_PRICES.length;
const prevGoa = PURCHASE_TREND[PURCHASE_TREND.length - 2];
const todayGoa = PURCHASE_TREND[PURCHASE_TREND.length - 1];
const goaDelta = todayGoa - prevGoa;

const topStations = [...MOCK_PRICES].sort((a, b) => b.margin - a.margin).slice(0, 5);

const maxBar = Math.max(...PURCHASE_TREND);
const minBar = Math.min(...PURCHASE_TREND);

function Bar({ value, label }: { value: number; label: string }) {
  const pct = ((value - minBar) / (maxBar - minBar)) * 100;
  const isToday = label === 'Hoy';
  return (
    <div className="flex flex-col items-center space-y-1 flex-1">
      <span className="text-[9px] font-mono text-slate-400">{value.toFixed(4)}</span>
      <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
        <div
          className={`w-full rounded-t-md transition-all ${isToday ? 'bg-amber-400' : 'bg-slate-700 hover:bg-slate-600'}`}
          style={{ height: `${Math.max(pct, 8)}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold ${isToday ? 'text-amber-400' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}

function KpiCard({
  title, value, unit, delta, deltaLabel, icon: Icon, color
}: {
  title: string; value: string; unit: string; delta?: number;
  deltaLabel?: string; icon: React.ElementType; color: string;
}) {
  const isUp = delta !== undefined ? delta >= 0 : null;
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-3 hover:border-slate-700 transition-colors`}>
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {delta !== undefined && (
          <span className={`flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(delta).toFixed(4)} {unit}</span>
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-white tracking-tight">
          {value}<span className="text-sm text-slate-400 ml-1">{unit}</span>
        </p>
        {deltaLabel && (
          <p className="text-[11px] text-slate-500 mt-1">{deltaLabel}</p>
        )}
      </div>
    </div>
  );
}

export function ExecutiveDashboard() {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <BarChart3 className="h-4 w-4" />
          <span>Vista Ejecutiva</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Dashboard — EFI DATA OIL
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Resumen del día: precios, márgenes y rendimiento de estaciones.
        </p>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Precio Compra GOA (Hoy)"
          value={todayGoa.toFixed(4)}
          unit="€/L"
          delta={goaDelta}
          deltaLabel={`Ayer: ${prevGoa.toFixed(4)} €/L`}
          icon={Fuel}
          color="bg-amber-500/10 text-amber-400"
        />
        <KpiCard
          title="Margen Medio Global"
          value={avgMargin.toFixed(4)}
          unit="€/L"
          deltaLabel={`Precio venta medio: ${(avgGoa + avgMargin).toFixed(4)} €/L`}
          icon={TrendingUp}
          color="bg-emerald-500/10 text-emerald-400"
        />
        <KpiCard
          title="Estaciones Propias Activas"
          value={String(STATION_COUNT)}
          unit="EESS"
          deltaLabel="Postes actualizados al día"
          icon={Building2}
          color="bg-blue-500/10 text-blue-400"
        />
        <KpiCard
          title="Colaboradoras Fijas (EFI)"
          value={String(FIXED_COLLAB)}
          unit={`/ ${COLLAB_COUNT}`}
          deltaLabel="Estaciones con precio fijo en Columna J"
          icon={ShieldCheck}
          color="bg-purple-500/10 text-purple-400"
        />
      </div>

      {/* Charts + Top Stations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar Chart - Precio GOA Últimos 8 Días */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-amber-400" />
              <span>Evolución Precio GOA — Últimos 8 Días</span>
            </h3>
            <span className="text-xs text-amber-400 font-mono bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
              €/Litro
            </span>
          </div>
          <div className="flex items-end space-x-2 h-32">
            {PURCHASE_TREND.map((v, i) => (
              <Bar key={i} value={v} label={DAYS[i]} />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Min: <strong className="text-emerald-400">{Math.min(...PURCHASE_TREND).toFixed(4)} €/L</strong></span>
            <span>Promedio: <strong className="text-amber-400">{(PURCHASE_TREND.reduce((a,b)=>a+b,0)/PURCHASE_TREND.length).toFixed(4)} €/L</strong></span>
            <span>Max: <strong className="text-rose-400">{Math.max(...PURCHASE_TREND).toFixed(4)} €/L</strong></span>
          </div>
        </div>

        {/* Top Estaciones por Margen */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white text-base mb-4 flex items-center space-x-2">
            <Target className="h-5 w-5 text-emerald-400" />
            <span>Top 5 Estaciones por Margen</span>
          </h3>
          <div className="space-y-3">
            {topStations.map((st, i) => {
              const pct = (st.margin / topStations[0].margin) * 100;
              return (
                <div key={st.station}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        i === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>{i + 1}</span>
                      <span>{st.station}</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{st.margin.toFixed(4)} €/L</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full">
                    <div
                      className={`h-1.5 rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-emerald-500/60'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla Precios por Estación */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <span>Precios Actuales — Estaciones Propias</span>
          </h3>
          <span className="text-xs text-slate-400">Actualizado hoy</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-5">Estación</th>
                <th className="py-3 px-5 text-amber-300">GOA Compra (€/L)</th>
                <th className="py-3 px-5 text-amber-300">GOA Premium (€/L)</th>
                <th className="py-3 px-5">Gasolina 95 (€/L)</th>
                <th className="py-3 px-5 text-emerald-300">Margen GOA (€/L)</th>
                <th className="py-3 px-5 text-emerald-300">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              {MOCK_PRICES.map((row) => (
                <tr key={row.station} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-5 font-bold text-white">{row.station}</td>
                  <td className="py-3 px-5 font-mono text-amber-300">{row.goa.toFixed(4)} €</td>
                  <td className="py-3 px-5 font-mono text-amber-400/80">{(row.goa + 0.04).toFixed(4)} €</td>
                  <td className="py-3 px-5 font-mono text-slate-300">{row.gasolina.toFixed(4)} €</td>
                  <td className="py-3 px-5 font-mono font-bold text-emerald-400">{row.margin.toFixed(4)} €</td>
                  <td className="py-3 px-5">
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 w-fit">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>Activa</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Gestionar Compras del Día', desc: 'Columnas N2:U21 y N23:U58', color: 'from-amber-500 to-amber-400', tab: 'comp1' },
          { label: 'Exportar a EFI DATA OIL', desc: 'Hoja IMPORTACION lista para subir', color: 'from-blue-500 to-indigo-500', tab: 'comp2' },
          { label: 'Emitir PDFs a Clientes', desc: 'Sábana de precios con/sin IVA', color: 'from-emerald-500 to-teal-500', tab: 'sabana' },
        ].map((action) => (
          <div key={action.tab} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-colors cursor-pointer group">
            <div className={`inline-flex items-center space-x-2 text-sm font-bold bg-gradient-to-r ${action.color} bg-clip-text text-transparent mb-2`}>
              <ArrowRight className="h-4 w-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
              <span>{action.label}</span>
            </div>
            <p className="text-xs text-slate-500">{action.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
