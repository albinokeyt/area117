'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers, Flame, Zap, Droplet, Check, Save, Sparkles,
  TrendingUp, ArrowRightLeft, Fuel, ShieldCheck, Gauge
} from 'lucide-react';

// 14 Estaciones exactas de postes de estaciones propias según el Excel
const POSTES_PROPIAS_STATIONS = [
  { name: 'ARCOS', defaultGoa: '1.599', defaultGasolina: '1.499', defaultGain: '0.114' },
  { name: 'ALCUBILLAS', defaultGoa: '1.599', defaultGasolina: '1.499', defaultGain: '0.114' },
  { name: 'ALFAJARIN', defaultGoa: '1.639', defaultGasolina: '1.499', defaultGain: '0.126' },
  { name: 'TORREMOCHA', defaultGoa: '1.639', defaultGasolina: '1.499', defaultGain: '0.100' },
  { name: 'UCLES', defaultGoa: '1.639', defaultGasolina: '1.489', defaultGain: '0.067' },
  { name: 'VALLECAS', defaultGoa: '1.579', defaultGasolina: '1.479', defaultGain: '0.075' },
  { name: 'GANESHA MADRID', defaultGoa: '1.579', defaultGasolina: '1.479', defaultGain: '0.075' },
  { name: 'TORREJON', defaultGoa: '1.579', defaultGasolina: '1.479', defaultGain: '0.065' },
  { name: 'VALDEMORO', defaultGoa: '1.489', defaultGasolina: '1.439', defaultGain: '0.022' },
  { name: 'BENAMEJI', defaultGoa: '1.639', defaultGasolina: '1.489', defaultGain: '0.077' },
  { name: 'HUMILLADERO', defaultGoa: '1.639', defaultGasolina: '1.489', defaultGain: '0.077' },
  { name: 'ES RIBA-ROJA', defaultGoa: '1.469', defaultGasolina: '1.409', defaultGain: '0.060' },
  { name: 'ES PISTA DE SILLA', defaultGoa: '1.469', defaultGasolina: '1.409', defaultGain: '0.060' },
  { name: 'ES REAL DE GANDIA', defaultGoa: '1.489', defaultGasolina: '1.419', defaultGain: '0.070' },
];

