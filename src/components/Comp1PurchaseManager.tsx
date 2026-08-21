'use client';

import React, { useState, useEffect } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS } from '@/lib/dataSeed';
import {
  Save, ArrowRightLeft, Sparkles, Building2, Store, FileText,
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, X, Check, Eye, ShieldCheck, Droplet
} from 'lucide-react';

interface Comp1Props {
  selectedDate: string;
}

// 13 Colaboradoras Fijas (Columna J) para resaltar en color anaranjado
const FIXED_ORANGE_STATIONS = [
  'Z.FRANCA',
  'BENAVENTE',
  'IRUN ZAISA III',
  'AVILESINA',
  'MERIDA',
  'SANCTI-SPIRITUS',
  'SAN VICENTE DEL PALACIO',
  'WATERY ARANDA',
  'PUERTO DE BARCELONA',
  'FEGOBLAN PONTEVEDRA',
  'VEGA DE VALCARCE',
  'HOILA TOLEDO',
  'PETREM FIGUERES',
  'FIGUERES',
];

// Estaciones específicas con AdBlue según el recuadro del Excel (Celdas H62:K73)
const ADBLUE_STATIONS_CONFIG: Record<string, { defaultBuy: number; defaultSale: number }> = {
  'TORREJON': { defaultBuy: 0.5360, defaultSale: 0.8490 },
  'ARCOS JALON': { defaultBuy: 0.2650, defaultSale: 0.7490 },
  'ALFAJARIN': { defaultBuy: 0.4000, defaultSale: 0.8490 },
  'TORREMOCHA': { defaultBuy: 0.2650, defaultSale: 0.7490 },
  'MADRID': { defaultBuy: 0.5360, defaultSale: 0.8490 },
  'VALLECAS': { defaultBuy: 0.6190, defaultSale: 0.8490 },
  'HUMILLADERO': { defaultBuy: 0.5770, defaultSale: 0.7900 },
  'UCLES': { defaultBuy: 0.3000, defaultSale: 0.7990 },
  'BENAMEJI': { defaultBuy: 0.5360, defaultSale: 0.7990 },
  'SORIA ALCUBILLAS': { defaultBuy: 0.2550, defaultSale: 0.8490 },
};

interface PurchaseRowValues {
  prev: string;
  curr: string;
  clh: string;
  porte: string;
  pase: string;
  fin: string;
  sale: string;
}

