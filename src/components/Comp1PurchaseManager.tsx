'use client';

import React, { useState, useEffect } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS } from '@/lib/dataSeed';
import {
  Save, ArrowRightLeft, Sparkles, Building2, Store, FileText,
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, X, Check, Eye
} from 'lucide-react';

interface Comp1Props {
  selectedDate: string;
}

interface PurchaseRowData {
  prev: number;
  curr: number;
  clh: number;
  porte: number;
  pase: number;
  fin: number;
  sale: number;
}

export function Comp1PurchaseManager({ selectedDate }: Comp1Props) {
  // Productos a gestionar por estación
  const FUEL_PRODUCTS = [
    { code: 'GOA', name: 'Gasóleo A (GOA)', isAutoPremium: false },
    { code: 'GASOLINA', name: 'Gasolina 95', isAutoPremium: false },
    { code: 'GOA_PROFESIONAL', name: 'Gasóleo Profesional / Premium (+0.04€)', isAutoPremium: true },
  ];

  // 19 estaciones Propias y 34 estaciones Colaboradoras completas del Excel
  const propiasStations = PROPIAS_STATIONS;
  const colaboradorasStations = COLABORADORA_STATIONS;

  // Estado local para los datos de compra
  const [purchases, setPurchases] = useState<Record<string, PurchaseRowData>>(() => {
    const initial: Record<string, PurchaseRowData> = {};
    
    [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS].forEach((st) => {
      // Base GOA
      const basePrev = 1.1500;
      const baseCurr = 1.1550;

      // GOA
      initial[`${st.name}_GOA`] = {
        prev: basePrev,
        curr: baseCurr,
        clh: 0.0050,
        porte: 0.0080,
        pase: 0.0000,
        fin: 0.0020,
        sale: 1.1950,
      };

      // GASOLINA
      initial[`${st.name}_GASOLINA`] = {
        prev: 1.2800,
        curr: 1.2850,
        clh: 0.0050,
        porte: 0.0080,
        pase: 0.0000,
        fin: 0.0020,
        sale: 1.3450,
      };

      // GOA PROFESIONAL (GOA + 0.04)
      initial[`${st.name}_GOA_PROFESIONAL`] = {
        prev: Number((basePrev + 0.04).toFixed(4)),
        curr: Number((baseCurr + 0.04).toFixed(4)),
        clh: 0.0050,
        porte: 0.0080,
        pase: 0.0000,
        fin: 0.0020,
        sale: Number((1.1950 + 0.04).toFixed(4)),
      };
    });
    return initial;
  });

  // Registro de celdas modificadas hoy (para pintarlas en amarillo)
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Cargar datos previos si existen en localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`efi_purchases_${selectedDate}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPurchases(parsed.data || {});
        if (parsed.modified) {
          setModifiedKeys(new Set(parsed.modified));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [selectedDate]);

  // Sincronizar / Copiar precios de hoy a precio anterior
  const handleCopyPrevDay = () => {
    setPurchases((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = {
          ...next[key],
          prev: next[key].curr,
        };
      });
      return next;
    });
    setIsSaved(false);
  };

  // Manejar cambio en los inputs
  const handleInputChange = (
    stationName: string,
    prodCode: string,
    field: keyof PurchaseRowData,
    val: string
  ) => {
    const key = `${stationName}_${prodCode}`;
    const num = parseFloat(val) || 0;

    setPurchases((prev) => {
      const updated = { ...prev };
      const currentItem = updated[key] || {
        prev: 0,
        curr: 0,
        clh: 0,
        porte: 0,
        pase: 0,
        fin: 0,
        sale: 0,
      };

      updated[key] = {
        ...currentItem,
        [field]: num,
      };

      // Si se modifica el GOA normal, actualizar automáticamente el GOA Profesional (+0.04€)
      if (prodCode === 'GOA' && field === 'curr') {
        const profKey = `${stationName}_GOA_PROFESIONAL`;
        if (updated[profKey]) {
          updated[profKey] = {
            ...updated[profKey],
            curr: Number((num + 0.04).toFixed(4)),
            sale: Number((updated[key].sale + 0.04).toFixed(4)),
          };
        }
      }

      return updated;
    });

    // Marcar como modificado hoy para pintar en amarillo
    setModifiedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      if (prodCode === 'GOA') {
        next.add(`${stationName}_GOA_PROFESIONAL`);
      }
      return next;
    });

    setIsSaved(false);
  };

  // Guardar compras del día
  const handleSave = () => {
    localStorage.setItem(
      `efi_purchases_${selectedDate}`,
      JSON.stringify({
        date: selectedDate,
        data: purchases,
        modified: Array.from(modifiedKeys),
        updatedAt: new Date().toISOString(),
      })
    );
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  // Calcular métricas de comparativa para el informe
  const allComparisons = [...propiasStations, ...colaboradorasStations].flatMap((st) =>
    FUEL_PRODUCTS.map((prod) => {
      const key = `${st.name}_${prod.code}`;
      const item = purchases[key] || { prev: 0, curr: 0, clh: 0, porte: 0, pase: 0, fin: 0, sale: 0 };
      const diff = item.curr - item.prev;
      const pct = item.prev > 0 ? (diff / item.prev) * 100 : 0;
      const isModified = modifiedKeys.has(key);
      return {
        station: st.name,
        type: st.type,
        product: prod.name,
        prev: item.prev,
        curr: item.curr,
        diff,
        pct,
        isModified,
      };
    })
  );

  const priceIncreases = allComparisons.filter((c) => c.diff > 0.0001);
  const priceDecreases = allComparisons.filter((c) => c.diff < -0.0001);
  const priceUnchanged = allComparisons.filter((c) => Math.abs(c.diff) <= 0.0001);

  // Renderizar tabla de un bloque de estaciones
  const renderStationTable = (
    title: string,
    badgeText: string,
    icon: React.ElementType,
    stations: typeof propiasStations
  ) => {
    const Icon = icon;
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
              <p className="text-xs text-slate-400">{badgeText}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="flex items-center space-x-1.5 bg-amber-400/10 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Amarillo = Modificado Hoy</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3.5 px-4 sticky left-0 bg-slate-950 z-10">Estación</th>
                <th className="py-3.5 px-3">Producto</th>
                <th className="py-3.5 px-3 bg-slate-900/70 text-slate-300">Precio Compra Anterior (€)</th>
                <th className="py-3.5 px-3 text-amber-300 bg-slate-900">Precio Compra Hoy (€)</th>
                <th className="py-3.5 px-2">CLH (€)</th>
                <th className="py-3.5 px-2">Porte (€)</th>
                <th className="py-3.5 px-2">Pase (€)</th>
                <th className="py-3.5 px-2">Financ. (€)</th>
                <th className="py-3.5 px-3 text-emerald-400 bg-slate-900/60">Costo Total (€)</th>
                <th className="py-3.5 px-3 text-blue-400 bg-slate-900/80">P. Venta Sugerido (€)</th>
                <th className="py-3.5 px-3 text-emerald-400">Margen (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              {stations.map((st) => {
                return FUEL_PRODUCTS.map((prod, pIdx) => {
                  const key = `${st.name}_${prod.code}`;
                  const item = purchases[key] || {
                    prev: 0,
                    curr: 0,
                    clh: 0,
                    porte: 0,
                    pase: 0,
                    fin: 0,
                    sale: 0,
                  };

                  const totalCost = Number(
                    (item.curr + item.clh + item.porte + item.pase + item.fin).toFixed(4)
                  );
                  const margin = Number((item.sale - totalCost).toFixed(4));
                  const isModifiedToday = modifiedKeys.has(key);

                  return (
                    <tr
                      key={key}
                      className={`transition-colors hover:bg-slate-800/40 ${
                        pIdx === FUEL_PRODUCTS.length - 1 ? 'border-b-2 border-slate-800/80' : ''
                      }`}
                    >
                      {/* Nombre de la estación (agrupado visualmente) */}
                      <td className="py-2.5 px-4 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                        {pIdx === 0 ? (
                          <div className="flex items-center space-x-2">
                            <span>{st.name}</span>
                            {st.isFixedColaboradora && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                                FIJA
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[10px] pl-2">&rdquor;</span>
                        )}
                      </td>

                      {/* Producto */}
                      <td className="py-2.5 px-3 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            prod.code === 'GOA'
                              ? 'bg-amber-500/10 text-amber-300'
                              : prod.code === 'GASOLINA'
                              ? 'bg-blue-500/10 text-blue-300'
                              : 'bg-emerald-500/10 text-emerald-300 italic'
                          }`}
                        >
                          {prod.name}
                        </span>
                      </td>

                      {/* Precio Anterior (Automático) */}
                      <td className="py-2.5 px-3 bg-slate-900/40">
                        <input
                          type="number"
                          step="0.0001"
                          value={item.prev}
                          onChange={(e) =>
                            handleInputChange(st.name, prod.code, 'prev', e.target.value)
                          }
                          className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-400 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Precio Compra Hoy (Resaltado en Amarillo si es editado) */}
                      <td
                        className={`py-2.5 px-3 transition-all ${
                          isModifiedToday ? 'bg-amber-400/15' : 'bg-slate-900/30'
                        }`}
                      >
                        <div className="relative inline-flex items-center">
                          <input
                            type="number"
                            step="0.0001"
                            disabled={prod.isAutoPremium}
                            value={item.curr}
                            onChange={(e) =>
                              handleInputChange(st.name, prod.code, 'curr', e.target.value)
                            }
                            className={`w-24 rounded px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                              isModifiedToday
                                ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20'
                                : prod.isAutoPremium
                                ? 'bg-slate-950/70 border border-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-950 border border-slate-700 text-slate-200 focus:border-amber-400'
                            }`}
                          />
                          {isModifiedToday && (
                            <span className="ml-2 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded tracking-tighter shadow">
                              HOY
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CLH */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.001"
                          value={item.clh}
                          onChange={(e) =>
                            handleInputChange(st.name, prod.code, 'clh', e.target.value)
                          }
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Porte */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.001"
                          value={item.porte}
                          onChange={(e) =>
                            handleInputChange(st.name, prod.code, 'porte', e.target.value)
                          }
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Pase */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.001"
                          value={item.pase}
                          onChange={(e) =>
                            handleInputChange(st.name, prod.code, 'pase', e.target.value)
                          }
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Financiación */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.001"
                          value={item.fin}
                          onChange={(e) =>
                            handleInputChange(st.name, prod.code, 'fin', e.target.value)
                          }
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Costo Total */}
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 bg-slate-900/40">
                        {totalCost.toFixed(4)} €
                      </td>

                      {/* Precio de Venta Sugerido */}
                      <td className="py-2.5 px-3 bg-blue-500/5">
                        <input
                          type="number"
                          step="0.0001"
                          value={item.sale}
                          onChange={(e) =>
                            handleInputChange(st.name, prod.code, 'sale', e.target.value)
                          }
                          className="w-24 bg-slate-950 border border-blue-500/50 rounded px-2 py-1 text-blue-400 font-bold text-xs font-mono focus:border-blue-400 focus:outline-none"
                        />
                      </td>

                      {/* Margen */}
                      <td
                        className={`py-2.5 px-3 font-mono font-bold ${
                          margin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {margin.toFixed(4)} €
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Banner Principal */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>Gestión de Compras — Compañero 1</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ingreso Diario de Precios de Compra
            </h2>
            <p className="text-slate-400 text-sm">
              Gestión centralizada de precios de adquisición, costes logísticos y cálculo de precios de venta.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyPrevDay}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all active:scale-95"
              title="Copia los precios de hoy a la columna de referencia de ayer"
            >
              <ArrowRightLeft className="h-4 w-4 text-amber-400" />
              <span>Sincronizar Día Anterior</span>
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-bold border border-blue-500/30 shadow-md transition-all active:scale-95"
            >
              <FileText className="h-4 w-4 text-blue-400" />
              <span>Informe de Comparativa</span>
            </button>

            <button
              onClick={handleSave}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 ${
                isSaved
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:from-amber-400 hover:to-amber-300 shadow-amber-500/20'
              }`}
            >
              {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>{isSaved ? '¡Guardado Correctamente!' : 'Guardar Compras del Día'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bloque 1: Estaciones Propias */}
      {renderStationTable(
        'Estaciones Propias',
        'Precios de compra y postes de las 10 estaciones principales',
        Building2,
        propiasStations
      )}

      {/* Bloque 2: Estaciones Colaboradoras */}
      {renderStationTable(
        'Estaciones Colaboradoras',
        'Precios acordados y costes de red de estaciones colaboradoras',
        Store,
        colaboradorasStations
      )}

      {/* Modal: Informe de Comparativa de Precios */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Informe de Comparativa de Precios</h3>
                  <p className="text-xs text-slate-400">
                    Fecha: <span className="text-amber-300 font-mono">{selectedDate}</span> &bull; Análisis de Variación Día Anterior vs Hoy
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Summary Cards */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-slate-950/40 border-b border-slate-800">
              <div className="bg-slate-900 p-4 rounded-2xl border border-rose-500/20">
                <p className="text-xs text-slate-400">Subidas de Precio</p>
                <p className="text-2xl font-bold text-rose-400 font-mono mt-1">
                  {priceIncreases.length}{' '}
                  <span className="text-xs font-normal text-slate-500">productos</span>
                </p>
              </div>
              <div className="bg-slate-900 p-4 rounded-2xl border border-emerald-500/20">
                <p className="text-xs text-slate-400">Bajadas de Precio</p>
                <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                  {priceDecreases.length}{' '}
                  <span className="text-xs font-normal text-slate-500">productos</span>
                </p>
              </div>
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700">
                <p className="text-xs text-slate-400">Sin Cambios</p>
                <p className="text-2xl font-bold text-slate-300 font-mono mt-1">
                  {priceUnchanged.length}{' '}
                  <span className="text-xs font-normal text-slate-500">productos</span>
                </p>
              </div>
            </div>

            {/* Modal Table */}
            <div className="overflow-y-auto p-6 space-y-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 pb-2">
                    <th className="pb-3 px-3">Estación</th>
                    <th className="pb-3 px-3">Producto</th>
                    <th className="pb-3 px-3">Precio Anterior</th>
                    <th className="pb-3 px-3">Precio Hoy</th>
                    <th className="pb-3 px-3">Variación (€)</th>
                    <th className="pb-3 px-3">Variación (%)</th>
                    <th className="pb-3 px-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {allComparisons.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-bold text-white">{item.station}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{item.product}</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.prev.toFixed(4)} €</td>
                      <td className="py-2.5 px-3 font-bold text-white">{item.curr.toFixed(4)} €</td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          item.diff > 0
                            ? 'text-rose-400'
                            : item.diff < 0
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.diff > 0 ? '+' : ''}
                        {item.diff.toFixed(4)} €
                      </td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          item.pct > 0
                            ? 'text-rose-400'
                            : item.pct < 0
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.pct > 0 ? '+' : ''}
                        {item.pct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {item.isModified ? (
                          <span className="bg-amber-400/20 text-amber-300 font-sans text-[10px] px-2 py-0.5 rounded font-bold">
                            Modificado
                          </span>
                        ) : (
                          <span className="text-slate-500 font-sans text-[10px]">Sin cambio</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Cerrar Informe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
