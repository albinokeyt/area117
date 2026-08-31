'use client';

import React, { useState } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS } from '@/lib/dataSeed';
import {
  FileSpreadsheet, Download, Filter, Search, Table, Sparkles, Check
} from 'lucide-react';

interface SabanaProps {
  selectedDate: string;
}

// Tarifas Estándar (Columnas B a T en el Excel)
const STANDARD_TARIFFS = [
  { id: '12', name: '12', colTitle: '12 SIN IVA', markup: 0.0120 },
  { id: '18', name: '18', colTitle: '18 SIN IVA', markup: 0.0180 },
  { id: '24', name: '24', colTitle: '24 SIN IVA', markup: 0.0240 },
  { id: '36', name: '36', colTitle: '36 SIN IVA', markup: 0.0360 },
  { id: '40', name: '40', colTitle: '40 SIN IVA', markup: 0.0400 },
  { id: '42', name: '42', colTitle: '42 SIN IVA', markup: 0.0420 },
  { id: '47', name: '47', colTitle: '47 SIN IVA', markup: 0.0470 },
  { id: '50', name: '50', colTitle: '50 SIN IVA', markup: 0.0600 },
  { id: '60', name: '60', colTitle: '60 SIN IVA', markup: 0.0800 },
];

// Estructura de Tarifas Especiales Solicitadas
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
    id: 'miki_ecotrans_tarifa30',
    title: 'Tarifa 90 Miki / Milo, ECOTRANS & Tarifa 30',
    description: 'Tarifas corporativas ECOTRANS, flota 90 Miki / Milo y Tarifa 30',
    columnsRange: 'Cols AS:BA',
    tariffs: [
      { name: 'Tarifa 90 Miki', markup: 0.198 },
      { name: 'Tarifa ECOTRANS', markup: 0.158 },
      { name: 'Tarifa 30', markup: 0.138 },
    ],
    borderTheme: 'border-amber-500/30',
    badgeTheme: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'sur_benito',
    title: 'Tarifas Sur (Benito: 27 Sur & 15 Sur)',
    description: 'Convenios específicos zona Sur: Tarifa 27 Sur y Tarifa 15 Sur',
    columnsRange: 'Cols BC:BF',
    tariffs: [
      { name: 'Tarifa 27 Sur', markup: 0.127 },
      { name: 'Tarifa 15 Sur', markup: 0.115 },
    ],
    borderTheme: 'border-purple-500/30',
    badgeTheme: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
];

// Helper para identificar estaciones que deben colorearse de morado
const isPurpleHighlightedStation = (stName: string): boolean => {
  const upper = stName.toUpperCase();
  return (
    upper.includes('RIBA-ROJA') ||
    upper.includes('PISTA DE SILLA') ||
    upper.includes('REAL DE GANDIA') ||
    upper.includes('CHIVA') ||
    upper.includes('ALBERIC') ||
    upper.includes('CATARROJA') ||
    upper.includes('MANISES')
  );
};

