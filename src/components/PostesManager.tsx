'use client';

import React, { useState } from 'react';
import { PROPIAS_STATIONS } from '@/lib/dataSeed';
import { Layers, Flame, Zap, Droplet, Check } from 'lucide-react';

export function PostesManager() {
  const [postes, setPostes] = useState<Record<string, { goa: number; gasolina: number; gasolinaGain: number }>>(() => {
    const init: Record<string, { goa: number; gasolina: number; gasolinaGain: number }> = {};
    PROPIAS_STATIONS.forEach((st) => {
      init[st.name] = {
        goa: 1.259,
        gasolina: 1.399,
        gasolinaGain: 0.140,
      };
    });
    return init;
  });

  const [hvoPrice, setHvoPrice] = useState(1.320);
  const [gasoleoBPrice, setGasoleoBPrice] = useState(0.980);
  const [adBluePrice, setAdBluePrice] = useState(0.450);

  const handlePosteChange = (stName: string, field: 'goa' | 'gasolina' | 'gasolinaGain', val: string) => {
    const num = parseFloat(val) || 0;
    setPostes((prev) => ({
      ...prev,
      [stName]: {
        ...prev[stName],
        [field]: num,
      },
    }));
  };

  return (
    <div className="space-y-8">
      
      {/* Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Layers className="h-4 w-4" />
          <span>Postes de Estaciones Propias & Productos Especiales</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Gestión de Postes (Visualización Pública)
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Precios de cara al público en postes de estaciones propias (`B2:F30`), HVO (`B37:F40`), Gasóleo B (`B43:F47`) y AdBlue (`H62:K73`).
        </p>
      </div>

      {/* Grid Table Postes B2:F30 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Layers className="h-5 w-5 text-amber-400" />
            <span>Postes Estaciones Propias (`B2:F30`)</span>
          </h3>
          <span className="text-xs text-amber-400/90 font-mono bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
            Fórmula Automática: GOA Premium = GOA + 0.04€
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3.5 px-4">Col B: Estación</th>
                <th className="py-3.5 px-3">Col D: GOA (€)</th>
                <th className="py-3.5 px-3 text-amber-400 bg-amber-500/5">Col E: GOA Premium (GOA + 0.04€)</th>
                <th className="py-3.5 px-3">Col D: Gasolina 95 (€)</th>
                <th className="py-3.5 px-3 text-emerald-400">Col F: Ganancia Gasolina (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              {PROPIAS_STATIONS.map((st) => {
                const item = postes[st.name] || { goa: 0, gasolina: 0, gasolinaGain: 0 };
                const goaPremium = Number((item.goa + 0.04).toFixed(3));

                return (
                  <tr key={st.name} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-white border-r border-slate-800">{st.name}</td>
                    
                    {/* GOA */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        step="0.001"
                        value={item.goa}
                        onChange={(e) => handlePosteChange(st.name, 'goa', e.target.value)}
                        className="w-24 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-bold font-mono text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </td>

                    {/* GOA Premium (Calculado Automáticamente) */}
                    <td className="py-3 px-3 bg-amber-500/5 font-mono font-bold text-amber-300">
                      {goaPremium.toFixed(3)} €
                    </td>

                    {/* Gasolina */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        step="0.001"
                        value={item.gasolina}
                        onChange={(e) => handlePosteChange(st.name, 'gasolina', e.target.value)}
                        className="w-24 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-bold font-mono text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </td>

                    {/* Ganancia Gasolina */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        step="0.001"
                        value={item.gasolinaGain}
                        onChange={(e) => handlePosteChange(st.name, 'gasolinaGain', e.target.value)}
                        className="w-24 bg-slate-950 border border-emerald-500/40 rounded px-2.5 py-1 text-emerald-400 font-bold font-mono text-xs focus:border-emerald-400 focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Special Fuel Cards: HVO, Gasoleo B, AdBlue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* HVO B37:F40 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">HVO (`B37:F40`)</h3>
              <p className="text-xs text-slate-400">Precios de compra y poste clientes</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Precio HVO (€/L):</label>
            <input
              type="number"
              step="0.001"
              value={hvoPrice}
              onChange={(e) => setHvoPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-bold font-mono text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Gasoleo B B43:F47 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Gasóleo B (`B43:F47`)</h3>
              <p className="text-xs text-slate-400">Precio agrícola y calefacción</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Precio Gasóleo B (€/L):</label>
            <input
              type="number"
              step="0.001"
              value={gasoleoBPrice}
              onChange={(e) => setGasoleoBPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-rose-300 font-bold font-mono text-sm focus:border-rose-400 focus:outline-none"
            />
          </div>
        </div>

        {/* AdBlue H62:K73 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Droplet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AdBlue (`H62:K73`)</h3>
              <p className="text-xs text-slate-400">Precios tarjetas y surtidor</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Precio AdBlue (€/L):</label>
            <input
              type="number"
              step="0.001"
              value={adBluePrice}
              onChange={(e) => setAdBluePrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-blue-300 font-bold font-mono text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
