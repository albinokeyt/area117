'use client';

import React, { useState } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS } from '@/lib/dataSeed';
import {
  FileSpreadsheet, Download, Filter, Search, Table, Sparkles, Building2, Store, Check
} from 'lucide-react';

interface SabanaProps {
  selectedDate: string;
}

// Tarifas Estándar (Columnas B a T en el Excel)
const STANDARD_TARIFFS = [
  { id: '12', name: '12', colTitle: '12 SIN IVA', markup: 0.120 },
  { id: '18', name: '18', colTitle: '18 SIN IVA', markup: 0.126 },
  { id: '24', name: '24', colTitle: '24 SIN IVA', markup: 0.132 },
  { id: '36', name: '36', colTitle: '36 SIN IVA', markup: 0.144 },
  { id: '40', name: '40', colTitle: '40 SIN IVA', markup: 0.148 },
  { id: '42', name: '42', colTitle: '42 SIN IVA', markup: 0.150 },
  { id: '47', name: '47', colTitle: '47 SIN IVA', markup: 0.155 },
  { id: '50', name: '50 (60)', colTitle: '50 (60) SIN IVA', markup: 0.160 },
  { id: '60', name: '60 (80)', colTitle: '60 (80) SIN IVA', markup: 0.170 },
];

// Estructura Exacta de Tarifas Especiales del Excel (Columnas V a BF)
interface SpecialTariffGroupDef {
  id: string;
  title: string;
  description: string;
  columnsRange: string;
  tariffs: { name: string; markup: number }[];
  borderTheme: string;
  badgeTheme: string;
}

