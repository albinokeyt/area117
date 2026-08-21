'use client';

import React, { useState } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS } from '@/lib/dataSeed';
import {
  FileSpreadsheet, Download, Filter, Search, Printer,
  Calendar, Check, Building2, Store, Table, Eye, Layers, Sparkles
} from 'lucide-react';

interface SabanaProps {
  selectedDate: string;
}

// Lista de Tarifas de la Sábana de Precios
const SABANA_TARIFFS = [
  { id: '12', name: 'Tarifa 12', markup: 0.120 },
  { id: '18', name: 'Tarifa 18', markup: 0.126 },
  { id: '24', name: 'Tarifa 24', markup: 0.132 },
  { id: '36', name: 'Tarifa 36', markup: 0.144 },
  { id: '40', name: 'Tarifa 40', markup: 0.148 },
  { id: '42', name: 'Tarifa 42', markup: 0.150 },
  { id: '47', name: 'Tarifa 47', markup: 0.155 },
  { id: '50', name: 'Tarifa 50 (60)', markup: 0.160 },
  { id: '60', name: 'Tarifa 60 (80)', markup: 0.170 },
  { id: 'JAVI', name: 'Especial Javi', markup: 0.116 },
  { id: 'ECO', name: 'Tarifa ECO', markup: 0.110 },
  { id: 'AMAEXO', name: 'AMAEXO', markup: 0.118 },
  { id: 'NORIEGA', name: 'NORIEGA', markup: 0.122 },
  { id: 'E100', name: 'E100', markup: 0.124 },
];

