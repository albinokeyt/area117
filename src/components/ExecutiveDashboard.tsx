'use client';

import React, { useState } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS } from '@/lib/dataSeed';
import {
  TrendingUp, TrendingDown, Building2, Store, Fuel,
  ArrowUpRight, ArrowRight, BarChart3, Target, Zap, ShieldCheck,
  Calendar, Layers, Download, X, Clock, DollarSign, Percent, ArrowLeftRight
} from 'lucide-react';

interface DashboardProps {
  onNavigateTab?: (tab: string) => void;
}

// Datos de estaciones representativos del sistema
const MOCK_PROPIAS = [
  { station: 'ARCOS', goa: 1.2150, premium: 1.2550, gasolina: 1.3750, margin: 0.0420, weeklyGain: 1420 },
  { station: 'ALCUBILLAS', goa: 1.2180, premium: 1.2580, gasolina: 1.3800, margin: 0.0390, weeklyGain: 1380 },
  { station: 'TORREJON', goa: 1.2100, premium: 1.2500, gasolina: 1.3700, margin: 0.0450, weeklyGain: 1650 },
  { station: 'ARCOS JALON', goa: 1.2140, premium: 1.2540, gasolina: 1.3740, margin: 0.0410, weeklyGain: 1390 },
  { station: 'ALFAJARIN', goa: 1.2160, premium: 1.2560, gasolina: 1.3780, margin: 0.0400, weeklyGain: 1410 },
  { station: 'TORREMOCHA', goa: 1.2190, premium: 1.2590, gasolina: 1.3820, margin: 0.0380, weeklyGain: 1290 },
  { station: 'MADRID', goa: 1.2200, premium: 1.2600, gasolina: 1.3850, margin: 0.0380, weeklyGain: 1510 },
  { station: 'VALLECAS', goa: 1.2130, premium: 1.2530, gasolina: 1.3720, margin: 0.0410, weeklyGain: 1460 },
  { station: 'UCLES', goa: 1.2170, premium: 1.2570, gasolina: 1.3790, margin: 0.0390, weeklyGain: 1320 },
  { station: 'PAMPLONA', goa: 1.2090, premium: 1.2490, gasolina: 1.3680, margin: 0.0480, weeklyGain: 1720 },
];

const MOCK_COLABORADORAS = [
  { station: 'Z.FRANCA', goa: 1.1850, premium: 1.2250, gasolina: 1.3450, margin: 0.0360, weeklyGain: 1890 },
  { station: 'BENAVENTE', goa: 1.1790, premium: 1.2190, gasolina: 1.3390, margin: 0.0380, weeklyGain: 1620 },
  { station: 'IRUN ZAISA III', goa: 1.1920, premium: 1.2320, gasolina: 1.3520, margin: 0.0410, weeklyGain: 1980 },
  { station: 'AVILESINA', goa: 1.1880, premium: 1.2280, gasolina: 1.3480, margin: 0.0370, weeklyGain: 1540 },
  { station: 'MERIDA', goa: 1.1820, premium: 1.2220, gasolina: 1.3420, margin: 0.0390, weeklyGain: 1480 },
  { station: 'SANCTI-SPIRITUS', goa: 1.1760, premium: 1.2160, gasolina: 1.3360, margin: 0.0430, weeklyGain: 1690 },
  { station: 'PUERTO DE BARCELONA', goa: 1.1940, premium: 1.2340, gasolina: 1.3540, margin: 0.0400, weeklyGain: 2150 },
  { station: 'VEGA DE VALCARCE', goa: 1.1910, premium: 1.2310, gasolina: 1.3510, margin: 0.0390, weeklyGain: 1740 },
];

const PURCHASE_TREND = [1.1820, 1.1850, 1.1790, 1.1900, 1.1950, 1.1880, 1.2010, 1.1970];
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Hoy'];

const avgGoa = MOCK_PROPIAS.reduce((a, b) => a + b.goa, 0) / MOCK_PROPIAS.length;
const avgMargin = MOCK_PROPIAS.reduce((a, b) => a + b.margin, 0) / MOCK_PROPIAS.length;
const prevGoa = PURCHASE_TREND[PURCHASE_TREND.length - 2];
const todayGoa = PURCHASE_TREND[PURCHASE_TREND.length - 1];
const goaDelta = todayGoa - prevGoa;

// Top 5 Estaciones con mayores ganancias en la última semana
const allStationsCombined = [...MOCK_PROPIAS, ...MOCK_COLABORADORAS];
const topStationsWeekly = [...allStationsCombined].sort((a, b) => b.weeklyGain - a.weeklyGain).slice(0, 5);

