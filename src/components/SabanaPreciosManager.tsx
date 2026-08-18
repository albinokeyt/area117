'use client';

import React, { useState } from 'react';
import { TARIFFS, PROPIAS_STATIONS, COLABORADORA_STATIONS } from '@/lib/dataSeed';
import { FileText, Download, Filter, Search, Printer, Calendar, Check } from 'lucide-react';

interface SabanaProps {
  selectedDate: string;
}

export function SabanaPreciosManager({ selectedDate }: SabanaProps) {
  const [selectedTariff, setSelectedTariff] = useState('TARIFA 18');
  const [targetDate, setTargetDate] = useState(selectedDate);
  const [searchFilter, setSearchFilter] = useState('');
  const [vatToggle, setVatToggle] = useState<'BOTH' | 'CON_IVA' | 'SIN_IVA'>('BOTH');
  const [downloadedPdf, setDownloadedPdf] = useState<string | null>(null);

  const allStations = [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];
  const filteredStations = allStations.filter((st) =>
    st.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handlePrintPdf = (stName?: string) => {
    // Generar el nombre de archivo exacto solicitado: TARIFA_XX_FECHA.pdf
    const cleanTariffName = selectedTariff.replace(/\s+/g, '_').toUpperCase();
    const fileName = stName
      ? `${cleanTariffName}_${stName.replace(/\s+/g, '_')}_${targetDate}.pdf`
      : `${cleanTariffName}_${targetDate}.pdf`;

    // Cambiar título temporal del documento para la impresión / guardado como PDF del navegador
    const originalTitle = document.title;
    document.title = fileName.replace('.pdf', '');

    window.print();

    document.title = originalTitle;

    setDownloadedPdf(fileName);
    setTimeout(() => setDownloadedPdf(null), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <FileText className="h-4 w-4" />
              <span>Sábana de Precios & Emisión de PDFs</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tarifas por Estación y Envío a Clientes
            </h2>
            <p className="text-slate-400 text-sm">
              Visualiza los precios con/sin IVA de cada tarifa y descarga los PDFs con el formato y fecha exacta para enviar a los clientes.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handlePrintPdf()}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:from-amber-400 hover:to-amber-300 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Exportar PDF: {selectedTariff.toUpperCase()}_{targetDate}</span>
            </button>
          </div>
        </div>

        {/* Filters and Target Date Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">Seleccionar Tarifa:</label>
            <select
              value={selectedTariff}
              onChange={(e) => setSelectedTariff(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-amber-300 font-bold text-xs focus:border-amber-400 focus:outline-none"
            >
              {TARIFFS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5 flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span>Fecha de Aplicación / Destino:</span>
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">Buscar Estación:</label>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Filtrar por nombre..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">Formato de Impuestos:</label>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setVatToggle('BOTH')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  vatToggle === 'BOTH' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dual
              </button>
              <button
                onClick={() => setVatToggle('SIN_IVA')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  vatToggle === 'SIN_IVA' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sin IVA
              </button>
              <button
                onClick={() => setVatToggle('CON_IVA')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  vatToggle === 'CON_IVA' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Con IVA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sábana Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-white text-base">
              Matriz de Precios: <span className="text-amber-400 font-mono">{selectedTariff}</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
              Vigencia: {targetDate}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Total Estaciones: {filteredStations.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3.5 px-5 sticky left-0 bg-slate-950 z-10">Estación</th>
                <th className="py-3.5 px-3">Tipo</th>
                {(vatToggle === 'BOTH' || vatToggle === 'SIN_IVA') && (
                  <>
                    <th className="py-3.5 px-4 text-amber-300">GOA (Sin IVA)</th>
                    <th className="py-3.5 px-4 text-amber-300">Gasolina 95 (Sin IVA)</th>
                  </>
                )}
                {(vatToggle === 'BOTH' || vatToggle === 'CON_IVA') && (
                  <>
                    <th className="py-3.5 px-4 text-emerald-300">GOA (Con IVA 21%)</th>
                    <th className="py-3.5 px-4 text-emerald-300">Gasolina 95 (Con IVA 21%)</th>
                  </>
                )}
                <th className="py-3.5 px-5 text-right">PDF Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              {filteredStations.map((st) => {
                const baseGoa = 1.195;
                const baseGas = 1.350;
                const goaConIva = Number((baseGoa * 1.21).toFixed(4));
                const gasConIva = Number((baseGas * 1.21).toFixed(4));

                return (
                  <tr key={st.name} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-5 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                      {st.name}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          st.type === 'PROPIA'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {st.type}
                      </span>
                    </td>

                    {(vatToggle === 'BOTH' || vatToggle === 'SIN_IVA') && (
                      <>
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">
                          {baseGoa.toFixed(4)} €
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">
                          {baseGas.toFixed(4)} €
                        </td>
                      </>
                    )}

                    {(vatToggle === 'BOTH' || vatToggle === 'CON_IVA') && (
                      <>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {goaConIva.toFixed(4)} €
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {gasConIva.toFixed(4)} €
                        </td>
                      </>
                    )}

                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => handlePrintPdf(st.name)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-[11px] font-bold rounded-xl transition-all border border-slate-700 active:scale-95 shadow"
                        title={`Descargar ${selectedTariff}_${st.name}_${targetDate}.pdf`}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>PDF</span>
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
  );
}