export function SabanaPreciosManager({ selectedDate }: SabanaProps) {
  const [activeView, setActiveView] = useState<'matrix' | 'singlePdf'>('matrix');
  const [selectedTariff, setSelectedTariff] = useState('TARIFA 18');
  const [targetDate, setTargetDate] = useState(selectedDate);
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PROPIA' | 'COLABORADORA'>('ALL');
  const [downloadedPdf, setDownloadedPdf] = useState<string | null>(null);

  const allStations = [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];
  
  const filteredStations = allStations.filter((st) => {
    const matchesSearch = st.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = typeFilter === 'ALL' || st.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Base price for calculations
  const getStationBasePrice = (stName: string, isPropia: boolean) => {
    const hash = stName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offset = (hash % 10) * 0.002;
    return isPropia ? 1.1520 + offset : 1.1560 + offset;
  };

  const handlePrintPdf = (stName?: string) => {
    const cleanTariffName = selectedTariff.replace(/\s+/g, '_').toUpperCase();
    const fileName = stName
      ? `${cleanTariffName}_${stName.replace(/\s+/g, '_')}_${targetDate}.pdf`
      : `${cleanTariffName}_${targetDate}.pdf`;

    const originalTitle = document.title;
    document.title = fileName.replace('.pdf', '');
    window.print();
    document.title = originalTitle;

    setDownloadedPdf(fileName);
    setTimeout(() => setDownloadedPdf(null), 4000);
  };

  const handleExportCsv = () => {
    let csv = 'Tipo;Estacion;';
    SABANA_TARIFFS.forEach((t) => {
      csv += `${t.name} Sin IVA;${t.name} Con IVA;`;
    });
    csv += '\n';

    filteredStations.forEach((st) => {
      const isPropia = st.type === 'PROPIA';
      const base = getStationBasePrice(st.name, isPropia);
      csv += `${st.type};${st.name};`;
      SABANA_TARIFFS.forEach((t) => {
        const sinIva = Number((base + t.markup).toFixed(4));
        const conIva = Number((sinIva * 1.21).toFixed(4));
        csv += `${sinIva.toFixed(4).replace('.', ',')};${conIva.toFixed(4).replace('.', ',')};`;
      });
      csv += '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SABANA_DE_PRECIOS_${targetDate}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Sábana de Precios & Tarifas Diarias</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sábana Completa de Precios (Sin IVA / Con IVA)
            </h2>
            <p className="text-slate-400 text-sm">
              Estaciones <strong className="text-blue-400">Propias en Azul</strong> y <strong className="text-purple-400">Colaboradoras en Morado</strong>. Muestra todas las tarifas estándar (12 a 60) y especiales con sus precios sin IVA y con IVA (+21%).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Switcher */}
            <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center space-x-1">
              <button
                onClick={() => setActiveView('matrix')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeView === 'matrix'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table className="h-4 w-4" />
                <span>Sábana Matricial</span>
              </button>
              <button
                onClick={() => setActiveView('singlePdf')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeView === 'singlePdf'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Printer className="h-4 w-4" />
                <span>Generador de PDFs</span>
              </button>
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all active:scale-95"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Exportar Excel / CSV</span>
            </button>
          </div>
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

      {/* VISTA 1: SÁBANA MATRICIAL COMPLETA */}
      {activeView === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-30 bg-slate-950">
                {/* Header Row 1: Tarifas Groups */}
                <tr className="border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 sticky left-0 bg-slate-950 z-40 border-r border-slate-800" rowSpan={2}>
                    Estación de Servicio
                  </th>
                  {SABANA_TARIFFS.map((tariff) => (
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
                  {SABANA_TARIFFS.map((tariff) => (
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

                  // Estilos para Propias (Azul) y Colaboradoras (Morado)
                  const stationCellClass = isPropia
                    ? 'bg-blue-950/40 text-blue-200 border-l-4 border-l-blue-500 font-bold'
                    : 'bg-purple-950/40 text-purple-200 border-l-4 border-l-purple-500 font-bold';

                  const badgeClass = isPropia
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-purple-500/20 text-purple-300 border-purple-500/30';

                  return (
                    <tr key={st.name} className="hover:bg-slate-800/40 transition-colors">
                      {/* Sticky Station Column with Blue (Propias) or Purple (Colaboradoras) styling */}
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

                      {/* Tariffs Columns */}
                      {SABANA_TARIFFS.map((tariff) => {
                        const sinIva = Number((base + tariff.markup).toFixed(4));
                        const conIva = Number((sinIva * 1.21).toFixed(4));

                        return (
                          <React.Fragment key={`${st.name}_${tariff.id}`}>
                            <td className="py-2.5 px-2.5 text-right text-slate-300 bg-slate-900/20">
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
      )}

      {/* VISTA 2: GENERADOR INDIVIDUAL DE PDFS POR TARIFA */}
      {activeView === 'singlePdf' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Generador & Descargador de Tarifas Individuales en PDF</h3>
              <p className="text-xs text-slate-400">Selecciona la tarifa y genera el PDF oficial listo para enviar a clientes</p>
            </div>

            <button
              onClick={() => handlePrintPdf()}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / Guardar PDF General</span>
            </button>
          </div>

          {/* Tariff Selector Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Seleccionar Tarifa:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {SABANA_TARIFFS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTariff(t.name)}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    selectedTariff === t.name
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs block font-bold truncate">{t.name}</span>
                  <span className={`text-[10px] block mt-0.5 ${
                    selectedTariff === t.name ? 'text-slate-900 font-semibold' : 'text-slate-500'
                  }`}>
                    +{t.markup.toFixed(3)} €
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Stations Table for Selected Tariff */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-white text-xs">
                Precios de <span className="text-amber-400 font-mono">{selectedTariff}</span> para el día{' '}
                <span className="text-amber-400 font-mono">{targetDate}</span>
              </span>
              <span className="text-xs text-slate-400">
                Total: {filteredStations.length} estaciones
              </span>
            </div>

            <div className="overflow-x-auto max-h-[55vh]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-bold">
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Estación</th>
                    <th className="py-3 px-4 text-right">Precio Sin IVA (€)</th>
                    <th className="py-3 px-4 text-right text-emerald-400">Precio Con IVA 21% (€)</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredStations.map((st) => {
                    const isPropia = st.type === 'PROPIA';
                    const base = getStationBasePrice(st.name, isPropia);
                    const currentTariffObj = SABANA_TARIFFS.find((t) => t.name === selectedTariff) || SABANA_TARIFFS[0];
                    const sinIva = Number((base + currentTariffObj.markup).toFixed(4));
                    const conIva = Number((sinIva * 1.21).toFixed(4));

                    return (
                      <tr key={st.name} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-sans">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-black border ${
                              isPropia
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            }`}
                          >
                            {isPropia ? 'PROPIA' : 'COLABORADORA'}
                          </span>
                        </td>
                        <td className={`py-2.5 px-4 font-sans font-bold ${
                          isPropia ? 'text-blue-300' : 'text-purple-300'
                        }`}>
                          {st.name}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-300">
                          {sinIva.toFixed(3)} €
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                          {conIva.toFixed(3)} €
                        </td>
                        <td className="py-2.5 px-4 text-right font-sans">
                          <button
                            onClick={() => handlePrintPdf(st.name)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold border border-slate-700 transition-colors"
                          >
                            PDF Estación
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Toast */}
      {downloadedPdf && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5">
          <Check className="h-5 w-5" />
          <span>Generando documento: {downloadedPdf}</span>
        </div>
      )}
    </div>
  );
}