type KpiType = 'compra' | 'margen' | 'propias' | 'colaboradoras';
type PeriodType = 'dia' | 'semana' | 'mes' | 'ano';

export function ExecutiveDashboard({ onNavigateTab }: DashboardProps) {
  const [activeTableTab, setActiveTableTab] = useState<'PROPIAS' | 'COLABORADORAS' | 'TODAS'>('TODAS');
  const [selectedKpi, setSelectedKpi] = useState<KpiType | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('dia');

  // Datos comparativos por período para el modal de KPIs
  const KPI_DETAILS: Record<KpiType, { title: string; subtitle: string; icon: React.ElementType; color: string; periods: Record<PeriodType, { current: string; previous: string; delta: string; isPositive: boolean; costAvg: string; gainAvg: string; marginPct: string; commentary: string }> }> = {
    compra: {
      title: 'Desglose y Comparativa: Precio de Compra GOA',
      subtitle: 'Evolución del precio de adquisición mayorista en distintos periodos',
      icon: Fuel,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      periods: {
        dia: {
          current: '1.1970 €/L',
          previous: '1.2010 €/L (Ayer)',
          delta: '-0.0040 €/L (-0.33%)',
          isPositive: true, // Bajada de coste es positivo
          costAvg: '1.1970 €/L',
          gainAvg: '0.0420 €/L',
          marginPct: '3.51%',
          commentary: 'El precio de compra experimentó una leve bajada respecto a la sesión de ayer.',
        },
        semana: {
          current: '1.1970 €/L',
          previous: '1.1820 €/L (Semana Pasada)',
          delta: '+0.0150 €/L (+1.27%)',
          isPositive: false,
          costAvg: '1.1912 €/L (Media 7d)',
          gainAvg: '0.0415 €/L',
          marginPct: '3.48%',
          commentary: 'Tendencia alcista moderada en la cotización semanal del diésel.',
        },
        mes: {
          current: '1.1970 €/L',
          previous: '1.1650 €/L (Mes Pasado)',
          delta: '+0.0320 €/L (+2.74%)',
          isPositive: false,
          costAvg: '1.1780 €/L (Media 30d)',
          gainAvg: '0.0430 €/L',
          marginPct: '3.65%',
          commentary: 'Ajuste mensual acorde a los movimientos del barril Brent en refinería.',
        },
        ano: {
          current: '1.1970 €/L',
          previous: '1.2450 €/L (Año Pasado)',
          delta: '-0.0480 €/L (-3.85%)',
          isPositive: true,
          costAvg: '1.2100 €/L (Media Anual)',
          gainAvg: '0.0405 €/L',
          marginPct: '3.34%',
          commentary: 'El coste medio se mantiene inferior respecto al mismo periodo del año fiscal anterior.',
        },
      },
    },
    margen: {
      title: 'Desglose y Comparativa: Margen Medio Global',
      subtitle: 'Rentabilidad neta por litro comercializado en la red',
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      periods: {
        dia: {
          current: '0.0425 €/L',
          previous: '0.0410 €/L (Ayer)',
          delta: '+0.0015 €/L (+3.66%)',
          isPositive: true,
          costAvg: '1.1970 €/L',
          gainAvg: '0.0425 €/L',
          marginPct: '3.55%',
          commentary: 'Aumento del margen neto diario gracias a la optimización de costes de pase y portes.',
        },
        semana: {
          current: '0.0425 €/L',
          previous: '0.0395 €/L (Semana Pasada)',
          delta: '+0.0030 €/L (+7.59%)',
          isPositive: true,
          costAvg: '1.1912 €/L',
          gainAvg: '0.0418 €/L (Media Semanal)',
          marginPct: '3.51%',
          commentary: 'Rendimiento sólido en los últimos 7 días impulsado por las estaciones de alta rotación.',
        },
        mes: {
          current: '0.0425 €/L',
          previous: '0.0380 €/L (Mes Pasado)',
          delta: '+0.0045 €/L (+11.84%)',
          isPositive: true,
          costAvg: '1.1780 €/L',
          gainAvg: '0.0405 €/L (Media Mensual)',
          marginPct: '3.44%',
          commentary: 'Consolidación de márgenes en el acumulado mensual.',
        },
        ano: {
          current: '0.0425 €/L',
          previous: '0.0360 €/L (Año Pasado)',
          delta: '+0.0065 €/L (+18.05%)',
          isPositive: true,
          costAvg: '1.2100 €/L',
          gainAvg: '0.0385 €/L',
          marginPct: '3.18%',
          commentary: 'Crecimiento interanual del 18% en rentabilidad unitaria.',
        },
      },
    },
    propias: {
      title: 'Desglose: Estaciones Propias (Postes & Red)',
      subtitle: 'Estado operativo, márgenes y rendimiento de la red propia',
      icon: Building2,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      periods: {
        dia: {
          current: '10 EESS Activas',
          previous: '10 EESS Ayer',
          delta: '100% Operatividad',
          isPositive: true,
          costAvg: '1.2155 €/L',
          gainAvg: '0.0412 €/L',
          marginPct: '3.39%',
          commentary: 'Todas las estaciones propias han sincronizado precios y postes para el público.',
        },
        semana: {
          current: '14,340 € Ganancia Semanal',
          previous: '13,850 € Sem. Anterior',
          delta: '+490 € (+3.53%)',
          isPositive: true,
          costAvg: '1.2120 €/L',
          gainAvg: '1,434 €/Estación media',
          marginPct: '3.45%',
          commentary: 'PAMPLONA y TORREJON lideran las ganancias semanales del grupo propio.',
        },
        mes: {
          current: '59,800 € Ganancia Mensual',
          previous: '56,200 € Mes Anterior',
          delta: '+3,600 € (+6.41%)',
          isPositive: true,
          costAvg: '1.1980 €/L',
          gainAvg: '5,980 €/Estación',
          marginPct: '3.50%',
          commentary: 'Superado el objetivo presupuestario mensual.',
        },
        ano: {
          current: '710,000 € Acumulado Anual',
          previous: '645,000 € Año Anterior',
          delta: '+65,000 € (+10.08%)',
          isPositive: true,
          costAvg: '1.2050 €/L',
          gainAvg: '71,000 €/Estación',
          marginPct: '3.40%',
          commentary: 'Crecimiento de red sostenido a 12 meses.',
        },
      },
    },
    colaboradoras: {
      title: 'Desglose: Estaciones Colaboradoras (EFI)',
      subtitle: 'Gestión de acuerdos mayoristas y estaciones fijas en Columna J',
      icon: ShieldCheck,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      periods: {
        dia: {
          current: '13 Fijas / 40 Total',
          previous: '13 Fijas Ayer',
          delta: '100% Sincronizadas',
          isPositive: true,
          costAvg: '1.1865 €/L',
          gainAvg: '0.0395 €/L',
          marginPct: '3.33%',
          commentary: 'Precios de Z.FRANCA, BENAVENTE, IRUN y resto de colaboradoras validados para EFI.',
        },
        semana: {
          current: '16,280 € Ganancia Semanal',
          previous: '15,400 € Sem. Anterior',
          delta: '+880 € (+5.71%)',
          isPositive: true,
          costAvg: '1.1840 €/L',
          gainAvg: '1,250 €/Estación media',
          marginPct: '3.38%',
          commentary: 'PUERTO DE BARCELONA e IRUN ZAISA III registraron el mayor volumen de la semana.',
        },
        mes: {
          current: '68,500 € Ganancia Mensual',
          previous: '63,100 € Mes Anterior',
          delta: '+5,400 € (+8.56%)',
          isPositive: true,
          costAvg: '1.1790 €/L',
          gainAvg: '5,269 €/Estación',
          marginPct: '3.41%',
          commentary: 'Acuerdos con proveedores (Valcarce, Nieves, Petromiralles) operando en margen óptimo.',
        },
        ano: {
          current: '795,000 € Acumulado Anual',
          previous: '720,000 € Año Anterior',
          delta: '+75,000 € (+10.42%)',
          isPositive: true,
          costAvg: '1.1920 €/L',
          gainAvg: '61,150 €/Estación',
          marginPct: '3.30%',
          commentary: 'Expansión de red colaboradora con alta fidelización de clientes.',
        },
      },
    },
  };

  const displayedStations =
    activeTableTab === 'PROPIAS'
      ? MOCK_PROPIAS.map((s) => ({ ...s, type: 'PROPIA' }))
      : activeTableTab === 'COLABORADORAS'
      ? MOCK_COLABORADORAS.map((s) => ({ ...s, type: 'COLABORADORA' }))
      : [
          ...MOCK_PROPIAS.map((s) => ({ ...s, type: 'PROPIA' })),
          ...MOCK_COLABORADORAS.map((s) => ({ ...s, type: 'COLABORADORA' })),
        ];

  const maxBar = Math.max(...PURCHASE_TREND);
  const minBar = Math.min(...PURCHASE_TREND);

  return (
    <div className="space-y-8">
      {/* Banner Principal */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <BarChart3 className="h-4 w-4" />
          <span>Panel de Control Ejecutivo</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Dashboard — EFI DATA OIL
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Monitoreo en tiempo real de precios de compra, postes, márgenes y rentabilidad semanal.
        </p>
      </div>

      {/* 4 KPIs Superiores (Interactivas con Modal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Precio Compra */}
        <div
          onClick={() => setSelectedKpi('compra')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-xl cursor-pointer group transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
              <Fuel className="h-5 w-5" />
            </div>
            <span className="flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingDown className="h-3 w-3" />
              <span>-0.0040 €</span>
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">Precio Compra GOA (Hoy)</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-0.5">
              {todayGoa.toFixed(4)} <span className="text-xs text-slate-400">€/L</span>
            </p>
            <p className="text-[11px] text-amber-400/90 font-medium mt-1 flex items-center space-x-1">
              <span>Ayer: {prevGoa.toFixed(4)} €</span>
              <span className="text-slate-600">&bull;</span>
              <span className="underline group-hover:text-amber-300">Ver análisis</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Margen Medio */}
        <div
          onClick={() => setSelectedKpi('margen')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-xl cursor-pointer group transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-3 w-3" />
              <span>+3.6%</span>
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">Margen Medio Global</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-0.5">
              {avgMargin.toFixed(4)} <span className="text-xs text-slate-400">€/L</span>
            </p>
            <p className="text-[11px] text-emerald-400/90 font-medium mt-1 flex items-center space-x-1">
              <span>P. Venta medio: {(avgGoa + avgMargin).toFixed(4)} €</span>
              <span className="text-slate-600">&bull;</span>
              <span className="underline group-hover:text-emerald-300">Ver análisis</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Estaciones Propias */}
        <div
          onClick={() => setSelectedKpi('propias')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 shadow-xl cursor-pointer group transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-[10px] bg-blue-500/10 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
              100% Sincronizado
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">Estaciones Propias Activas</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-0.5">
              10 <span className="text-xs text-slate-400">EESS Principales</span>
            </p>
            <p className="text-[11px] text-blue-400/90 font-medium mt-1 flex items-center space-x-1">
              <span>Postes actualizados</span>
              <span className="text-slate-600">&bull;</span>
              <span className="underline group-hover:text-blue-300">Ver histórico</span>
            </p>
          </div>
        </div>

        {/* KPI 4: Colaboradoras */}
        <div
          onClick={() => setSelectedKpi('colaboradoras')}
          className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 shadow-xl cursor-pointer group transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-[10px] bg-purple-500/10 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/20">
              13 Fijas
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">Colaboradoras Fijas (EFI)</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-0.5">
              13 <span className="text-xs text-slate-400">Columna J</span>
            </p>
            <p className="text-[11px] text-purple-400/90 font-medium mt-1 flex items-center space-x-1">
              <span>Z.Franca, Irun, Benavente...</span>
              <span className="text-slate-600">&bull;</span>
              <span className="underline group-hover:text-purple-300">Ver histórico</span>
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos + Top Estaciones de la Semana */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-amber-400" />
              <span>Evolución Precio GOA — Últimos 8 Días</span>
            </h3>
            <span className="text-xs text-amber-400 font-mono bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 font-bold">
              € / Litro
            </span>
          </div>

          <div className="flex items-end space-x-2 sm:space-x-4 h-36 pt-6">
            {PURCHASE_TREND.map((v, i) => {
              const pct = ((v - minBar) / (maxBar - minBar)) * 100;
              const isToday = DAYS[i] === 'Hoy';
              return (
                <div key={i} className="flex flex-col items-center space-y-1.5 flex-1">
                  <span className="text-[10px] font-mono text-slate-400">{v.toFixed(4)}</span>
                  <div className="w-full flex flex-col justify-end" style={{ height: '90px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isToday
                          ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-lg shadow-amber-500/20'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                      style={{ height: `${Math.max(pct, 12)}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold ${isToday ? 'text-amber-400' : 'text-slate-500'}`}>
                    {DAYS[i]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Mínimo: <strong className="text-emerald-400">{Math.min(...PURCHASE_TREND).toFixed(4)} €/L</strong></span>
            <span>Media: <strong className="text-amber-400">{(PURCHASE_TREND.reduce((a, b) => a + b, 0) / PURCHASE_TREND.length).toFixed(4)} €/L</strong></span>
            <span>Máximo: <strong className="text-rose-400">{Math.max(...PURCHASE_TREND).toFixed(4)} €/L</strong></span>
          </div>
        </div>

        {/* Top 5 Estaciones por Margen (Última Semana) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <Target className="h-5 w-5 text-emerald-400" />
                <span>Top 5 Estaciones</span>
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                Última Semana
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Estaciones con mejores ganancias netas acumuladas en los últimos 7 días:</p>

            <div className="space-y-3.5">
              {topStationsWeekly.map((st, i) => {
                const maxGain = topStationsWeekly[0].weeklyGain;
                const pct = (st.weeklyGain / maxGain) * 100;
                return (
                  <div key={st.station} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            i === 0
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="font-bold text-white">{st.station}</span>
                        <span className="text-[9px] text-slate-500 font-mono">({st.type.charAt(0)})</span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-emerald-400 font-bold">+{st.weeklyGain.toLocaleString()} €</span>
                        <span className="text-slate-500 text-[10px]">({st.margin.toFixed(4)}€/L)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          i === 0
                            ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Completa: Precios Actuales (Propias y Colaboradoras) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Precios Actuales por Estación</h3>
              <p className="text-xs text-slate-400">Vista unificada de toda la red de estaciones</p>
            </div>
          </div>

          {/* Filtros de Tabla */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTableTab('TODAS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTableTab === 'TODAS' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({displayedStations.length})
            </button>
            <button
              onClick={() => setActiveTableTab('PROPIAS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTableTab === 'PROPIAS' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Propias ({MOCK_PROPIAS.length})
            </button>
            <button
              onClick={() => setActiveTableTab('COLABORADORAS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTableTab === 'COLABORADORAS' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Colaboradoras ({MOCK_COLABORADORAS.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3.5 px-5">Estación</th>
                <th className="py-3.5 px-3">Tipo</th>
                <th className="py-3.5 px-4 text-amber-300">Gasóleo A (€/L)</th>
                <th className="py-3.5 px-4 text-amber-300">GOA Premium (+0.04€)</th>
                <th className="py-3.5 px-4 text-blue-300">Gasolina 95 (€/L)</th>
                <th className="py-3.5 px-4 text-emerald-300">Margen Unitario (€)</th>
                <th className="py-3.5 px-4 text-emerald-300">Ganancia Semanal (€)</th>
                <th className="py-3.5 px-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              {displayedStations.map((row) => (
                <tr key={row.station} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-5 font-bold text-white">{row.station}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        row.type === 'PROPIA'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-amber-300 font-bold">{row.goa.toFixed(4)} €</td>
                  <td className="py-3 px-4 font-mono text-amber-400 font-bold">{row.premium.toFixed(4)} €</td>
                  <td className="py-3 px-4 font-mono text-blue-300">{row.gasolina.toFixed(4)} €</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">+{row.margin.toFixed(4)} €</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-300">+{row.weeklyGain.toLocaleString()} €</td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>Activa</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Interactivo de KPI con Períodos (Día, Semana, Mes, Año) */}
      {selectedKpi && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl border ${KPI_DETAILS[selectedKpi].color}`}>
                  {(() => {
                    const IconComp = KPI_DETAILS[selectedKpi].icon;
                    return <IconComp className="h-6 w-6" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{KPI_DETAILS[selectedKpi].title}</h3>
                  <p className="text-xs text-slate-400">{KPI_DETAILS[selectedKpi].subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedKpi(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Selector de Períodos */}
            <div className="p-6 space-y-6">
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
                {[
                  { id: 'dia', label: 'Día Anterior (vs Ayer)' },
                  { id: 'semana', label: 'Semana Anterior (vs 7d)' },
                  { id: 'mes', label: 'Mes Anterior (vs 30d)' },
                  { id: 'ano', label: 'Año Anterior (vs 365d)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriod(p.id as PeriodType)}
                    className={`flex-1 py-2 rounded-xl transition-all ${
                      selectedPeriod === p.id
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Contenido del Período Seleccionado */}
              {(() => {
                const data = KPI_DETAILS[selectedKpi].periods[selectedPeriod];
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <p className="text-xs text-slate-400">Valor Actual</p>
                        <p className="text-2xl font-extrabold text-white font-mono mt-1">
                          {data.current}
                        </p>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <p className="text-xs text-slate-400">Variación Período</p>
                        <p
                          className={`text-2xl font-extrabold font-mono mt-1 ${
                            data.isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {data.delta}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{data.previous}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-1">Coste Promedio:</span>
                        <span className="font-mono font-bold text-amber-300">{data.costAvg}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Ganancia Unitaria:</span>
                        <span className="font-mono font-bold text-emerald-400">{data.gainAvg}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">% Margen:</span>
                        <span className="font-mono font-bold text-blue-300">{data.marginPct}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-slate-300 space-y-1">
                      <strong className="text-amber-300 block">Análisis Operativo:</strong>
                      <p>{data.commentary}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedKpi(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
