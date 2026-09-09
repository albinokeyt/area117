'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, PRODUCTS } from '@/lib/dataSeed';
import {
  Download, CheckCircle2, FileSpreadsheet, Send, MessageSquare,
  Copy, Check, Calculator, Fuel, Calendar, FileDown, Layers
} from 'lucide-react';
import {
  downloadImportacionXlsx,
  downloadImportacionCsv,
  buildImportacionTable
} from '@/lib/excelExportService';

interface Comp2Props {
  selectedDate: string;
}

export function Comp2EfiExporter({ selectedDate }: Comp2Props) {
  const [validFromDate, setValidFromDate] = useState<string>(() => {
    try {
      return localStorage.getItem('efi_compras_valid_from') || selectedDate || '2026-09-05';
    } catch (e) {
      return selectedDate;
    }
  });
  const [finalDate, setFinalDate] = useState<string>('2026-09-20');

  const [fixedStationPrices, setFixedStationPrices] = useState<Record<string, number>>({
    'BENAVENTE': 1.1790,
    'IRUN ZAISA III': 1.1920,
    'AVILESINA': 1.1880,
    'MERIDA': 1.1820,
    'SAN VICENTE DEL PALACIO': 1.1810,
    'WATERY ARANDA': 1.1890,
    'PUERTO DE BARCELONA': 1.1940,
    'FEGOBLAN PONTEVEDRA': 1.1870,
    'VEGA DE VALCARCE': 1.1910,
    'HOILA TOLEDO': 1.1830,
    'PETREM FIGUERES': 1.1950,
  });

  // Precios especiales de proveedores con desglose de IVA (Nieves / 1.21, Petromiralles / 1.21, Valcarce)
  const [nievesIncVat, setNievesIncVat] = useState<number>(1.4390); // H44, H45
  const [petromirallesIncVat, setPetromirallesIncVat] = useState<number>(1.4420); // H30
  const [valcarceDirectPrice, setValcarceDirectPrice] = useState<number>(1.1890); // H35, H36, H40...

  const [isExported, setIsExported] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const nievesExclVat = Number((nievesIncVat / 1.21).toFixed(4));
  const petromirallesExclVat = Number((petromirallesIncVat / 1.21).toFixed(4));

  const handlePriceChange = (stationName: string, val: string) => {
    const num = parseFloat(val) || 0;
    setFixedStationPrices((prev) => ({
      ...prev,
      [stationName]: num,
    }));
  };

  const handleExportXlsx = () => {
    downloadImportacionXlsx(selectedDate, validFromDate, finalDate);
    setIsExported(true);
    setTimeout(() => setIsExported(false), 4000);
  };

  const handleExportCsv = () => {
    downloadImportacionCsv(selectedDate, validFromDate, finalDate);
    setIsExported(true);
    setTimeout(() => setIsExported(false), 4000);
  };

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener('efi_compras_updated', handleUpdate);
    window.addEventListener('efi_sabana_updated', handleUpdate);
    window.addEventListener('efi_postes_updated', handleUpdate);
    window.addEventListener('efi_valid_date_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('efi_compras_updated', handleUpdate);
      window.removeEventListener('efi_sabana_updated', handleUpdate);
      window.removeEventListener('efi_postes_updated', handleUpdate);
      window.removeEventListener('efi_valid_date_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const previewRows = useMemo(() => {
    return buildImportacionTable(selectedDate, validFromDate, finalDate);
  }, [selectedDate, validFromDate, finalDate, refreshTrigger]);

  const whatsappMessage = `⛽ *ACTUALIZACIÓN DE PRECIOS - EFI DATA OIL* ⛽
📅 Fecha: ${selectedDate}

Estimado equipo, los precios del día han sido actualizados en EFI DATA OIL:

🔹 *Estaciones Propias:* Precios de compra y postes cargados.
🔹 *NIEVES (H44/H45):* ${nievesIncVat.toFixed(4)} € (Con IVA) -> *${nievesExclVat.toFixed(4)} € (Sin IVA)*
🔹 *PETROMIRALLES (H30):* ${petromirallesIncVat.toFixed(4)} € (Con IVA) -> *${petromirallesExclVat.toFixed(4)} € (Sin IVA)*
🔹 *VALCARCE:* ${valcarceDirectPrice.toFixed(4)} €
🔹 *Colaboradoras Fijas (Columna J):* 13 estaciones sincronizadas.

✅ Archivo IMPORTACION (1.204 filas, 22 bloques) generado con éxito.`;

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4" />
              <span>Gestión de Compañeros 2 y 3 - Validación & EFI</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Exportación e Integración EFI DATA OIL (Hoja IMPORTACION)
            </h2>
            <p className="text-slate-400 text-sm">
              Genera el archivo <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-mono text-xs">IMPORTACION</code> con los precios finales Con IVA de Sábana de Precios (Producto 1), Gasolina Bronco (Producto 2) y Gasóleo B Transfrired (Producto 5).
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="bg-slate-800/80 text-amber-300 font-mono px-2.5 py-1 rounded-lg border border-slate-700">
                1.204 Filas Totales
              </span>
              <span className="bg-slate-800/80 text-blue-300 font-mono px-2.5 py-1 rounded-lg border border-slate-700">
                22 Bloques de Tarifas
              </span>
              <span className="bg-slate-800/80 text-emerald-300 font-mono px-2.5 py-1 rounded-lg border border-slate-700">
                56 Estaciones Sincronizadas
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleExportXlsx}
              className={`flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold shadow-xl transition-all active:scale-95 ${
                isExported
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{isExported ? '¡Excel IMPORTACION Generado!' : 'Descargar Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all active:scale-95"
            >
              <FileDown className="h-4 w-4 text-amber-400" />
              <span>Descargar CSV</span>
            </button>
          </div>
        </div>

        {/* Date Selector Row */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span>Fecha Inicial (Columna INICIAL):</span>
            </label>
            <input
              type="text"
              value={validFromDate}
              onChange={(e) => setValidFromDate(e.target.value)}
              placeholder="DD/MM/YYYY o YYYY-MM-DD"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>Fecha Final (Columna FINAL):</span>
            </label>
            <input
              type="text"
              value={finalDate}
              onChange={(e) => setFinalDate(e.target.value)}
              placeholder="DD/MM/YYYY o YYYY-MM-DD"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Proveedores Especiales (Valcarce, Nieves / 1.21, Petromiralles / 1.21) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-base border-b border-slate-800 pb-3">
          <Calculator className="h-5 w-5" />
          <span>Proveedores con Fórmulas de Desglose de IVA (Celdas H30, H44, H45, Valcarce)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* NIEVES (H44, H45) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">NIEVES (H44, H45)</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono">Fórmula ÷ 1.21</span>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Precio Recibido (Con IVA):</label>
              <input
                type="number"
                step="0.0001"
                value={nievesIncVat}
                onChange={(e) => setNievesIncVat(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Sin IVA resultante:</span>
              <span className="font-mono font-bold text-emerald-400">{nievesExclVat.toFixed(4)} €</span>
            </div>
          </div>

          {/* PETROMIRALLES (H30) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">PETROMIRALLES (H30)</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono">Fórmula ÷ 1.21</span>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Precio Recibido (Con IVA):</label>
              <input
                type="number"
                step="0.0001"
                value={petromirallesIncVat}
                onChange={(e) => setPetromirallesIncVat(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Sin IVA resultante:</span>
              <span className="font-mono font-bold text-emerald-400">{petromirallesExclVat.toFixed(4)} €</span>
            </div>
          </div>

          {/* VALCARCE */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">VALCARCE (H35, H36, H40...)</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">Neto Directo</span>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Precio Neto Recibido (€):</label>
              <input
                type="number"
                step="0.0001"
                value={valcarceDirectPrice}
                onChange={(e) => setValcarceDirectPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Con IVA (21%):</span>
              <span className="font-mono font-bold text-emerald-400">{(valcarceDirectPrice * 1.21).toFixed(4)} €</span>
            </div>
          </div>

        </div>
      </div>

      {/* Fixed Colaboradoras Section (BENAVENTE, IRUN ZAISA III, etc.) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-amber-300 flex items-center space-x-2">
            <Send className="h-5 w-5 text-amber-400" />
            <span>Estaciones Colaboradoras Fijas (Columna J - Hoja Cálculo Inicial)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">13 Estaciones Clave</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(fixedStationPrices).map(([stName, price]) => (
            <div key={stName} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 shadow-inner hover:border-slate-700 transition-colors">
              <div className="text-xs font-bold text-slate-300 truncate mb-1.5">{stName}</div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-mono">GOA:</span>
                <input
                  type="number"
                  step="0.0001"
                  value={price}
                  onChange={(e) => handlePriceChange(stName, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-amber-300 font-bold font-mono text-xs focus:border-amber-400 focus:outline-none"
                />
                <span className="text-xs text-slate-400 font-mono">€</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generador de Notificación para Grupos de WhatsApp */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            <span>Notificación Automática para Grupos de WhatsApp</span>
          </h3>
          <button
            onClick={handleCopyWhatsApp}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            {copiedWhatsApp ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copiedWhatsApp ? '¡Texto Copiado!' : 'Copiar Mensaje'}</span>
          </button>
        </div>
        <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 border border-slate-800/80 whitespace-pre-wrap">
          {whatsappMessage}
        </pre>
      </div>

      {/* Summary Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Vista Previa de Estructura de Exportación (`IMPORTACION` - 9 Columnas Oficiales)</span>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
            {previewRows.length} Filas en el Documento Final
          </span>
        </div>

        <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">Col A</th>
                <th className="py-2.5 px-3">ESTACION (ID)</th>
                <th className="py-2.5 px-3 text-center">PRODUCTO</th>
                <th className="py-2.5 px-3 text-center">INICIAL</th>
                <th className="py-2.5 px-3 text-center">FINAL</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">PVP (Con IVA)</th>
                <th className="py-2.5 px-3">ESTACION (NOMBRE)</th>
                <th className="py-2.5 px-3 text-center">PAGO</th>
                <th className="py-2.5 px-3 text-amber-300">TARIFA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs bg-slate-950/70">
              {previewRows.slice(1, 45).map((row, idx) => {
                const isEmpty = row.every((c) => c === null || c === undefined || c === '');
                if (isEmpty) {
                  return (
                    <tr key={idx} className="bg-slate-900/40">
                      <td colSpan={9} className="py-1 text-center text-[10px] text-slate-600 font-sans italic">
                        --- Separador de Bloque Vacío ---
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-1.5 px-3 text-center font-bold text-slate-500">{row[0]}</td>
                    <td className="py-1.5 px-3 text-white font-bold">{row[1]}</td>
                    <td className="py-1.5 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row[2] === 1 ? 'bg-blue-500/20 text-blue-300' :
                        row[2] === 2 ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {row[2] === 1 ? '1 (GOA)' : row[2] === 2 ? '2 (GAS)' : '5 (GOB)'}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-center text-slate-400">{row[3]}</td>
                    <td className="py-1.5 px-3 text-center text-slate-400">{row[4]}</td>
                    <td className="py-1.5 px-3 text-right font-bold text-emerald-400">
                      {typeof row[5] === 'number' ? row[5].toFixed(row[2] === 5 ? 5 : 3) : row[5]}
                    </td>
                    <td className="py-1.5 px-3 text-slate-200 font-sans">{row[6]}</td>
                    <td className="py-1.5 px-3 text-center text-slate-400">{row[7] || '-'}</td>
                    <td className="py-1.5 px-3 font-bold text-amber-300 font-sans">{row[8]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-slate-500 italic text-right">
          Mostrando las primeras filas representativas de las {previewRows.length} filas totales generadas para el archivo IMPORTACION.
        </div>
      </div>

    </div>
  );
}