const SPECIAL_TARIFF_BLOCKS: SpecialTariffGroupDef[] = [
  {
    id: 'los_javi',
    title: 'Tarifa Especial Los Javi & Carreras',
    description: 'Tarifas preferenciales asignadas para flotas Los Javi y Carreras',
    columnsRange: 'Cols V:AA',
    tariffs: [
      { name: 'Especial Javi', markup: 0.116 },
      { name: 'Especial Carreras', markup: 0.116 },
    ],
    borderTheme: 'border-blue-500/30',
    badgeTheme: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  {
    id: 'transfrired_benito',
    title: 'Tarifa Especial Transfrired & Benito',
    description: 'Tarifas especiales para grupos de transporte Transfrired y Benito',
    columnsRange: 'Cols AC:AH',
    tariffs: [
      { name: 'Especial Transfrired', markup: 0.116 },
      { name: 'Especial Benito', markup: 0.120 },
    ],
    borderTheme: 'border-indigo-500/30',
    badgeTheme: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  {
    id: 'c0_general',
    title: 'Tarifa C-0 (Especial General)',
    description: 'Tarifa matriz general de convenio C-0 para transporte de carga',
    columnsRange: 'Cols AI:AK',
    tariffs: [
      { name: 'Especial General C-0', markup: 0.116 },
    ],
    borderTheme: 'border-emerald-500/30',
    badgeTheme: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'ror_esteban',
    title: 'Tarifa Especial ROR & Esteban',
    description: 'Tarifas especiales para transporte internacional ROR y flota Esteban',
    columnsRange: 'Cols AM:AQ',
    tariffs: [
      { name: 'Especial ROR', markup: 0.132 },
      { name: 'Especial Esteban', markup: 0.132 },
    ],
    borderTheme: 'border-cyan-500/30',
    badgeTheme: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'miki_ecotrans',
    title: 'Tarifa 90 Miki & ECOTRANS',
    description: 'Tarifas corporativas ECOTRANS y flota 90 Miki',
    columnsRange: 'Cols AS:AW',
    tariffs: [
      { name: 'Tarifa 90 Miki', markup: 0.198 },
      { name: 'Tarifa ECOTRANS', markup: 0.158 },
    ],
    borderTheme: 'border-amber-500/30',
    badgeTheme: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'tarifa_30_sur',
    title: 'Tarifa 30 & Tarifas Sur (Benito)',
    description: 'Tarifas con descuento de red y convenios específicos zona Sur',
    columnsRange: 'Cols AY:BF',
    tariffs: [
      { name: 'Tarifa 30', markup: 0.138 },
      { name: 'Tarifa 27 Sur', markup: 0.127 },
      { name: 'Tarifa 15 Sur', markup: 0.115 },
    ],
    borderTheme: 'border-purple-500/30',
    badgeTheme: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
];

export function SabanaPreciosManager({ selectedDate }: SabanaProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PROPIA' | 'COLABORADORA'>('ALL');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

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

  const triggerDownload = (fileName: string, csvContent: string) => {
    // Añadimos UTF-8 BOM (\uFEFF) para que Excel abra acentos y formatos automáticamente sin problemas
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    setDownloadToast(fileName);
    setTimeout(() => setDownloadToast(null), 3500);
  };

  // Descarga de la tabla de Tarifas Estándar con el formato EXACTO del Excel (media_1787840120442.png)
  const handleExportStandardCsv = () => {
    // Fila 1: Cabecera idéntica a la imagen del usuario
    let csv = 'EESS DE SERVICIO;';
    STANDARD_TARIFFS.forEach((t) => {
      csv += `${t.colTitle};CON IVA;`;
    });
    csv += '\n';

    // Bloque 1: Estaciones Propias (19 EESS)
    PROPIAS_STATIONS.forEach((st) => {
      const base = getStationBasePrice(st.name, true);
      csv += `${st.name};`;
      STANDARD_TARIFFS.forEach((t) => {
        const sinIva = Number((base + t.markup).toFixed(3));
        const conIva = Number((sinIva * 1.21).toFixed(3));
        csv += `${sinIva.toFixed(3).replace('.', ',')};${conIva.toFixed(3).replace('.', ',')};`;
      });
      csv += '\n';
    });

    // Fila Divisora: COLABORADORAS con 0,000
    csv += 'COLABORADORAS;';
    STANDARD_TARIFFS.forEach(() => {
      csv += '0,000;0,000;';
    });
    csv += '\n';

    // Bloque 2: Estaciones Colaboradoras (34 EESS)
    COLABORADORA_STATIONS.forEach((st) => {
      const base = getStationBasePrice(st.name, false);
      csv += `${st.name};`;
      STANDARD_TARIFFS.forEach((t) => {
        const sinIva = Number((base + t.markup).toFixed(3));
        const conIva = Number((sinIva * 1.21).toFixed(3));
        csv += `${sinIva.toFixed(3).replace('.', ',')};${conIva.toFixed(3).replace('.', ',')};`;
      });
      csv += '\n';
    });

    triggerDownload(`SABANA_TARIFAS_12_60_${selectedDate}.csv`, csv);
  };

  // Descarga de un bloque de Tarifa Especial individual
  const handleExportSpecialBlockCsv = (block: SpecialTariffGroupDef) => {
    let csv = `EESS DE SERVICIO;`;
    block.tariffs.forEach((t) => {
      csv += `${t.name.toUpperCase()} SIN IVA;CON IVA;`;
    });
    csv += '\n';

    // Propias
    PROPIAS_STATIONS.forEach((st) => {
      const base = getStationBasePrice(st.name, true);
      csv += `${st.name};`;
      block.tariffs.forEach((t) => {
        const sinIva = Number((base + t.markup).toFixed(3));
        const conIva = Number((sinIva * 1.21).toFixed(3));
        csv += `${sinIva.toFixed(3).replace('.', ',')};${conIva.toFixed(3).replace('.', ',')};`;
      });
      csv += '\n';
    });

    // Separador
    csv += 'COLABORADORAS;';
    block.tariffs.forEach(() => {
      csv += '0,000;0,000;';
    });
    csv += '\n';

    // Colaboradoras
    COLABORADORA_STATIONS.forEach((st) => {
      const base = getStationBasePrice(st.name, false);
      csv += `${st.name};`;
      block.tariffs.forEach((t) => {
        const sinIva = Number((base + t.markup).toFixed(3));
        const conIva = Number((sinIva * 1.21).toFixed(3));
        csv += `${sinIva.toFixed(3).replace('.', ',')};${conIva.toFixed(3).replace('.', ',')};`;
      });
      csv += '\n';
    });

    const cleanName = block.title.replace(/\s+/g, '_').toUpperCase();
    triggerDownload(`${cleanName}_${selectedDate}.csv`, csv);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Sábana de Precios — Estructura Completa del Excel</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sábana General de Precios y Tarifas
            </h2>
            <p className="text-slate-400 text-sm">
              Columna de estaciones identificada con <strong className="text-blue-400">Azul para Propias</strong> y <strong className="text-purple-400">Morado para Colaboradoras</strong>. Cada recuadro cuenta con su botón de descarga individual en formato exacto Excel.
            </p>
          </div>

          <button
            onClick={handleExportStandardCsv}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:from-amber-400 hover:to-amber-300 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>Descargar Sábana Estándar (Excel)</span>
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

      {/* BLOQUE 1: RECUADRO SUPERIOR — TARIFAS ESTÁNDAR (12 A 60) CON BOTÓN DE DESCARGA */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Table className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">Tarifas Estándar (Tarifas 12 a 60)</h3>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold border border-slate-700">
                  Cols B:T
                </span>
              </div>
              <p className="text-xs text-slate-400">Precios sin IVA y con IVA (+21%) con formato idéntico al Excel oficial</p>
            </div>
          </div>

          <button
            onClick={handleExportStandardCsv}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all active:scale-95"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Descargar Este Recuadro (Excel)</span>
          </button>
        </div>

        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-30 bg-slate-950">
              {/* Header Row 1: Tarifas Groups */}
              <tr className="border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 sticky left-0 bg-slate-950 z-40 border-r border-slate-800" rowSpan={2}>
                  EESS DE SERVICIO
                </th>
                {STANDARD_TARIFFS.map((tariff) => (
                  <th
                    key={tariff.id}
                    colSpan={2}
                    className="py-2.5 px-3 text-center border-r border-slate-800 bg-slate-900/90 text-amber-300 font-extrabold"
                  >
                    TARIFA {tariff.name}
                  </th>
                ))}
              </tr>

              {/* Header Row 2: Sin IVA / Con IVA */}
              <tr className="border-b-2 border-slate-700 text-slate-400 font-semibold text-[10px] uppercase">
                {STANDARD_TARIFFS.map((tariff) => (
                  <React.Fragment key={`${tariff.id}_sub`}>
                    <th className="py-2 px-2.5 text-right bg-slate-950 text-slate-300">{tariff.colTitle}</th>
                    <th className="py-2 px-2.5 text-right bg-slate-950/80 text-emerald-400 border-r border-slate-800">
                      CON IVA
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

                    {/* Columnas de Precios */}
                    {STANDARD_TARIFFS.map((tariff) => {
                      const sinIva = Number((base + tariff.markup).toFixed(3));
                      const conIva = Number((sinIva * 1.21).toFixed(3));

                      return (
                        <React.Fragment key={`${st.name}_${tariff.id}`}>
                          <td className="py-2.5 px-2.5 text-right text-slate-300 bg-slate-900/10">
                            {sinIva.toFixed(3).replace('.', ',')}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-bold text-emerald-400 bg-emerald-500/5 border-r border-slate-800/80">
                            {conIva.toFixed(3).replace('.', ',')}
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

      {/* BLOQUE 2: RECUADROS INFERIORES — TARIFAS ESPECIALES SEPARADAS CON DESCARGA INDIVIDUAL */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-white">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <h3 className="text-xl font-extrabold tracking-tight">Tarifas Especiales por Convenio y Cliente (Excel Cols V a BF)</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SPECIAL_TARIFF_BLOCKS.map((block) => (
            <div
              key={block.id}
              className={`bg-slate-900 border ${block.borderTheme} rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between`}
            >
              <div>
                {/* Header with Title and Individual Download Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-extrabold text-white text-base">{block.title}</h4>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${block.badgeTheme}`}>
                        {block.columnsRange}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{block.description}</p>
                  </div>

                  <button
                    onClick={() => handleExportSpecialBlockCsv(block)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shadow transition-all active:scale-95 shrink-0"
                    title={`Descargar ${block.title} en formato Excel`}
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Descargar Excel</span>
                  </button>
                </div>

                {/* Table for this Special Tariff */}
                <div className="overflow-x-auto max-h-64 mt-4">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-950 z-10">
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2.5 px-3" rowSpan={2}>EESS DE SERVICIO</th>
                        {block.tariffs.map((t, idx) => (
                          <th key={idx} colSpan={2} className="py-1 px-2 text-center text-amber-300 font-bold border-l border-slate-800">
                            {t.name}
                          </th>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-800 text-slate-500 text-[9px] uppercase font-semibold">
                        {block.tariffs.map((t, idx) => (
                          <React.Fragment key={idx}>
                            <th className="py-1 px-2 text-right border-l border-slate-800 text-slate-400">Sin IVA</th>
                            <th className="py-1 px-2 text-right text-emerald-400">Con IVA</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredStations.map((st) => {
                        const isPropia = st.type === 'PROPIA';
                        const base = getStationBasePrice(st.name, isPropia);

                        return (
                          <tr key={st.name} className="hover:bg-slate-800/40">
                            <td className={`py-2 px-3 font-sans font-bold ${
                              isPropia ? 'text-blue-300' : 'text-purple-300'
                            }`}>
                              {st.name}
                            </td>
                            {block.tariffs.map((t, idx) => {
                              const sinIva = Number((base + t.markup).toFixed(3));
                              const conIva = Number((sinIva * 1.21).toFixed(3));

                              return (
                                <React.Fragment key={idx}>
                                  <td className="py-2 px-2 text-right text-slate-300 border-l border-slate-800/50">
                                    {sinIva.toFixed(3).replace('.', ',')}
                                  </td>
                                  <td className="py-2 px-2 text-right font-bold text-emerald-400">
                                    {conIva.toFixed(3).replace('.', ',')}
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
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Toast */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5">
          <Check className="h-5 w-5" />
          <span>Archivo descargado correctamente: {downloadToast}</span>
        </div>
      )}
    </div>
  );
}