export function SabanaPreciosManager({ selectedDate }: SabanaProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PROPIA' | 'COLABORADORA'>('ALL');
  const [comprasPurchases, setComprasPurchases] = useState<Record<string, { sale: string }>>({});

  const loadComprasData = () => {
    try {
      const savedDate = localStorage.getItem(`efi_purchases_${selectedDate}`);
      const savedGlobal = localStorage.getItem('efi_compras_data');
      if (savedDate) {
        const parsed = JSON.parse(savedDate);
        if (parsed.data) setComprasPurchases(parsed.data);
      } else if (savedGlobal) {
        const parsed = JSON.parse(savedGlobal);
        if (parsed.data) setComprasPurchases(parsed.data);
      }
    } catch (e) {}
  };

  React.useEffect(() => {
    loadComprasData();
    window.addEventListener('efi_compras_updated', loadComprasData);
    window.addEventListener('storage', loadComprasData);
    return () => {
      window.removeEventListener('efi_compras_updated', loadComprasData);
      window.removeEventListener('storage', loadComprasData);
    };
  }, [selectedDate]);

  // Obtener P. Venta Sugerido de Compras para cada estación con resolución exacta
  const getStationBasePrice = (stName: string, isPropia?: boolean): number => {
    // 1. Coincidencia directa
    let item = comprasPurchases[`${stName}_GOA`];

    // 2. Coincidencia normalizada sin prefijos 'ES '
    if (!item?.sale) {
      const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').trim();
      const matchedKey = Object.keys(comprasPurchases).find((k) => {
        if (!k.endsWith('_GOA')) return false;
        const baseK = k.replace(/_GOA$/, '').toUpperCase().replace(/^ES\s+/, '').trim();
        return baseK === cleanTarget || baseK.includes(cleanTarget) || cleanTarget.includes(baseK);
      });
      if (matchedKey) {
        item = comprasPurchases[matchedKey];
      }
    }

    if (item?.sale) {
      const val = parseFloat(item.sale.toString().replace(',', '.'));
      if (!isNaN(val) && val > 0) return val;
    }

    // 3. Fallback con Costo Total del Excel
    const costs = STATION_EXCEL_COSTS[stName] || {
      porte: 0.0050,
      pase: 0.0100,
      fin: 0.0100,
      defaultCurr: 1.2000,
    };
    return Number((costs.defaultCurr + costs.porte + costs.pase + costs.fin).toFixed(4));
  };
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const allStations = [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];
  
  const filteredStations = allStations.filter((st) => {
    const matchesSearch = st.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = typeFilter === 'ALL' || st.type === typeFilter;
    return matchesSearch && matchesType;
  });



  const triggerDownload = (fileName: string, csvContent: string) => {
    const validDate = (() => {
      try {
        return localStorage.getItem('efi_compras_valid_from') || selectedDate;
      } catch (e) {
        return selectedDate;
      }
    })();
    const cleanFileName = fileName.replace('.csv', `_VALIDO_${validDate}.csv`);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = cleanFileName;
    link.click();
    setDownloadToast(fileName);
    setTimeout(() => setDownloadToast(null), 3500);
  };

  // Descarga de la tabla de Tarifas Estándar con el formato EXACTO del Excel (media_1787840120442.png)
  const handleExportStandardCsv = () => {
    const validDate = (() => {
      try {
        return localStorage.getItem('efi_compras_valid_from') || selectedDate;
      } catch (e) {
        return selectedDate;
      }
    })();
    let csv = `SABANA DE PRECIOS - AREA 117\nFECHA EMISION:;${selectedDate};PRECIOS VALIDOS A PARTIR DE:;${validDate}\nAVISO:;PRECIOS Y CONDICIONES APLICABLES A PARTIR DEL:;${validDate}\n\nEESS DE SERVICIO;`;
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
              Columna de estaciones identificada con <strong className="text-blue-400">Azul para Propias</strong> y <strong className="text-purple-400">Morado para Colaboradoras y Estaciones Destacadas</strong> (Riba-roja, Pista de Silla, Gandia, Chiva, Alberic, Catarroja, Manises en 18, 36 y 60 con IVA).
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
            <span>Morado = Colab / Destacadas</span>
          </span>
        </div>
      </div>

      {/* BLOQUE 1: RECUADRO SUPERIOR — TARIFAS ESTÁNDAR (12 A 60) */}
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
              <p className="text-xs text-slate-400">Precios sin IVA y con IVA (+21%) — Destacadas en morado: Riba-roja, Pista Silla, Gandia, Chiva, Alberic, Catarroja, Manises (18, 36 y 60 con IVA)</p>
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
                const isPurple = isPurpleHighlightedStation(st.name);

                // Colores en la celda del nombre de la estación (Morado para destacadas o colaboradoras, Azul para propias)
                const stationCellClass = isPurple
                  ? 'bg-purple-950/60 text-purple-200 border-l-4 border-l-purple-500 font-extrabold ring-1 ring-purple-500/30'
                  : isPropia
                  ? 'bg-blue-950/40 text-blue-200 border-l-4 border-l-blue-500 font-bold'
                  : 'bg-purple-950/40 text-purple-200 border-l-4 border-l-purple-500 font-bold';

                const badgeClass = isPurple
                  ? 'bg-purple-500/30 text-purple-200 border-purple-400/40 font-black'
                  : isPropia
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30';

                return (
                  <tr key={st.name} className="hover:bg-slate-800/40 transition-colors">
                    {/* Columna Estación */}
                    <td
                      className={`py-2.5 px-4 sticky left-0 z-20 border-r border-slate-800 ${stationCellClass}`}
                    >
                      <div className="flex items-center justify-between space-x-2 font-sans">
                        <span className="font-extrabold tracking-tight">{st.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border uppercase tracking-wider ${badgeClass}`}>
                          {isPurple ? (isPropia ? 'PROPIA ★' : 'COLAB ★') : isPropia ? 'PROPIA' : 'COLAB'}
                        </span>
                      </div>
                    </td>

                    {/* Columnas de Precios */}
                    {STANDARD_TARIFFS.map((tariff) => {
                      const sinIva = Number((base + tariff.markup).toFixed(3));
                      const conIva = Number((sinIva * 1.21).toFixed(3));
                      const isPurplePrice = isPurple && ['18', '36', '60'].includes(tariff.id);

                      return (
                        <React.Fragment key={`${st.name}_${tariff.id}`}>
                          <td className={`py-2.5 px-2.5 text-right font-mono ${
                            isPurplePrice
                              ? 'bg-purple-950/40 text-purple-300 font-semibold'
                              : 'text-slate-300 bg-slate-900/10'
                          }`}>
                            {sinIva.toFixed(3).replace('.', ',')}
                          </td>
                          <td className={`py-2.5 px-2.5 text-right font-bold font-mono border-r ${
                            isPurplePrice
                              ? 'bg-purple-600/30 text-purple-200 font-black border-purple-500/40 shadow-inner'
                              : 'text-emerald-400 bg-emerald-500/5 border-slate-800/80'
                          }`}>
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