export function PostesManager() {
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

  // Estado de Postes de Estaciones Propias (Almacenado en string para soportar coma y punto)
  const [postes, setPostes] = useState<Record<string, { goa: string; gasolina: string; gasolinaGain: string }>>(() => {
    const init: Record<string, { goa: string; gasolina: string; gasolinaGain: string }> = {};
    POSTES_PROPIAS_STATIONS.forEach((st) => {
      init[st.name] = {
        goa: st.defaultGoa,
        gasolina: st.defaultGasolina,
        gasolinaGain: st.defaultGain,
      };
    });
    return init;
  });

  // Estado HVO General y Estaciones Individuales
  const [hvoGeneralSinIva, setHvoGeneralSinIva] = useState('1.5280');
  const [hvoUltimaCompra, setHvoUltimaCompra] = useState('1.2850');
  const [hvoAlfajarinSinIva, setHvoAlfajarinSinIva] = useState('1.2560');
  const [hvoValdemoroSinIva, setHvoValdemoroSinIva] = useState('1.3470');

  // Estado Gasóleo B (3 Estaciones: UCLES, TORREMOCHA, ARCOS)
  const [gasoleoBRows, setGasoleoBRows] = useState<Record<string, { compra: string; transfer: string; gob: string }>>({
    'UCLES': { compra: '1.0045', transfer: '1.0240', gob: '1.2886' },
    'TORREMOCHA': { compra: '1.0045', transfer: '1.0240', gob: '1.2886' },
    'ARCOS': { compra: '1.0045', transfer: '1.0240', gob: '1.2886' },
  });

  // Estado AdBlue (10 Estaciones del Excel)
  const [adblueRows, setAdblueRows] = useState<Record<string, { compra: string; poste: string }>>({
    'TORREJON': { compra: '0.5360', poste: '0.8490' },
    'ARCOS JALON': { compra: '0.2650', poste: '0.7490' },
    'ALFAJARIN': { compra: '0.4000', poste: '0.8490' },
    'TORREMOCHA': { compra: '0.2650', poste: '0.7490' },
    'MADRID': { compra: '0.5360', poste: '0.8490' },
    'VALLECAS': { compra: '0.6190', poste: '0.8490' },
    'HUMILLADERO': { compra: '0.5770', poste: '0.7900' },
    'UCLES': { compra: '0.3000', poste: '0.7990' },
    'BENAMEJI': { compra: '0.5360', poste: '0.7990' },
    'SORIA ALCUBILLAS': { compra: '0.2550', poste: '0.8490' },
  });

  // Estado Gases y Energías Alternativas (GLP, GNC, GNL)
  const [gasesRows, setGasesRows] = useState<Record<string, { sinIva: string; poste: string }>>({
    'GLP / Autogás': { sinIva: '0.7850', poste: '0.9490' },
    'GNC (Gas Natural Comprimido)': { sinIva: '0.9500', poste: '1.1490' },
    'GNL (Gas Natural Licuado)': { sinIva: '0.8900', poste: '1.0790' },
  });

  // Registro de claves modificadas hoy (para pintarlas en amarillo)
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);

  // Cargar datos previos de localStorage si existen
  useEffect(() => {
    try {
      const saved = localStorage.getItem('efi_postes_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.postes) setPostes(parsed.postes);
        if (parsed.hvoGeneral) setHvoGeneralSinIva(parsed.hvoGeneral);
        if (parsed.hvoAlfajarin) setHvoAlfajarinSinIva(parsed.hvoAlfajarin);
        if (parsed.hvoValdemoro) setHvoValdemoroSinIva(parsed.hvoValdemoro);
        if (parsed.gasoleoB) setGasoleoBRows(parsed.gasoleoB);
        if (parsed.adblue) setAdblueRows(parsed.adblue);
        if (parsed.gases) setGasesRows(parsed.gases);
        if (parsed.modified) setModifiedKeys(new Set(parsed.modified));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handlePosteChange = (stName: string, field: 'goa' | 'gasolina' | 'gasolinaGain', val: string) => {
    setPostes((prev) => ({
      ...prev,
      [stName]: {
        ...prev[stName],
        [field]: val,
      },
    }));

    setModifiedKeys((prev) => {
      const next = new Set(prev);
      next.add(`poste_${stName}_${field}`);
      return next;
    });
    setIsSaved(false);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(
        'efi_postes_data',
        JSON.stringify({
          postes,
          hvoGeneral: hvoGeneralSinIva,
          hvoAlfajarin: hvoAlfajarinSinIva,
          hvoValdemoro: hvoValdemoroSinIva,
          gasoleoB: gasoleoBRows,
          adblue: adblueRows,
          gases: gasesRows,
          modified: Array.from(modifiedKeys),
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {}
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  return (
    <div className="space-y-8">
      {/* Banner Principal */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Layers className="h-4 w-4" />
              <span>Gestión de Postes Públicos & Productos Especiales</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Precios en Postes de Estaciones Propias
            </h2>
            <p className="text-slate-400 text-sm">
              Acepta punto (<code className="text-amber-300 font-bold">.</code>) o coma (<code className="text-amber-300 font-bold">,</code>). Resalta en <strong>amarillo</strong> cualquier precio actualizado hoy.
            </p>
          </div>

          <button
            onClick={handleSave}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 ${
              isSaved
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:from-amber-400 hover:to-amber-300 shadow-amber-500/20'
            }`}
          >
            {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            <span>{isSaved ? '¡Postes Guardados!' : 'Guardar Precios de Postes'}</span>
          </button>
        </div>
      </div>

      {/* 1. Tabla Postes Estaciones Propias (14 Estaciones) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Postes de Estaciones Propias</h3>
              <p className="text-xs text-slate-400">Precios visibles al público en los surtidores de las 14 estaciones principales</p>
            </div>
          </div>
          <span className="text-xs text-amber-400/90 font-mono bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 font-bold">
            Fórmula Automática: GOA Premium = GOA + 0.04€
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3.5 px-5 sticky left-0 bg-slate-950 z-10">Estación</th>
                <th className="py-3.5 px-4 text-amber-300">Gasóleo A (€/L)</th>
                <th className="py-3.5 px-4 text-amber-400 bg-amber-500/5">GOA Premium (GOA + 0.04€)</th>
                <th className="py-3.5 px-4 text-blue-300">Gasolina 95 (€/L)</th>
                <th className="py-3.5 px-4 text-emerald-400">Margen / Ganancia Gasolina (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              {POSTES_PROPIAS_STATIONS.map((st) => {
                const item = postes[st.name] || { goa: st.defaultGoa, gasolina: st.defaultGasolina, gasolinaGain: st.defaultGain };
                const goaNum = parseNum(item.goa);
                const premiumPrice = Number((goaNum + 0.04).toFixed(3));

                const isGoaMod = modifiedKeys.has(`poste_${st.name}_goa`);
                const isGasMod = modifiedKeys.has(`poste_${st.name}_gasolina`);
                const isGainMod = modifiedKeys.has(`poste_${st.name}_gasolinaGain`);

                return (
                  <tr key={st.name} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-5 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                      {st.name}
                    </td>
                    
                    {/* Gasóleo A */}
                    <td className={`py-3 px-4 transition-all ${isGoaMod ? 'bg-amber-400/20' : ''}`}>
                      <div className="relative inline-flex items-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.goa}
                          onChange={(e) => handlePosteChange(st.name, 'goa', e.target.value)}
                          className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                            isGoaMod
                              ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30'
                              : 'bg-slate-950 border border-slate-700 text-slate-200 focus:border-amber-400'
                          }`}
                        />
                        {isGoaMod && (
                          <span className="ml-2 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            HOY
                          </span>
                        )}
                      </div>
                    </td>

                    {/* GOA Premium (Auto-calculado) */}
                    <td className="py-3 px-4 bg-amber-500/5 font-mono font-bold text-amber-300 text-sm">
                      {premiumPrice.toFixed(3)} €
                    </td>

                    {/* Gasolina 95 */}
                    <td className={`py-3 px-4 transition-all ${isGasMod ? 'bg-amber-400/20' : ''}`}>
                      <div className="relative inline-flex items-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.gasolina}
                          onChange={(e) => handlePosteChange(st.name, 'gasolina', e.target.value)}
                          className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                            isGasMod
                              ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30'
                              : 'bg-slate-950 border border-slate-700 text-slate-200 focus:border-amber-400'
                          }`}
                        />
                        {isGasMod && (
                          <span className="ml-2 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            HOY
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ganancia Gasolina */}
                    <td className={`py-3 px-4 transition-all ${isGainMod ? 'bg-amber-400/20' : ''}`}>
                      <div className="relative inline-flex items-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.gasolinaGain}
                          onChange={(e) => handlePosteChange(st.name, 'gasolinaGain', e.target.value)}
                          className={`w-24 rounded-lg px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                            isGainMod
                              ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md'
                              : 'bg-slate-950 border border-emerald-500/40 text-emerald-400 focus:border-emerald-400'
                          }`}
                        />
                        {isGainMod && (
                          <span className="ml-2 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            HOY
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Sección HVO (Hidrobiodiésel) con Estaciones Específicas */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">HVO (Hidrobiodiésel 100% Renovable)</h3>
              <p className="text-xs text-slate-400">Precios generales de poste y asignaciones específicas por estación</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">IVA: 21% Automático</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* HVO General */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">HVO Poste General</span>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Precio Sin IVA (€/L):</label>
              <input
                type="text"
                inputMode="decimal"
                value={hvoGeneralSinIva}
                onChange={(e) => {
                  setHvoGeneralSinIva(e.target.value);
                  setModifiedKeys((prev) => new Set(prev).add('hvo_general'));
                  setIsSaved(false);
                }}
                className={`w-full rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none ${
                  modifiedKeys.has('hvo_general')
                    ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border border-slate-700'
                }`}
              />
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Precio Con IVA (21%):</span>
              <span className="font-bold text-emerald-400 text-sm">
                {formatNum(parseNum(hvoGeneralSinIva) * 1.21)} €/L
              </span>
            </div>
          </div>

          {/* HVO ALFAJARIN */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">HVO ALFAJARIN</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">Específica</span>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Precio Sin IVA (€/L):</label>
              <input
                type="text"
                inputMode="decimal"
                value={hvoAlfajarinSinIva}
                onChange={(e) => {
                  setHvoAlfajarinSinIva(e.target.value);
                  setModifiedKeys((prev) => new Set(prev).add('hvo_alfajarin'));
                  setIsSaved(false);
                }}
                className={`w-full rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none ${
                  modifiedKeys.has('hvo_alfajarin')
                    ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border border-slate-700'
                }`}
              />
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Precio Con IVA (21%):</span>
              <span className="font-bold text-emerald-400 text-sm">
                {formatNum(parseNum(hvoAlfajarinSinIva) * 1.21)} €/L
              </span>
            </div>
          </div>

          {/* HVO VALDEMORO */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">HVO VALDEMORO</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">Específica</span>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Precio Sin IVA (€/L):</label>
              <input
                type="text"
                inputMode="decimal"
                value={hvoValdemoroSinIva}
                onChange={(e) => {
                  setHvoValdemoroSinIva(e.target.value);
                  setModifiedKeys((prev) => new Set(prev).add('hvo_valdemoro'));
                  setIsSaved(false);
                }}
                className={`w-full rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none ${
                  modifiedKeys.has('hvo_valdemoro')
                    ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border border-slate-700'
                }`}
              />
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Precio Con IVA (21%):</span>
              <span className="font-bold text-emerald-400 text-sm">
                {formatNum(parseNum(hvoValdemoroSinIva) * 1.21)} €/L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sección Gasóleo B (3 Estaciones Asignadas: UCLES, TORREMOCHA, ARCOS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Gasóleo B (Agrícola y Calefacción)</h3>
              <p className="text-xs text-slate-400">Precios asignados a las 3 estaciones con suministro de Gasóleo B</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">3 Estaciones Clave</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3 px-4">Estación</th>
                <th className="py-3 px-4 text-amber-300">Precio Compra Sin IVA (€)</th>
                <th className="py-3 px-4 text-blue-300">Precio Transfer Red (€)</th>
                <th className="py-3 px-4 text-emerald-400">Precio Con IVA 21% (€)</th>
                <th className="py-3 px-4 text-rose-300">Precio GOB Final (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {['UCLES', 'TORREMOCHA', 'ARCOS'].map((stName) => {
                const item = gasoleoBRows[stName] || { compra: '1.0045', transfer: '1.0240', gob: '1.2886' };
                const transferNum = parseNum(item.transfer);
                const conIva = Number((transferNum * 1.21).toFixed(4));
                const isMod = modifiedKeys.has(`gasb_${stName}`);

                return (
                  <tr key={stName} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{stName}</td>
                    
                    {/* Compra */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.compra}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGasoleoBRows((prev) => ({
                            ...prev,
                            [stName]: { ...prev[stName], compra: val },
                          }));
                          setModifiedKeys((prev) => new Set(prev).add(`gasb_${stName}`));
                          setIsSaved(false);
                        }}
                        className={`w-28 rounded px-2 py-1 text-xs font-mono font-bold ${
                          isMod ? 'bg-amber-400/25 border border-amber-400 text-amber-200' : 'bg-slate-950 border border-slate-700 text-slate-200'
                        }`}
                      />
                    </td>

                    {/* Transfer */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.transfer}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGasoleoBRows((prev) => ({
                            ...prev,
                            [stName]: { ...prev[stName], transfer: val },
                          }));
                          setModifiedKeys((prev) => new Set(prev).add(`gasb_${stName}`));
                          setIsSaved(false);
                        }}
                        className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-blue-300 font-bold"
                      />
                    </td>

                    {/* Con IVA */}
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                      {conIva.toFixed(4)} €
                    </td>

                    {/* GOB Final */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.gob}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGasoleoBRows((prev) => ({
                            ...prev,
                            [stName]: { ...prev[stName], gob: val },
                          }));
                          setModifiedKeys((prev) => new Set(prev).add(`gasb_${stName}`));
                          setIsSaved(false);
                        }}
                        className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-rose-300 font-bold"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Sección AdBlue (10 Estaciones del Excel) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Droplet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AdBlue (10 Estaciones Habilitadas)</h3>
              <p className="text-xs text-slate-400">Precios de adquisición, cálculo con IVA y precios en surtidor/poste</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">10 Estaciones Clave</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(adblueRows).map(([stName, data]) => {
            const compraNum = parseNum(data.compra);
            const conIva = Number((compraNum * 1.21).toFixed(4));
            const isMod = modifiedKeys.has(`adblue_${stName}`);

            return (
              <div key={stName} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs truncate">{stName}</span>
                  {isMod && (
                    <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded">
                      HOY
                    </span>
                  )}
                </div>
                
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Compra Sin IVA (€):</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={data.compra}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdblueRows((prev) => ({
                        ...prev,
                        [stName]: { ...prev[stName], compra: val },
                      }));
                      setModifiedKeys((prev) => new Set(prev).add(`adblue_${stName}`));
                      setIsSaved(false);
                    }}
                    className={`w-full rounded px-2 py-1 text-xs font-mono font-bold ${
                      isMod ? 'bg-amber-400/25 border border-amber-400 text-amber-200' : 'bg-slate-900 border border-slate-700 text-slate-200'
                    }`}
                  />
                </div>

                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Con IVA 21%:</span>
                  <span className="text-emerald-400 font-bold">{conIva.toFixed(4)} €</span>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Poste / Venta (€):</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={data.poste}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdblueRows((prev) => ({
                        ...prev,
                        [stName]: { ...prev[stName], poste: val },
                      }));
                      setModifiedKeys((prev) => new Set(prev).add(`adblue_${stName}`));
                      setIsSaved(false);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-cyan-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Nueva Sección: Gases & Energías Alternativas (GLP / GNC / GNL) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Fuel className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Gases & Energías Alternativas (GLP, GNC, GNL)</h3>
              <p className="text-xs text-slate-400">Precios sin IVA y cálculo con IVA para combustibles a gas y nuevas tecnologías</p>
            </div>
          </div>
          <span className="text-xs text-teal-400 font-mono font-bold bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
            Módulo de Gases Activo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.entries(gasesRows).map(([gasName, data]) => {
            const sinIvaNum = parseNum(data.sinIva);
            const conIva = Number((sinIvaNum * 1.21).toFixed(4));
            const isMod = modifiedKeys.has(`gas_${gasName}`);

            return (
              <div key={gasName} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{gasName}</span>
                  {isMod && (
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded">
                      HOY
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 block">Precio Adquisición Sin IVA (€):</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={data.sinIva}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGasesRows((prev) => ({
                        ...prev,
                        [gasName]: { ...prev[gasName], sinIva: val },
                      }));
                      setModifiedKeys((prev) => new Set(prev).add(`gas_${gasName}`));
                      setIsSaved(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none ${
                      isMod
                        ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border border-slate-700'
                    }`}
                  />
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Precio Con IVA (21%):</span>
                  <span className="font-bold text-emerald-400 text-sm">{conIva.toFixed(4)} €</span>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-xs text-slate-400 block">Precio Poste / Surtidor (€):</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={data.poste}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGasesRows((prev) => ({
                        ...prev,
                        [gasName]: { ...prev[gasName], poste: val },
                      }));
                      setModifiedKeys((prev) => new Set(prev).add(`gas_${gasName}`));
                      setIsSaved(false);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-teal-300 font-mono font-bold text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
