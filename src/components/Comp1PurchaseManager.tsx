'use client';

import React, { useState } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, PRODUCTS, StationSeed } from '@/lib/dataSeed';
import { CalculatedPurchase, calculatePurchaseItem } from '@/lib/fuelCalculations';
import { Save, ArrowRightLeft, Sparkles, Building2, Store } from 'lucide-react';

interface Comp1Props {
  selectedDate: string;
}

export function Comp1PurchaseManager({ selectedDate }: Comp1Props) {
  const [activeGroup, setActiveGroup] = useState<'PROPIA' | 'COLABORADORA'>('PROPIA');
  
  // Estado local para los datos de compra
  const stationsList = activeGroup === 'PROPIA' ? PROPIAS_STATIONS : COLABORADORA_STATIONS;

  const [purchases, setPurchases] = useState<Record<string, { prev: number; curr: number; clh: number; porte: number; pase: number; fin: number; sale: number }>>(() => {
    const initial: Record<string, { prev: number; curr: number; clh: number; porte: number; pase: number; fin: number; sale: number }> = {};
    
    [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS].forEach((st) => {
      PRODUCTS.forEach((prod) => {
        const key = `${st.name}_${prod.code}`;
        // Valores de referencia iniciales simulados del Excel
        initial[key] = {
          prev: 1.1500,
          curr: 1.1520,
          clh: 0.0050,
          porte: 0.0080,
          pase: 0.0000,
          fin: 0.0020,
          sale: 1.1950,
        };
      });
    });
    return initial;
  });

  const [isSaved, setIsSaved] = useState(false);

  // Copia automática de la columna P a la columna O (Día anterior a referencia)
  const handleCopyPrevDay = () => {
    setPurchases((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = {
          ...next[key],
          prev: next[key].curr, // Columna P pasa a ser Columna O
        };
      });
      return next;
    });
  };

  const handleInputChange = (key: string, field: 'prev' | 'curr' | 'clh' | 'porte' | 'pase' | 'fin' | 'sale', val: string) => {
    const num = parseFloat(val) || 0;
    setPurchases((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: num,
      },
    }));
    setIsSaved(false);
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls & Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="h-4 w-4" />
              <span>Gestión de Compañero 1 - Compras de Combustible</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Ingreso Diario de Precios de Compra
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Modifica los cuadros <code className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono text-xs">N2:U21</code> (Propias) y <code className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono text-xs">N23:U58</code> (Colaboradoras).
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyPrevDay}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all active:scale-95"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>Copiar P (Actual) &rarr; O (Anterior)</span>
            </button>

            <button
              onClick={handleSave}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 ${
                isSaved
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:from-amber-400 hover:to-amber-300 shadow-amber-500/20'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{isSaved ? '¡Guardado Correctamente!' : 'Guardar Compras del Día'}</span>
            </button>
          </div>
        </div>

        {/* Group Selector Tabs */}
        <div className="flex border-b border-slate-800 mt-6 pt-2">
          <button
            onClick={() => setActiveGroup('PROPIA')}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeGroup === 'PROPIA'
                ? 'border-amber-400 text-amber-400 bg-slate-800/40 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Estaciones Propias (N2-U21) ({PROPIAS_STATIONS.length})</span>
          </button>

          <button
            onClick={() => setActiveGroup('COLABORADORA')}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeGroup === 'COLABORADORA'
                ? 'border-amber-400 text-amber-400 bg-slate-800/40 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>Estaciones Colaboradoras (N23-U58) ({COLABORADORA_STATIONS.length})</span>
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3.5 px-4 sticky left-0 bg-slate-950 z-10">Estación</th>
                <th className="py-3.5 px-3">Producto</th>
                <th className="py-3.5 px-3 bg-slate-900/60 text-slate-300">Col O: Compra Ant.</th>
                <th className="py-3.5 px-3 text-amber-400 bg-slate-900/90">Col P: Compra Hoy (€)</th>
                <th className="py-3.5 px-2">CLH (€)</th>
                <th className="py-3.5 px-2">Porte (€)</th>
                <th className="py-3.5 px-2">Pase (€)</th>
                <th className="py-3.5 px-2">Financ. (€)</th>
                <th className="py-3.5 px-3 text-emerald-400 bg-slate-900/70">Costo Total (€)</th>
                <th className="py-3.5 px-3 text-blue-400 bg-slate-900/90">Col K: P. Venta (€)</th>
                <th className="py-3.5 px-3 text-emerald-400">Margen (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              {stationsList.map((st) =>
                PRODUCTS.slice(0, 2).map((prod) => {
                  const key = `${st.name}_${prod.code}`;
                  const item = purchases[key] || { prev: 0, curr: 0, clh: 0, porte: 0, pase: 0, fin: 0, sale: 0 };
                  const calc = calculatePurchaseItem({
                    stationName: st.name,
                    productCode: prod.code,
                    previousPurchasePrice: item.prev,
                    currentPurchasePrice: item.curr,
                    clh: item.clh,
                    porte: item.porte,
                    pase: item.pase,
                    financiacion: item.fin,
                    salePriceK: item.sale,
                  });

                  return (
                    <tr key={key} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                        {st.name}
                        {st.isFixedColaboradora && (
                          <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">FIJA</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-amber-300/90 font-semibold">{prod.name}</td>

                      {/* Columna O */}
                      <td className="py-2.5 px-3 bg-slate-900/40">
                        <input
                          type="number"
                          step="0.0001"
                          value={item.prev}
                          onChange={(e) => handleInputChange(key, 'prev', e.target.value)}
                          className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-400 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Columna P (Precio del día) */}
                      <td className="py-2.5 px-3 bg-amber-500/5">
                        <input
                          type="number"
                          step="0.0001"
                          value={item.curr}
                          onChange={(e) => handleInputChange(key, 'curr', e.target.value)}
                          className="w-24 bg-slate-950 border border-amber-500/50 rounded px-2 py-1 text-amber-300 font-bold text-xs font-mono focus:border-amber-400 focus:outline-none shadow-sm"
                        />
                      </td>

                      {/* CLH */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.001"
                          value={item.clh}
                          onChange={(e) => handleInputChange(key, 'clh', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Porte */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.001"
                          value={item.porte}
                          onChange={(e) => handleInputChange(key, 'porte', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Pase */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.001"
                          value={item.pase}
                          onChange={(e) => handleInputChange(key, 'pase', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Financiación */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.001"
                          value={item.fin}
                          onChange={(e) => handleInputChange(key, 'fin', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Costo Total Calculado */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400 bg-slate-900/40">
                        {calc.totalCost.toFixed(4)} €
                      </td>

                      {/* Columna K: Precio de Venta Resultante */}
                      <td className="py-2.5 px-3 bg-blue-500/5">
                        <input
                          type="number"
                          step="0.0001"
                          value={item.sale}
                          onChange={(e) => handleInputChange(key, 'sale', e.target.value)}
                          className="w-24 bg-slate-950 border border-blue-500/50 rounded px-2 py-1 text-blue-400 font-bold text-xs font-mono focus:border-blue-400 focus:outline-none"
                        />
                      </td>

                      {/* Margen Calculado */}
                      <td className={`py-2.5 px-3 font-mono font-bold ${calc.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {calc.margin.toFixed(4)} €
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
