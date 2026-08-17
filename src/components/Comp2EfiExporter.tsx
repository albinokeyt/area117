'use client';

import React, { useState } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, PRODUCTS } from '@/lib/dataSeed';
import { Download, CheckCircle2, FileSpreadsheet, Send, MessageSquare, Copy, Check, Calculator, Fuel } from 'lucide-react';

interface Comp2Props {
  selectedDate: string;
}

export function Comp2EfiExporter({ selectedDate }: Comp2Props) {
  const [fixedStationPrices, setFixedStationPrices] = useState<Record<string, number>>({
    'Z.FRANCA': 1.1850,
    'BENAVENTE': 1.1790,
    'IRUN ZAISA III': 1.1920,
    'AVILESINA': 1.1880,
    'MERIDA': 1.1820,
    'SANCTI-SPIRITUS': 1.1760,
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

  const handleExportEfi = () => {
    // Generar archivo CSV para importar directamente a EFI DATA OIL (Hoja IMPORTACION)
    const headers = ['CODIGO_ESTACION', 'NOMBRE_ESTACION', 'PRODUCTO', 'PRECIO_SIN_IVA', 'PRECIO_CON_IVA', 'FECHA'];
    const rows: string[] = [headers.join(';')];

    PROPIAS_STATIONS.forEach((st) => {
      PRODUCTS.slice(0, 2).forEach((prod) => {
        const pSinIva = 1.1950;
        const pConIva = Number((pSinIva * 1.21).toFixed(4));
        rows.push(`${st.name};${st.name};${prod.code};${pSinIva};${pConIva};${selectedDate}`);
      });
    });

    Object.entries(fixedStationPrices).forEach(([stName, price]) => {
      const pConIva = Number((price * 1.21).toFixed(4));
      rows.push(`${stName};${stName};GOA;${price};${pConIva};${selectedDate}`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `IMPORTACION_EFI_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExported(true);
    setTimeout(() => setIsExported(false), 4000);
  };

  const whatsappMessage = `⛽ *ACTUALIZACIÓN DE PRECIOS - EFI DATA OIL* ⛽
📅 Fecha: ${selectedDate}

Estimado equipo, los precios del día han sido actualizados en EFI DATA OIL:

🔹 *Estaciones Propias:* Precios de compra y postes cargados.
🔹 *NIEVES (H44/H45):* ${nievesIncVat.toFixed(4)} € (Con IVA) -> *${nievesExclVat.toFixed(4)} € (Sin IVA)*
🔹 *PETROMIRALLES (H30):* ${petromirallesIncVat.toFixed(4)} € (Con IVA) -> *${petromirallesExclVat.toFixed(4)} € (Sin IVA)*
🔹 *VALCARCE:* ${valcarceDirectPrice.toFixed(4)} €
🔹 *Colaboradoras Fijas (Columna J):* 13 estaciones sincronizadas.

✅ Archivo IMPORTACION generado con éxito.`;

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>Gestión de Compañeros 2 y 3 - Validación & EFI</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Exportación e Integración EFI DATA OIL
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Revisa los precios finales de la Columna K (<code className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono text-xs">H2:L21</code> y <code className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono text-xs">H23:L58</code>), proveedores con fórmulas y genera el archivo <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-mono text-xs">IMPORTACION</code>.
            </p>
          </div>

          <button
            onClick={handleExportEfi}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold shadow-xl transition-all active:scale-95 ${
              isExported
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-400 hover:to-indigo-400 shadow-blue-500/25'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>{isExported ? '¡Archivo CSV Generado!' : 'Generar & Exportar a EFI DATA OIL'}</span>
          </button>
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

      {/* Fixed Colaboradoras Section (Z.FRANCA, BENAVENTE, IRUN ZAISA III, etc.) */}
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-3 flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
          <span>Vista Previa de Estructura de Exportación (`IMPORTACION`)</span>
        </h3>
        
        <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-emerald-400 border border-slate-800/80 overflow-x-auto space-y-1">
          <div className="text-slate-500 border-b border-slate-800 pb-2">
            CODIGO_ESTACION ; NOMBRE_ESTACION ; PRODUCTO ; PRECIO_SIN_IVA ; PRECIO_CON_IVA ; FECHA
          </div>
          <div>ARCOS ; ARCOS ; GOA ; 1.1950 ; 1.4460 ; {selectedDate}</div>
          <div>ALCUBILLAS ; ALCUBILLAS ; GOA ; 1.1950 ; 1.4460 ; {selectedDate}</div>
          <div>Z.FRANCA ; Z.FRANCA ; GOA ; {fixedStationPrices['Z.FRANCA'].toFixed(4)} ; {(fixedStationPrices['Z.FRANCA'] * 1.21).toFixed(4)} ; {selectedDate}</div>
          <div>BENAVENTE ; BENAVENTE ; GOA ; {fixedStationPrices['BENAVENTE'].toFixed(4)} ; {(fixedStationPrices['BENAVENTE'] * 1.21).toFixed(4)} ; {selectedDate}</div>
          <div className="text-slate-600 italic">... +{PROPIAS_STATIONS.length + COLABORADORA_STATIONS.length - 4} filas de estaciones listas para EFI ...</div>
        </div>
      </div>

    </div>
  );
}