export function Comp1PurchaseManager({ selectedDate }: Comp1Props) {
  // 19 estaciones Propias y 34 estaciones Colaboradoras completas del Excel
  const propiasStations = PROPIAS_STATIONS;
  const colaboradorasStations = COLABORADORA_STATIONS;

  // Helper para convertir cualquier texto con coma o punto a número válido
  const parseNum = (val: string | number | undefined): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = val.toString().replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Helper para formatear número en string
  const formatNum = (num: number, decimals: number = 4): string => {
    return num.toFixed(decimals);
  };

  // Obtener la lista de productos correspondiente a una estación
  const getProductsForStation = (stationName: string) => {
    const products = [
      { code: 'GOA', name: 'Gasóleo A (GOA)' },
      { code: 'GASOLINA', name: 'Gasolina 95' },
    ];
    if (ADBLUE_STATIONS_CONFIG[stationName]) {
      products.push({ code: 'ADBLUE', name: 'AdBlue' });
    }
    return products;
  };

  // Estado local para los datos de compra (almacenados como texto para aceptar coma y punto libremente)
  const [purchases, setPurchases] = useState<Record<string, PurchaseRowValues>>(() => {
    const initial: Record<string, PurchaseRowValues> = {};
    
    [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS].forEach((st) => {
      // GOA
      initial[`${st.name}_GOA`] = {
        prev: '1.1500',
        curr: '1.1550',
        clh: '0.0050',
        porte: '0.0080',
        pase: '0.0000',
        fin: '0.0020',
        sale: '1.1950',
      };

      // GASOLINA
      initial[`${st.name}_GASOLINA`] = {
        prev: '1.2800',
        curr: '1.2850',
        clh: '0.0050',
        porte: '0.0080',
        pase: '0.0000',
        fin: '0.0020',
        sale: '1.3450',
      };

      // ADBLUE (Solo para las estaciones del recuadro H62:K73)
      if (ADBLUE_STATIONS_CONFIG[st.name]) {
        const adblueData = ADBLUE_STATIONS_CONFIG[st.name];
        initial[`${st.name}_ADBLUE`] = {
          prev: formatNum(adblueData.defaultBuy),
          curr: formatNum(adblueData.defaultBuy),
          clh: '0.0000',
          porte: '0.0000',
          pase: '0.0000',
          fin: '0.0000',
          sale: formatNum(adblueData.defaultSale),
        };
      }
    });
    return initial;
  });

  // Registro de claves modificadas hoy (para pintarlas en amarillo)
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Cargar datos previos si existen en localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`efi_purchases_${selectedDate}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) {
          setPurchases(parsed.data);
        }
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

  // Manejar cambio en los inputs (soporta tanto coma ',' como punto '.')
  const handleInputChange = (
    stationName: string,
    prodCode: string,
    field: keyof PurchaseRowValues,
    val: string
  ) => {
    const key = `${stationName}_${prodCode}`;

    setPurchases((prev) => {
      const updated = { ...prev };
      const currentItem = updated[key] || {
        prev: '0',
        curr: '0',
        clh: '0',
        porte: '0',
        pase: '0',
        fin: '0',
        sale: '0',
      };

      updated[key] = {
        ...currentItem,
        [field]: val,
      };

      return updated;
    });

    // Marcar como modificado hoy para pintar en amarillo
    setModifiedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    setIsSaved(false);
  };

  // Guardar compras del día
  const handleSave = () => {
    try {
      localStorage.setItem(
        `efi_purchases_${selectedDate}`,
        JSON.stringify({
          date: selectedDate,
          data: purchases,
          modified: Array.from(modifiedKeys),
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {}
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  // Calcular métricas de comparativa para el informe
  const allComparisons = [...propiasStations, ...colaboradorasStations].flatMap((st) => {
    const prods = getProductsForStation(st.name);
    return prods.map((prod) => {
      const key = `${st.name}_${prod.code}`;
      const item = purchases[key] || { prev: '0', curr: '0', clh: '0', porte: '0', pase: '0', fin: '0', sale: '0' };
      const prevNum = parseNum(item.prev);
      const currNum = parseNum(item.curr);
      const diff = currNum - prevNum;
      const pct = prevNum > 0 ? (diff / prevNum) * 100 : 0;
      const isModified = modifiedKeys.has(key);
      return {
        station: st.name,
        type: st.type,
        product: prod.name,
        prev: prevNum,
        curr: currNum,
        diff,
        pct,
        isModified,
      };
    });
  });

  const priceIncreases = allComparisons.filter((c) => c.diff > 0.0001);
  const priceDecreases = allComparisons.filter((c) => c.diff < -0.0001);
  const priceUnchanged = allComparisons.filter((c) => Math.abs(c.diff) <= 0.0001);

  // Renderizar tabla de un bloque de estaciones
  const renderStationTable = (
    title: string,
    subtitle: string,
    icon: React.ElementType,
    stations: typeof propiasStations,
    isCollaboratorBlock: boolean = false
  ) => {
    const Icon = icon;
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isCollaboratorBlock
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
                <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  {stations.length} Estaciones
                </span>
              </div>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center space-x-1.5 bg-amber-400/15 text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full font-bold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Amarillo = Modificado Hoy</span>
            </span>

            {isCollaboratorBlock && (
              <span className="flex items-center space-x-1.5 bg-orange-500/20 text-orange-300 border border-orange-500/40 px-3 py-1 rounded-full font-bold shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Naranja = Colaboradoras Fijas (13 Clave)</span>
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3.5 px-4 sticky left-0 bg-slate-950 z-20">Estación</th>
                <th className="py-3.5 px-3">Producto</th>
                <th className="py-3.5 px-3 bg-slate-900/70 text-slate-300">Precio Anterior (€)</th>
                <th className="py-3.5 px-3 text-amber-300 bg-slate-900">
                  Precio Compra Hoy (€) <span className="text-[10px] text-slate-500 font-normal">(. o ,)</span>
                </th>
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
                const isFixedOrange = FIXED_ORANGE_STATIONS.some((name) =>
                  st.name.toUpperCase().includes(name.toUpperCase())
                );
                const stationProds = getProductsForStation(st.name);

                return stationProds.map((prod, pIdx) => {
                  const key = `${st.name}_${prod.code}`;
                  const item = purchases[key] || {
                    prev: '0',
                    curr: '0',
                    clh: '0',
                    porte: '0',
                    pase: '0',
                    fin: '0',
                    sale: '0',
                  };

                  const currNum = parseNum(item.curr);
                  const clhNum = parseNum(item.clh);
                  const porteNum = parseNum(item.porte);
                  const paseNum = parseNum(item.pase);
                  const finNum = parseNum(item.fin);
                  const saleNum = parseNum(item.sale);

                  const totalCost = Number((currNum + clhNum + porteNum + paseNum + finNum).toFixed(4));
                  const margin = Number((saleNum - totalCost).toFixed(4));
                  const isModifiedToday = modifiedKeys.has(key);

                  // Estilos para colaboradoras fijas anaranjadas
                  const rowBgClass = isFixedOrange
                    ? 'bg-orange-950/20 hover:bg-orange-950/30'
                    : 'hover:bg-slate-800/40';

                  const stationCellBgClass = isFixedOrange
                    ? 'bg-orange-950/40 border-l-4 border-l-orange-500 text-orange-200'
                    : 'bg-slate-900 text-white';

                  return (
                    <tr
                      key={key}
                      className={`transition-colors ${rowBgClass} ${
                        pIdx === stationProds.length - 1 ? 'border-b-2 border-slate-800/80' : ''
                      }`}
                    >
                      {/* Nombre de la estación (agrupado visualmente y coloreado en anaranjado si es fija) */}
                      <td
                        className={`py-2.5 px-4 font-bold sticky left-0 z-10 border-r border-slate-800 transition-colors ${stationCellBgClass}`}
                      >
                        {pIdx === 0 ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <span className="font-extrabold tracking-tight">{st.name}</span>
                            {isFixedOrange && (
                              <span className="text-[9px] bg-orange-500/25 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded-full font-black tracking-wider uppercase inline-flex items-center space-x-1 shadow-sm">
                                <ShieldCheck className="h-3 w-3 text-orange-400" />
                                <span>FIJA EFI</span>
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
                          className={`px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center space-x-1 ${
                            prod.code === 'GOA'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                              : prod.code === 'GASOLINA'
                              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold'
                          }`}
                        >
                          {prod.code === 'ADBLUE' && <Droplet className="h-3 w-3 text-cyan-400" />}
                          <span>{prod.name}</span>
                        </span>
                      </td>

                      {/* Precio Anterior (Automático o editable con . o ,) */}
                      <td className="py-2.5 px-3 bg-slate-900/40">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.prev}
                          onChange={(e) =>
                            handleInputChange(st.name, prod.code, 'prev', e.target.value)
                          }
                          className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-400 text-xs font-mono focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Precio Compra Hoy (Resaltado en AMARILLO brillante si es editado) */}
                      <td
                        className={`py-2.5 px-3 transition-all ${
                          isModifiedToday ? 'bg-amber-400/25' : 'bg-slate-900/30'
                        }`}
                      >
                        <div className="relative inline-flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.curr}
                            onChange={(e) =>
                              handleInputChange(st.name, prod.code, 'curr', e.target.value)
                            }
                            placeholder="0,0000"
                            className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-black transition-all focus:outline-none ${
                              isModifiedToday
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40'
                                : 'bg-slate-950 border border-slate-700 text-slate-200 focus:border-amber-400'
                            }`}
                          />
                          {isModifiedToday && (
                            <span className="ml-2 text-[9px] bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-black px-2 py-0.5 rounded shadow tracking-tighter uppercase animate-in fade-in">
                              HOY
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CLH */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          inputMode="decimal"
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
                          type="text"
                          inputMode="decimal"
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
                          type="text"
                          inputMode="decimal"
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
                          type="text"
                          inputMode="decimal"
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
                          type="text"
                          inputMode="decimal"
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
              Gestión de <strong>Gasóleo A</strong>, <strong>Gasolina 95</strong> y <strong>AdBlue</strong> (en las 10 estaciones habilitadas). Acepta punto (<code className="text-amber-300 font-bold">.</code>) o coma (<code className="text-amber-300 font-bold">,</code>).
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

      {/* Bloque 1: Estaciones Propias (19 Estaciones) */}
      {renderStationTable(
        'Estaciones Propias',
        'Precios de compra y costes de las 19 estaciones propias',
        Building2,
        propiasStations,
        false
      )}

      {/* Bloque 2: Estaciones Colaboradoras (34 Estaciones con 13 Fijas en Anaranjado) */}
      {renderStationTable(
        'Estaciones Colaboradoras',
        'Precios acordados y costes de red de las 34 estaciones colaboradoras',
        Store,
        colaboradorasStations,
        true
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
                    Fecha: <span className="text-amber-300 font-mono">{selectedDate}</span> &bull; Análisis de Variación Día Anterior vs Hoy ({allComparisons.length} Registros)
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
