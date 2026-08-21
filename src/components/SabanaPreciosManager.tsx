'use client';

import React, { useState } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS } from '@/lib/dataSeed';
import {
  FileSpreadsheet, Download, Filter, Search, Table, Sparkles, Building2, Store
} from 'lucide-react';

interface SabanaProps {
  selectedDate: string;
}

// Tarifas Estándar (Columnas B a T en el Excel)
const STANDARD_TARIFFS = [
  { id: '12', name: 'Tarifa 12', markup: 0.120 },
  { id: '18', name: 'Tarifa 18', markup: 0.126 },
  { id: '24', name: 'Tarifa 24', markup: 0.132 },
  { id: '36', name: 'Tarifa 36', markup: 0.144 },
  { id: '40', name: 'Tarifa 40', markup: 0.148 },
  { id: '42', name: 'Tarifa 42', markup: 0.150 },
  { id: '47', name: 'Tarifa 47', markup: 0.155 },
  { id: '50', name: 'Tarifa 50 (60)', markup: 0.160 },
  { id: '60', name: 'Tarifa 60 (80)', markup: 0.170 },
];

// Tarifas Especiales (Bloque inferior en el Excel)
const SPECIAL_TARIFF_GROUPS = [
  {
    id: 'javi',
    name: 'Tarifa Especial Los Javi',
    description: 'Precios preferenciales asignados para la flota Los Javi (Cols V:W)',
    markup: 0.116,
    color: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
  },
  {
    id: 'c0_ror',
    name: 'Tarifa Especial C-0 & ROR / Esteban / Miki',
    description: 'Tarifas especiales para grupos de transporte internacional y ROR (Cols AI:AK)',
    markup: 0.112,
    color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
  },
  {
    id: 'eco_trans',
    name: 'Tarifa ECO Trans & AMAEXO / NORIEGA / E100',
    description: 'Tarifas corporativas ECO y convenios con tarjetas profesionales',
    markup: 0.118,
    color: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  },
  {
    id: 'tarifa_30',
    name: 'Tarifa 30 / Especial Completo',
    description: 'Condiciones generales de descuento de 30 céntimos por pase de red',
    markup: 0.138,
    color: 'border-purple-500/30 bg-purple-500/5 text-purple-300',
  },
];

