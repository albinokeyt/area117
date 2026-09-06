'use client';

import React, { useState } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS } from '@/lib/dataSeed';
import {
  TrendingUp, TrendingDown, Building2, Store, Fuel,
  ArrowUpRight, ArrowRight, BarChart3, Target, Zap, ShieldCheck,
  Calendar, Layers, Download, X, Clock, DollarSign, Percent, ArrowLeftRight,
  Droplet, Flame, CheckCircle2, ChevronRight, Award, Filter
} from 'lucide-react';

interface DashboardProps {
  onNavigateTab?: (tab: string) => void;
}

// Tipos de Períodos solicitados: 1 día, 7 días, 1 mes, 1 año
type PeriodType = '1d' | '7d' | '1m' | '1y';

// Tipos de Productos manejados: Gasóleo A, Gasolina 95, AdBlue, HVO, Gasóleo B
type ProductCode = 'GOA' | 'GASOLINA' | 'ADBLUE' | 'HVO' | 'GOB';

interface ProductComparisonData {
  code: ProductCode;
  name: string;
  badge: string;
  icon: React.ElementType;
  buyPrice: number;
  salePrice: number;
  prevBuyPrice: number;
  prevSalePrice: number;
}

// Datos de comparativa por Período y Producto (conservando 3 dígitos tras la coma/punto)
const PRODUCTS_BY_PERIOD: Record<PeriodType, {
  label: string;
  sublabel: string;
  periodName: string;
  products: ProductComparisonData[];
}> = {
  '1d': {
    label: '1 Día (vs Ayer)',
    sublabel: 'Últimas 24 horas',
    periodName: '1 Día',
    products: [
      { code: 'GOA', name: 'Gasóleo A (GOA)', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Fuel, buyPrice: 1.197, salePrice: 1.239, prevBuyPrice: 1.201, prevSalePrice: 1.241 },
      { code: 'GASOLINA', name: 'Gasolina 95', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: Zap, buyPrice: 1.317, salePrice: 1.365, prevBuyPrice: 1.320, prevSalePrice: 1.367 },
      { code: 'ADBLUE', name: 'AdBlue', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', icon: Droplet, buyPrice: 0.450, salePrice: 0.799, prevBuyPrice: 0.450, prevSalePrice: 0.799 },
      { code: 'HVO', name: 'HVO Biofuel', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: Flame, buyPrice: 1.420, salePrice: 1.485, prevBuyPrice: 1.425, prevSalePrice: 1.489 },
      { code: 'GOB', name: 'Gasóleo B', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', icon: Fuel, buyPrice: 0.985, salePrice: 1.025, prevBuyPrice: 0.988, prevSalePrice: 1.027 },
    ],
  },
  '7d': {
    label: '7 Días (Semanal)',
    sublabel: 'Últimos 7 días',
    periodName: '7 Días',
    products: [
      { code: 'GOA', name: 'Gasóleo A (GOA)', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Fuel, buyPrice: 1.191, salePrice: 1.233, prevBuyPrice: 1.182, prevSalePrice: 1.222 },
      { code: 'GASOLINA', name: 'Gasolina 95', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: Zap, buyPrice: 1.311, salePrice: 1.358, prevBuyPrice: 1.302, prevSalePrice: 1.348 },
      { code: 'ADBLUE', name: 'AdBlue', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', icon: Droplet, buyPrice: 0.448, salePrice: 0.795, prevBuyPrice: 0.445, prevSalePrice: 0.790 },
      { code: 'HVO', name: 'HVO Biofuel', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: Flame, buyPrice: 1.415, salePrice: 1.478, prevBuyPrice: 1.405, prevSalePrice: 1.468 },
      { code: 'GOB', name: 'Gasóleo B', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', icon: Fuel, buyPrice: 0.980, salePrice: 1.019, prevBuyPrice: 0.975, prevSalePrice: 1.012 },
    ],
  },
  '1m': {
    label: '1 Mes (Mensual)',
    sublabel: 'Últimos 30 días',
    periodName: '1 Mes',
    products: [
      { code: 'GOA', name: 'Gasóleo A (GOA)', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Fuel, buyPrice: 1.178, salePrice: 1.221, prevBuyPrice: 1.165, prevSalePrice: 1.205 },
      { code: 'GASOLINA', name: 'Gasolina 95', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: Zap, buyPrice: 1.298, salePrice: 1.346, prevBuyPrice: 1.285, prevSalePrice: 1.331 },
      { code: 'ADBLUE', name: 'AdBlue', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', icon: Droplet, buyPrice: 0.445, salePrice: 0.790, prevBuyPrice: 0.440, prevSalePrice: 0.785 },
      { code: 'HVO', name: 'HVO Biofuel', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: Flame, buyPrice: 1.405, salePrice: 1.470, prevBuyPrice: 1.390, prevSalePrice: 1.452 },
      { code: 'GOB', name: 'Gasóleo B', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', icon: Fuel, buyPrice: 0.970, salePrice: 1.011, prevBuyPrice: 0.960, prevSalePrice: 0.999 },
    ],
  },
  '1y': {
    label: '1 Año (Anual)',
    sublabel: 'Últimos 365 días',
    periodName: '1 Año',
    products: [
      { code: 'GOA', name: 'Gasóleo A (GOA)', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Fuel, buyPrice: 1.210, salePrice: 1.251, prevBuyPrice: 1.245, prevSalePrice: 1.284 },
      { code: 'GASOLINA', name: 'Gasolina 95', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: Zap, buyPrice: 1.330, salePrice: 1.375, prevBuyPrice: 1.360, prevSalePrice: 1.402 },
      { code: 'ADBLUE', name: 'AdBlue', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', icon: Droplet, buyPrice: 0.460, salePrice: 0.810, prevBuyPrice: 0.470, prevSalePrice: 0.820 },
      { code: 'HVO', name: 'HVO Biofuel', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: Flame, buyPrice: 1.435, salePrice: 1.498, prevBuyPrice: 1.460, prevSalePrice: 1.520 },
      { code: 'GOB', name: 'Gasóleo B', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', icon: Fuel, buyPrice: 0.995, salePrice: 1.034, prevBuyPrice: 1.015, prevSalePrice: 1.052 },
    ],
  },
};

// Ranking Semanal de Estaciones con Mayor Ganancia Promedio (según producto, precio diario y frecuencia)
interface WeeklyStationProfit {
  rank: number;
  station: string;
  type: 'PROPIA' | 'COLABORADORA';
  fuelType: string;
  fuelCode: ProductCode;
  dailyBuyPrice: number;    // Precio Compra Diario Indicado Promedio (€/L con 3 decimales)
  dailySalePrice: number;   // Precio Venta Diario Indicado Promedio (€/L con 3 decimales)
  avgMargin: number;        // Margen Promedio (€/L con 3 decimales)
  purchaseFrequency: string; // Frecuencia de compra en la estación
  frequencyDays: number;     // Días de 7
  weeklyEstimatedVolume: number; // Litros
  weeklyGain: number;       // Ganancia Promedio Semanal (€)
}

const WEEKLY_TOP_STATIONS_PROFIT: WeeklyStationProfit[] = [
  {
    rank: 1,
    station: 'PAMPLONA',
    type: 'PROPIA',
    fuelType: 'Gasóleo A (GOA)',
    fuelCode: 'GOA',
    dailyBuyPrice: 1.185,
    dailySalePrice: 1.235,
    avgMargin: 0.050,
    purchaseFrequency: 'Diaria (7/7 días)',
    frequencyDays: 7,
    weeklyEstimatedVolume: 62000,
    weeklyGain: 3100,
  },
  {
    rank: 2,
    station: 'TORREJON',
    type: 'PROPIA',
    fuelType: 'Gasóleo A (GOA)',
    fuelCode: 'GOA',
    dailyBuyPrice: 1.192,
    dailySalePrice: 1.239,
    avgMargin: 0.047,
    purchaseFrequency: 'Diaria (7/7 días)',
    frequencyDays: 7,
    weeklyEstimatedVolume: 58000,
    weeklyGain: 2726,
  },
  {
    rank: 3,
    station: 'IRUN ZAISA III',
    type: 'COLABORADORA',
    fuelType: 'Gasóleo A (GOA)',
    fuelCode: 'GOA',
    dailyBuyPrice: 1.182,
    dailySalePrice: 1.226,
    avgMargin: 0.044,
    purchaseFrequency: 'Diaria (7/7 días)',
    frequencyDays: 7,
    weeklyEstimatedVolume: 55000,
    weeklyGain: 2420,
  },
  {
    rank: 4,
    station: 'ARCOS JALON',
    type: 'PROPIA',
    fuelType: 'Gasolina 95',
    fuelCode: 'GASOLINA',
    dailyBuyPrice: 1.305,
    dailySalePrice: 1.357,
    avgMargin: 0.052,
    purchaseFrequency: 'Alta (6/7 días)',
    frequencyDays: 6,
    weeklyEstimatedVolume: 42000,
    weeklyGain: 2184,
  },
  {
    rank: 5,
    station: 'VALDEMORO',
    type: 'PROPIA',
    fuelType: 'HVO Biofuel',
    fuelCode: 'HVO',
    dailyBuyPrice: 1.418,
    dailySalePrice: 1.488,
    avgMargin: 0.070,
    purchaseFrequency: 'Alta (6/7 días)',
    frequencyDays: 6,
    weeklyEstimatedVolume: 30000,
    weeklyGain: 2100,
  },
  {
    rank: 6,
    station: 'ALFAJARIN',
    type: 'PROPIA',
    fuelType: 'AdBlue',
    fuelCode: 'ADBLUE',
    dailyBuyPrice: 0.400,
    dailySalePrice: 0.749,
    avgMargin: 0.349,
    purchaseFrequency: 'Frecuente (5/7 días)',
    frequencyDays: 5,
    weeklyEstimatedVolume: 5800,
    weeklyGain: 2024,
  },
  {
    rank: 7,
    station: 'PUERTO DE BARCELONA',
    type: 'COLABORADORA',
    fuelType: 'Gasóleo A (GOA)',
    fuelCode: 'GOA',
    dailyBuyPrice: 1.180,
    dailySalePrice: 1.221,
    avgMargin: 0.041,
    purchaseFrequency: 'Diaria (7/7 días)',
    frequencyDays: 7,
    weeklyEstimatedVolume: 48000,
    weeklyGain: 1968,
  },
  {
    rank: 8,
    station: 'BENAVENTE',
    type: 'COLABORADORA',
    fuelType: 'Gasóleo B',
    fuelCode: 'GOB',
    dailyBuyPrice: 0.978,
    dailySalePrice: 1.022,
    avgMargin: 0.044,
    purchaseFrequency: 'Frecuente (5/7 días)',
    frequencyDays: 5,
    weeklyEstimatedVolume: 40000,
    weeklyGain: 1760,
  },
  {
    rank: 9,
    station: 'MERIDA',
    type: 'COLABORADORA',
    fuelType: 'Gasóleo A (GOA)',
    fuelCode: 'GOA',
    dailyBuyPrice: 1.188,
    dailySalePrice: 1.229,
    avgMargin: 0.041,
    purchaseFrequency: 'Frecuente (5/7 días)',
    frequencyDays: 5,
    weeklyEstimatedVolume: 39000,
    weeklyGain: 1599,
  },
  {
    rank: 10,
    station: 'MADRID',
    type: 'PROPIA',
    fuelType: 'Gasolina 95',
    fuelCode: 'GASOLINA',
    dailyBuyPrice: 1.312,
    dailySalePrice: 1.360,
    avgMargin: 0.048,
    purchaseFrequency: 'Alta (6/7 días)',
    frequencyDays: 6,
    weeklyEstimatedVolume: 32000,
    weeklyGain: 1536,
  },
];

// Estaciones Propias y Colaboradoras con formato de 3 decimales
const MOCK_PROPIAS = PROPIAS_STATIONS.map((st, i) => ({
  station: st.name,
  type: 'PROPIA' as const,
  goa: Number((1.210 + (i % 5) * 0.002).toFixed(3)),
  premium: Number((1.250 + (i % 5) * 0.002).toFixed(3)),
  gasolina: Number((1.370 + (i % 5) * 0.003).toFixed(3)),
  margin: Number((0.038 + (i % 4) * 0.002).toFixed(3)),
  weeklyGain: 1300 + (i * 35),
}));

const MOCK_COLABORADORAS = COLABORADORA_STATIONS.map((st, i) => ({
  station: st.name,
  type: 'COLABORADORA' as const,
  goa: Number((1.180 + (i % 6) * 0.002).toFixed(3)),
  premium: Number((1.220 + (i % 6) * 0.002).toFixed(3)),
  gasolina: Number((1.340 + (i % 6) * 0.003).toFixed(3)),
  margin: Number((0.036 + (i % 4) * 0.002).toFixed(3)),
  weeklyGain: 1400 + (i * 25),
}));

const PURCHASE_TREND = [1.182, 1.185, 1.179, 1.190, 1.195, 1.188, 1.201, 1.197];
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Hoy'];

const avgGoa = Number((MOCK_PROPIAS.reduce((a, b) => a + b.goa, 0) / MOCK_PROPIAS.length).toFixed(3));
const avgMargin = Number((MOCK_PROPIAS.reduce((a, b) => a + b.margin, 0) / MOCK_PROPIAS.length).toFixed(3));
const prevGoa = PURCHASE_TREND[PURCHASE_TREND.length - 2];
const todayGoa = PURCHASE_TREND[PURCHASE_TREND.length - 1];

export function ExecutiveDashboard({ onNavigateTab }: DashboardProps) {
  const [activeTableTab, setActiveTableTab] = useState<'PROPIAS' | 'COLABORADORAS' | 'TODAS'>('TODAS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPeriod, setModalPeriod] = useState<PeriodType>('1d');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [weeklyTableFilter, setWeeklyTableFilter] = useState<'ALL' | 'PROPIA' | 'COLABORADORA'>('ALL');

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

  // Datos del período seleccionado para el modal comparativo
  const currentPeriodData = PRODUCTS_BY_PERIOD[modalPeriod];
  const filteredModalProducts = selectedProductFilter === 'ALL'
    ? currentPeriodData.products
    : currentPeriodData.products.filter((p) => p.code === selectedProductFilter);

  // Cálculos globales para el período seleccionado
  const globalAvgBuy = Number(
    (currentPeriodData.products.reduce((acc, p) => acc + p.buyPrice, 0) / currentPeriodData.products.length).toFixed(3)
  );
  const globalAvgSale = Number(
    (currentPeriodData.products.reduce((acc, p) => acc + p.salePrice, 0) / currentPeriodData.products.length).toFixed(3)
  );
  const globalAvgMargin = Number((globalAvgSale - globalAvgBuy).toFixed(3));
  const globalMarginPct = Number(((globalAvgMargin / globalAvgSale) * 100).toFixed(2));

  // Filtrado de la tabla semanal
  const filteredWeeklyStations = weeklyTableFilter === 'ALL'
    ? WEEKLY_TOP_STATIONS_PROFIT
    : WEEKLY_TOP_STATIONS_PROFIT.filter((st) => st.type === weeklyTableFilter);

  const maxWeeklyGain = Math.max(...WEEKLY_TOP_STATIONS_PROFIT.map((s) => s.weeklyGain));

  return (
    <div className="space-y-8">
      {/* 1. Banner Principal */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <BarChart3 className="h-4 w-4" />
              <span>Panel de Control Ejecutivo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dashboard — EFI DATA OIL
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Monitoreo integral de compras, ventas, márgenes por producto y rentabilidad semanal por estación.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs hover:brightness-110 transition-all shadow-lg shadow-amber-500/20"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Comparativa Compras vs Ventas (1d, 7d, 1m, 1a)</span>
          </button>
        </div>
      </div>

      {/* 2. 4 KPIs Superiores (Hacen clic y abren el Modal Comparativo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Precio Compra GOA */}
        <div
          onClick={() => {
            setModalPeriod('1d');
            setSelectedProductFilter('GOA');
            setIsModalOpen(true);
          }}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-xl cursor-pointer group transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
              <Fuel className="h-5 w-5" />
            </div>
            <span className="flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingDown className="h-3 w-3" />
              <span>-0.004 €</span>
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">Precio Compra GOA (Hoy)</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-0.5">
              {todayGoa.toFixed(3)} <span className="text-xs text-slate-400 font-mono">€/L</span>
            </p>
            <p className="text-[11px] text-amber-400/90 font-medium mt-1 flex items-center space-x-1">
              <span>Ayer: {prevGoa.toFixed(3)} €</span>
              <span className="text-slate-600">&bull;</span>
              <span className="underline group-hover:text-amber-300">Ver comparativa</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Margen Medio Global */}
        <div
          onClick={() => {
            setModalPeriod('7d');
            setSelectedProductFilter('ALL');
            setIsModalOpen(true);
          }}
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
              +{avgMargin.toFixed(3)} <span className="text-xs text-slate-400 font-mono">€/L</span>
            </p>
            <p className="text-[11px] text-emerald-400/90 font-medium mt-1 flex items-center space-x-1">
              <span>P. Venta medio: {(avgGoa + avgMargin).toFixed(3)} €</span>
              <span className="text-slate-600">&bull;</span>
              <span className="underline group-hover:text-emerald-300">Ver comparativa</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Estaciones Propias */}
        <div
          onClick={() => {
            setModalPeriod('1m');
            setSelectedProductFilter('ALL');
            setIsModalOpen(true);
          }}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 shadow-xl cursor-pointer group transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-[10px] bg-blue-500/10 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
              19 EESS Propias
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">Red Propia Activa</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-0.5">
              19 <span className="text-xs text-slate-400">Estaciones</span>
            </p>
            <p className="text-[11px] text-blue-400/90 font-medium mt-1 flex items-center space-x-1">
              <span>Postes sincronizados</span>
              <span className="text-slate-600">&bull;</span>
              <span className="underline group-hover:text-blue-300">Ver análisis</span>
            </p>
          </div>
        </div>

        {/* KPI 4: Colaboradoras Fijas y Totales */}
        <div
          onClick={() => {
            setModalPeriod('1y');
            setSelectedProductFilter('ALL');
            setIsModalOpen(true);
          }}
          className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 shadow-xl cursor-pointer group transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-[10px] bg-purple-500/10 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/20">
              11 Fijas / 33 Red
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">Estaciones Colaboradoras (EFI)</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-0.5">
              33 <span className="text-xs text-slate-400">EESS EFI</span>
            </p>
            <p className="text-[11px] text-purple-400/90 font-medium mt-1 flex items-center space-x-1">
              <span>Benavente, Irun, etc.</span>
              <span className="text-slate-600">&bull;</span>
              <span className="underline group-hover:text-purple-300">Ver análisis</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Cuadro Semanal: Estaciones con Mayor Ganancia Promedio (Requisito clave del usuario) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-950 px-6 py-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-lg tracking-tight">
                  Ranking Semanal de Rentabilidad por Estación
                </h3>
                <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                  Semana Actual
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ganancia promedio semanal calculada según combustible comprado, precio diario indicado y frecuencia de compra.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setWeeklyTableFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  weeklyTableFilter === 'ALL' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas ({WEEKLY_TOP_STATIONS_PROFIT.length})
              </button>
              <button
                onClick={() => setWeeklyTableFilter('PROPIA')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  weeklyTableFilter === 'PROPIA' ? 'bg-blue-500 text-white font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Propias
              </button>
              <button
                onClick={() => setWeeklyTableFilter('COLABORADORA')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  weeklyTableFilter === 'COLABORADORA' ? 'bg-purple-500 text-white font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Colaboradoras
              </button>
            </div>

            <button
              onClick={() => {
                setModalPeriod('7d');
                setIsModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all inline-flex items-center space-x-1 border border-slate-700"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-amber-400" />
              <span>Ver Comparativa 7d</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3.5 px-4 text-center w-14">Rank</th>
                <th className="py-3.5 px-4">Estación</th>
                <th className="py-3.5 px-3">Tipo Red</th>
                <th className="py-3.5 px-4">Combustible Comprado</th>
                <th className="py-3.5 px-4 text-amber-300">P. Compra Diario Prom.</th>
                <th className="py-3.5 px-4 text-blue-300">P. Venta Diario Prom.</th>
                <th className="py-3.5 px-4 text-emerald-400">Margen Promedio</th>
                <th className="py-3.5 px-4">Frecuencia de Compra</th>
                <th className="py-3.5 px-5 text-right text-emerald-300">Ganancia Prom. Semanal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              {filteredWeeklyStations.map((st) => {
                const pct = (st.weeklyGain / maxWeeklyGain) * 100;
                return (
                  <tr key={`${st.station}_${st.fuelCode}`} className="hover:bg-slate-800/40 transition-colors">
                    {/* 1. Posición */}
                    <td className="py-3 px-4 text-center font-mono">
                      <span
                        className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-black shadow-sm ${
                          st.rank === 1
                            ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/50'
                            : st.rank === 2
                            ? 'bg-slate-300 text-slate-950 ring-2 ring-slate-300/50'
                            : st.rank === 3
                            ? 'bg-amber-700 text-white ring-2 ring-amber-700/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {st.rank}º
                      </span>
                    </td>

                    {/* 2. Estación */}
                    <td className="py-3 px-4 font-bold text-white text-sm">
                      {st.station}
                    </td>

                    {/* 3. Tipo */}
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider inline-flex items-center space-x-1 ${
                          st.type === 'PROPIA'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {st.type === 'PROPIA' ? <Building2 className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                        <span>{st.type}</span>
                      </span>
                    </td>

                    {/* 4. Combustible Comprado */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-300 inline-flex items-center space-x-1.5">
                        {st.fuelCode === 'GOA' && <Fuel className="h-3.5 w-3.5 text-amber-400" />}
                        {st.fuelCode === 'GASOLINA' && <Zap className="h-3.5 w-3.5 text-blue-400" />}
                        {st.fuelCode === 'ADBLUE' && <Droplet className="h-3.5 w-3.5 text-cyan-400" />}
                        {st.fuelCode === 'HVO' && <Flame className="h-3.5 w-3.5 text-emerald-400" />}
                        {st.fuelCode === 'GOB' && <Fuel className="h-3.5 w-3.5 text-orange-400" />}
                        <span>{st.fuelType}</span>
                      </span>
                    </td>

                    {/* 5. Precio Compra Diario Indicado Promedio (3 decimales) */}
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">
                      {st.dailyBuyPrice.toFixed(3)} €/L
                    </td>

                    {/* 6. Precio Venta Diario Indicado Promedio (3 decimales) */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-300">
                      {st.dailySalePrice.toFixed(3)} €/L
                    </td>

                    {/* 7. Margen Promedio (3 decimales) */}
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      +{st.avgMargin.toFixed(3)} €/L
                    </td>

                    {/* 8. Frecuencia de Compra */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] font-bold">
                        <Clock className="h-3 w-3 text-amber-400" />
                        <span>{st.purchaseFrequency}</span>
                      </span>
                    </td>

                    {/* 9. Ganancia Promedio Semanal */}
                    <td className="py-3 px-5 text-right">
                      <div className="flex flex-col items-end space-y-1">
                        <span className="font-mono font-black text-emerald-300 text-sm">
                          +{st.weeklyGain.toLocaleString()} €
                        </span>
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              st.rank === 1
                                ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Gráfico Evolución + Top 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras GOA */}
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
                  <span className="text-[10px] font-mono text-slate-400">{v.toFixed(3)}</span>
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
            <span>Mínimo: <strong className="text-emerald-400">{Math.min(...PURCHASE_TREND).toFixed(3)} €/L</strong></span>
            <span>Media: <strong className="text-amber-400">{(PURCHASE_TREND.reduce((a, b) => a + b, 0) / PURCHASE_TREND.length).toFixed(3)} €/L</strong></span>
            <span>Máximo: <strong className="text-rose-400">{Math.max(...PURCHASE_TREND).toFixed(3)} €/L</strong></span>
          </div>
        </div>

        {/* Resumen de Rentabilidad Rápida */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <Target className="h-5 w-5 text-emerald-400" />
                <span>Podio Semanal</span>
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                Top 3
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Estaciones líderes en generación de beneficio neto de la semana:</p>

            <div className="space-y-3.5">
              {WEEKLY_TOP_STATIONS_PROFIT.slice(0, 3).map((st, i) => {
                return (
                  <div key={st.station} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            i === 0
                              ? 'bg-amber-400 text-slate-950'
                              : i === 1
                              ? 'bg-slate-300 text-slate-950'
                              : 'bg-amber-700 text-white'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="font-bold text-white">{st.station}</span>
                        <span className="text-[9px] text-slate-500 font-mono">({st.type.charAt(0)})</span>
                      </div>
                      <span className="text-emerald-400 font-bold font-mono">+{st.weeklyGain.toLocaleString()} €</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{st.fuelType}</span>
                      <span>Margen: +{st.avgMargin.toFixed(3)} €/L</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => {
              setModalPeriod('7d');
              setIsModalOpen(true);
            }}
            className="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all text-center flex items-center justify-center space-x-1.5 border border-slate-700"
          >
            <span>Abrir desglose completo</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 5. Tabla Completa de Precios Actuales por Estación (3 decimales) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Precios Actuales por Estación</h3>
              <p className="text-xs text-slate-400">Vista unificada de toda la red con redondeo a 3 decimales</p>
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
                  <td className="py-3 px-4 font-mono text-amber-300 font-bold">{row.goa.toFixed(3)} €</td>
                  <td className="py-3 px-4 font-mono text-amber-400 font-bold">{row.premium.toFixed(3)} €</td>
                  <td className="py-3 px-4 font-mono text-blue-300">{row.gasolina.toFixed(3)} €</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">+{row.margin.toFixed(3)} €</td>
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

      {/* 6. MODAL INTERACTIVO: Comparativa de Precios de Compra vs Venta por Producto y Período */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <ArrowLeftRight className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white tracking-tight">
                    Comparativa: Precios de Compra vs Precios de Venta
                  </h3>
                  <p className="text-xs text-slate-400">
                    Análisis comparativo de todos los productos en períodos de 1 día, 7 días, 1 mes y 1 año (3 decimales)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Selector de Períodos solicitado: 1 día, 7 días, 1 mes, 1 año */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Seleccione Período de Análisis:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
                  {(['1d', '7d', '1m', '1y'] as PeriodType[]).map((periodKey) => {
                    const isSelected = modalPeriod === periodKey;
                    return (
                      <button
                        key={periodKey}
                        onClick={() => setModalPeriod(periodKey)}
                        className={`py-2.5 px-3 rounded-xl transition-all flex flex-col items-center justify-center space-y-0.5 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-400'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <span className="text-sm font-extrabold">{PRODUCTS_BY_PERIOD[periodKey].periodName}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-slate-950/80' : 'text-slate-500'}`}>
                          {PRODUCTS_BY_PERIOD[periodKey].sublabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tarjetas de Resumen Global del Período */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">P. Compra Medio Global</span>
                  <span className="text-xl font-extrabold text-amber-300 font-mono mt-1 block">
                    {globalAvgBuy.toFixed(3)} €/L
                  </span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">P. Venta Medio Global</span>
                  <span className="text-xl font-extrabold text-blue-300 font-mono mt-1 block">
                    {globalAvgSale.toFixed(3)} €/L
                  </span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Margen Promedio Global</span>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono mt-1 block">
                    +{globalAvgMargin.toFixed(3)} €/L
                  </span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">% Rentabilidad Global</span>
                  <span className="text-xl font-extrabold text-purple-300 font-mono mt-1 block">
                    {globalMarginPct.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Filtro Rápido por Producto */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Productos Manejados ({currentPeriodData.products.length}):
                </span>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold gap-1">
                  <button
                    onClick={() => setSelectedProductFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedProductFilter === 'ALL'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  {currentPeriodData.products.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => setSelectedProductFilter(p.code)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        selectedProductFilter === p.code
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabla Comparativa de Productos en el Período */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4 text-amber-300">P. Compra (€/L)</th>
                        <th className="py-3 px-4 text-blue-300">P. Venta (€/L)</th>
                        <th className="py-3 px-4 text-emerald-400">Margen (€/L)</th>
                        <th className="py-3 px-4 text-purple-300">% Rentabilidad</th>
                        <th className="py-3 px-4 text-slate-300">Var. Compra Período</th>
                        <th className="py-3 px-4 text-right">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
                      {filteredModalProducts.map((p) => {
                        const margin = Number((p.salePrice - p.buyPrice).toFixed(3));
                        const marginPct = Number(((margin / p.salePrice) * 100).toFixed(2));
                        const deltaBuy = Number((p.buyPrice - p.prevBuyPrice).toFixed(3));
                        const isBuyPositive = deltaBuy <= 0; // bajada de costo es favorable
                        const IconComp = p.icon;

                        return (
                          <tr key={p.code} className="hover:bg-slate-900/50 transition-colors">
                            {/* Producto */}
                            <td className="py-3.5 px-4 font-bold text-white">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center space-x-2 border ${p.badge}`}>
                                <IconComp className="h-4 w-4" />
                                <span>{p.name}</span>
                              </span>
                            </td>

                            {/* P. Compra (3 decimales) */}
                            <td className="py-3.5 px-4 font-mono font-bold text-amber-300 text-sm">
                              {p.buyPrice.toFixed(3)} €
                            </td>

                            {/* P. Venta (3 decimales) */}
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-300 text-sm">
                              {p.salePrice.toFixed(3)} €
                            </td>

                            {/* Margen (3 decimales) */}
                            <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                              +{margin.toFixed(3)} €
                            </td>

                            {/* % Rentabilidad */}
                            <td className="py-3.5 px-4 font-mono font-bold text-purple-300">
                              {marginPct.toFixed(2)}%
                            </td>

                            {/* Variación Compra vs período anterior */}
                            <td className="py-3.5 px-4 font-mono">
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isBuyPositive
                                    ? 'text-emerald-400 bg-emerald-500/10'
                                    : 'text-rose-400 bg-rose-500/10'
                                }`}
                              >
                                {isBuyPositive ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                                <span>{deltaBuy > 0 ? `+${deltaBuy.toFixed(3)}` : deltaBuy.toFixed(3)} €/L</span>
                              </span>
                            </td>

                            {/* Tendencia */}
                            <td className="py-3.5 px-4 text-right font-mono">
                              <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                                {isBuyPositive ? 'Favorable / Ahorro' : 'Alza Moderada'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Nota Explicativa */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-slate-300 flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-amber-300 block font-bold">Regla de precisión decimal aplicada:</strong>
                  <p>
                    Todos los precios de compras, ventas y márgenes unitarios conservan estrictamente tres dígitos a la derecha de la coma o punto con redondeo estándar (ej. 1.197 €/L), garantizando coherencia absoluta con los costes de aprovisionamiento de refinería y postes.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Período visualizado: <strong className="text-white">{currentPeriodData.label}</strong>
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Cerrar Comparativa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