export function SabanaPreciosManager({ selectedDate }: SabanaProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PROPIA' | 'COLABORADORA'>('ALL');

  const allStations = [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];
  
  const filteredStations = allStations.filter((st) => {
    const matchesSearch = st.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = typeFilter === 'ALL' || st.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Base price calculation per station
  const getStationBasePrice = (stName: string, isPropia: boolean) => {
    const hash = stName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offset = (hash % 10) * 0.002;
    return isPropia ? 1.1520 + offset : 1.1560 + offset;
  };

  const handleExportCsv = () => {
    let csv = 'Tipo;Estacion;';
    STANDARD_TARIFFS.forEach((t) => {
      csv += `${t.name} Sin IVA;${t.name} Con IVA;`;
    });
    csv += '\n';

    filteredStations.forEach((st) => {
      const isPropia = st.type === 'PROPIA';
      const base = getStationBasePrice(st.name, isPropia);
      csv += `${st.type};${st.name};`;
      STANDARD_TARIFFS.forEach((t) => {
        const sinIva = Number((base + t.markup).toFixed(4));
        const conIva = Number((sinIva * 1.21).toFixed(4));
        csv += `${sinIva.toFixed(4).replace('.', ',')};${conIva.toFixed(4).replace('.', ',')};`;
      });
      csv += '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SABANA_PRECIOS_${selectedDate}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Sábana de Precios — Vista Matricial</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sábana General de Precios y Tarifas
            </h2>
            <p className="text-slate-400 text-sm">
              Columna de estaciones identificada con <strong className="text-blue-400">Azul para Propias</strong> y <strong className="text-purple-400">Morado para Colaboradoras</strong>. Tarifas estándar arriba y tarifas especiales abajo.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all active:scale-95"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Descargar Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar estación por nombre..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        {/* Station Type Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 flex items-center space-x-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filtrar:</span>
          </span>
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({allStations.length})
            </button>
            <button
              onClick={() => setTypeFilter('PROPIA')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'PROPIA'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-blue-300'
              }`}
            >
              Propias ({PROPIAS_STATIONS.length})
            </button>
            <button
              onClick={() => setTypeFilter('COLABORADORA')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'COLABORADORA'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              Colaboradoras ({COLABORADORA_STATIONS.length})
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-xs">
          <span className="inline-flex items-center space-x-1.5 bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Azul = Propias</span>
          </span>
          <span className="inline-flex items-center space-x-1.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-full font-bold">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Morado = Colaboradoras</span>
          </span>
        </div>
      </div>

      {/* BLOQUE 1: RECUADRO SUPERIOR — TARIFAS ESTÁNDAR (12 A 60) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Table className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Tarifas Estándar (Tarifas 12 a 60)</h3>
              <p className="text-xs text-slate-400">Precios sin IVA y con IVA (+21%) para toda la red de estaciones</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {filteredStations.length} Estaciones Mostradas
          </span>
        </div>

        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-30 bg-slate-950">
              {/* Header Row 1: Tarifas Groups */}
              <tr className="border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 sticky left-0 bg-slate-950 z-40 border-r border-slate-800" rowSpan={2}>
                  Estación de Servicio
                </th>
                {STANDARD_TARIFFS.map((tariff) => (
                  <th
                    key={tariff.id}
                    colSpan={2}
                    className="py-2.5 px-3 text-center border-r border-slate-800 bg-slate-900/90 text-amber-300 font-extrabold"
                  >
                    {tariff.name}
                  </th>
                ))}
              </tr>

              {/* Header Row 2: Sin IVA / Con IVA */}
              <tr className="border-b-2 border-slate-700 text-slate-400 font-semibold text-[10px] uppercase">
                {STANDARD_TARIFFS.map((tariff) => (
                  <React.Fragment key={`${tariff.id}_sub`}>
                    <th className="py-2 px-2.5 text-right bg-slate-950 text-slate-300">Sin IVA</th>
                    <th className="py-2 px-2.5 text-right bg-slate-950/80 text-emerald-400 border-r border-slate-800">
                      Con IVA (+21%)
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filteredStations.map((st) => {
                const isPropia = st.type === 'PROPIA';
                const base = getStationBasePrice(st.name, isPropia);

                // Colores EXCLUSIVAMENTE en la celda del nombre de la estación
                const stationCellClass = isPropia
                  ? 'bg-blue-950/40 text-blue-200 border-l-4 border-l-blue-500 font-bold'
                  : 'bg-purple-950/40 text-purple-200 border-l-4 border-l-purple-500 font-bold';

                const badgeClass = isPropia
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30';

                return (
                  <tr key={st.name} className="hover:bg-slate-800/40 transition-colors">
                    {/* Columna Estación con Color Azul (Propia) o Morado (Colaboradora) */}
                    <td
                      className={`py-2.5 px-4 sticky left-0 z-20 border-r border-slate-800 ${stationCellClass}`}
                    >
                      <div className="flex items-center justify-between space-x-2 font-sans">
                        <span className="font-extrabold tracking-tight">{st.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border uppercase tracking-wider ${badgeClass}`}>
                          {isPropia ? 'PROPIA' : 'COLAB'}
                        </span>
                      </div>
                    </td>

                    {/* Columnas de Precios (Limpias y Neutras para Máxima Legibilidad) */}
                    {STANDARD_TARIFFS.map((tariff) => {
                      const sinIva = Number((base + tariff.markup).toFixed(4));
                      const conIva = Number((sinIva * 1.21).toFixed(4));

                      return (
                        <React.Fragment key={`${st.name}_${tariff.id}`}>
                          <td className="py-2.5 px-2.5 text-right text-slate-300 bg-slate-900/10">
                            {sinIva.toFixed(3)} €
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-bold text-emerald-400 bg-emerald-500/5 border-r border-slate-800/80">
                            {conIva.toFixed(3)} €
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOQUE 2: RECUADROS INFERIORES — TARIFAS ESPECIALES SEPARADAS */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-white">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <h3 className="text-xl font-extrabold tracking-tight">Tarifas Especiales por Convenio y Cliente</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SPECIAL_TARIFF_GROUPS.map((grp) => (
            <div
              key={grp.id}
              className={`bg-slate-900 border ${grp.color.split(' ')[0]} rounded-3xl p-6 shadow-xl space-y-4`}
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-extrabold text-white text-base">{grp.name}</h4>
                  <p className="text-xs text-slate-400">{grp.description}</p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full border bg-slate-950 text-amber-300">
                  +{grp.markup.toFixed(3)} €
                </span>
              </div>

              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800 font-bold">
                      <th className="py-2 px-3">Estación</th>
                      <th className="py-2 px-3 text-right">Sin IVA</th>
                      <th className="py-2 px-3 text-right text-emerald-400">Con IVA (21%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredStations.slice(0, 10).map((st) => {
                      const isPropia = st.type === 'PROPIA';
                      const base = getStationBasePrice(st.name, isPropia);
                      const sinIva = Number((base + grp.markup).toFixed(4));
                      const conIva = Number((sinIva * 1.21).toFixed(4));

                      return (
                        <tr key={st.name} className="hover:bg-slate-800/40">
                          <td className={`py-2 px-3 font-sans font-bold ${
                            isPropia ? 'text-blue-300' : 'text-purple-300'
                          }`}>
                            {st.name}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">
                            {sinIva.toFixed(3)} €
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-400">
                            {conIva.toFixed(3)} €
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
