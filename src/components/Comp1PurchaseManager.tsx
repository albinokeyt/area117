'use client';

import React, { useState, useEffect } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS } from '@/lib/dataSeed';
import {
  Save, ArrowRightLeft, Sparkles, Building2, Store, FileText,
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, X, Check, Eye,
  ShieldCheck, Droplet, Fuel, Flame, Layers, Download, RefreshCw, Star
} from 'lucide-react';

interface Comp1Props {
  selectedDate: string;
}

// 13 Colaboradoras Fijas (Columna J) para el 2do Cuadro
const FIXED_COLLABORATOR_NAMES = [
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

// Tarifas Especiales del cuadro B50:F82 de la hoja de cálculo inicial
interface SpecialTariffRow {
  id: string;
  name: string;
  scope: string;
  product: string;
  basePrice: string;
  adjustment: string;
  salePrice: string;
}

const DEFAULT_SPECIAL_TARIFFS_B50_F82: SpecialTariffRow[] = [
  { id: 'esp_completo', name: 'ESPECIAL COMPLETO', scope: 'Red General', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0150', salePrice: '1.2500' },
  { id: 'amaexo', name: 'AMAEXO', scope: 'Extremadura / Centro', product: 'Gasóleo A', basePrice: '1.2280', adjustment: '0.0120', salePrice: '1.2400' },
  { id: 'noriega', name: 'NORIEGA', scope: 'Zona Sur / Córdoba', product: 'Gasóleo A', basePrice: '1.2300', adjustment: '0.0140', salePrice: '1.2440' },
  { id: 'e100', name: 'E100', scope: 'Internacional Flotas', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0180', salePrice: '1.2530' },
  { id: 'tarifa_eco', name: 'TARIFA ECO', scope: 'Red Propia Eco', product: 'Gasóleo A', basePrice: '1.2250', adjustment: '0.0100', salePrice: '1.2350' },
  { id: 'dorado', name: 'DORADO', scope: 'Castilla / Madrid', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0160', salePrice: '1.2510' },
  { id: 'hiqi', name: 'HIQI', scope: 'Cataluña / Levante', product: 'Gasóleo A', basePrice: '1.2290', adjustment: '0.0130', salePrice: '1.2420' },
  { id: 'norpetrol_24', name: 'NORPETROL 24', scope: 'Norte / Álava', product: 'Gasóleo A', basePrice: '1.1950', adjustment: '0.0120', salePrice: '1.2070' },
  { id: 'ror', name: 'ROR', scope: 'Internacional / ROR', product: 'Gasóleo A', basePrice: '1.2320', adjustment: '0.0150', salePrice: '1.2470' },
  { id: 'tarjetera', name: 'TARJETERA', scope: 'Convenio Tarjetas', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0200', salePrice: '1.2550' },
  { id: 'tax_moving_24', name: 'TAX MOVING 24', scope: 'Flotas Urbanas', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0140', salePrice: '1.2490' },
  { id: 'tortuga', name: 'TORTUGA', scope: 'Rutas Pesadas', product: 'Gasóleo A', basePrice: '1.2280', adjustment: '0.0150', salePrice: '1.2430' },
  { id: 'tarifa_15', name: 'TARIFA 15', scope: 'Zona Sur / Humilladero', product: 'Gasóleo A', basePrice: '1.2300', adjustment: '0.0115', salePrice: '1.2415' },
  { id: 'tarifa_27', name: 'TARIFA 27', scope: 'Zona Sur / Benamejí', product: 'Gasóleo A', basePrice: '1.2300', adjustment: '0.0127', salePrice: '1.2427' },
  { id: 'exoil', name: 'EXOIL', scope: 'Manises / Levante', product: 'Gasóleo A', basePrice: '1.2290', adjustment: '0.0110', salePrice: '1.2400' },
  { id: 'norpetrol', name: 'NORPETROL', scope: 'Bilbao / Miranda', product: 'Gasóleo A', basePrice: '1.1950', adjustment: '0.0110', salePrice: '1.2060' },
  { id: 'los_javi', name: 'LOS JAVI', scope: 'Flota Los Javi', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0116', salePrice: '1.2466' },
  { id: 'carreras', name: 'CARRERAS', scope: 'Logística Carreras', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0116', salePrice: '1.2466' },
  { id: 'transfrired', name: 'TRANSFRIRED', scope: 'Frigoríficos Transfrired', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0116', salePrice: '1.2466' },
  { id: 'benito', name: 'BENITO', scope: 'Transportes Benito', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0120', salePrice: '1.2470' },
  { id: 'c0_general', name: 'C-0 GENERAL', scope: 'Convenio Marco C-0', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0116', salePrice: '1.2466' },
  { id: 'esteban', name: 'ESTEBAN', scope: 'Flota Esteban', product: 'Gasóleo A', basePrice: '1.2320', adjustment: '0.0132', salePrice: '1.2452' },
  { id: 'miki_90', name: 'MIKI 90', scope: 'Flota 90 Miki', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0198', salePrice: '1.2548' },
  { id: 'ecotrans', name: 'ECOTRANS', scope: 'ECOTRANS Nacional', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0158', salePrice: '1.2508' },
  { id: 'tarifa_30', name: 'TARIFA 30', scope: 'Red Descuento 30', product: 'Gasóleo A', basePrice: '1.2350', adjustment: '0.0138', salePrice: '1.2488' },
  { id: 't18_pista_silla', name: 'T18 - PISTA DE SILLA', scope: 'Pista de Silla', product: 'Gasóleo A', basePrice: '1.2290', adjustment: '0.0126', salePrice: '1.2416' },
  { id: 't36_pista_silla', name: 'T36 - PISTA DE SILLA', scope: 'Pista de Silla', product: 'Gasóleo A', basePrice: '1.2290', adjustment: '0.0144', salePrice: '1.2434' },
  { id: 't60_pista_silla', name: 'T60 - PISTA DE SILLA', scope: 'Pista de Silla', product: 'Gasóleo A', basePrice: '1.2290', adjustment: '0.0170', salePrice: '1.2460' },
];

type ProductSubTab = 'GOA' | 'GASOLINA' | 'ADBLUE' | 'SPECIAL' | 'ALL';

interface PurchaseRowValues {
  prev: string;
  curr: string;
  clh: string;
  porte: string;
  pase: string;
  fin: string;
  sale: string;
  isCustomSale?: boolean;
}

export function Comp1PurchaseManager({ selectedDate }: Comp1Props) {
  const [activeProductTab, setActiveProductTab] = useState<ProductSubTab>('GOA');

  // Separación en 3 Bloques Estructurales
  const propiasStations = PROPIAS_STATIONS;
  const fixedCollaborators = COLABORADORA_STATIONS.filter((st) =>
    FIXED_COLLABORATOR_NAMES.some((fname) => st.name.toUpperCase().includes(fname.toUpperCase()))
  );
  const remainingCollaborators = COLABORADORA_STATIONS.filter(
    (st) => !FIXED_COLLABORATOR_NAMES.some((fname) => st.name.toUpperCase().includes(fname.toUpperCase()))
  );

  const parseNum = (val: string | number | undefined): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = val.toString().replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const formatNum = (num: number, decimals: number = 4): string => {
    return num.toFixed(decimals);
  };

  // Helper para obtener productos filtrados por sub-ventana
  const getFilteredProductsForStation = (stationName: string) => {
    const allForStation: { code: string; name: string }[] = [
      { code: 'GOA', name: 'Gasóleo A (GOA)' },
      { code: 'GASOLINA', name: 'Gasolina 95' },
    ];
    if (ADBLUE_STATIONS_CONFIG[stationName]) {
      allForStation.push({ code: 'ADBLUE', name: 'AdBlue' });
    }

    if (activeProductTab === 'ALL') {
      return allForStation;
    }
    return allForStation.filter((p) => p.code === activeProductTab);
  };

  // Inicialización de datos con persistencia
  const [purchases, setPurchases] = useState<Record<string, PurchaseRowValues>>(() => {
    const initial: Record<string, PurchaseRowValues> = {};
    
    [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS].forEach((st) => {
      const costs = STATION_EXCEL_COSTS[st.name] || {
        porte: 0.0050,
        pase: 0.0100,
        fin: 0.0100,
        defaultPrev: 1.2000,
        defaultCurr: 1.2000,
        clhName: 'TORREJON',
      };

      const goaPrev = costs.defaultPrev;
      const goaCurr = costs.defaultCurr;
      const totalCostGoa = Number((goaCurr + costs.porte + costs.pase + costs.fin).toFixed(4));

      const gasPrev = costs.defaultPrev + 0.1200;
      const gasCurr = costs.defaultCurr + 0.1200;
      const totalCostGas = Number((gasCurr + costs.porte + costs.pase + costs.fin).toFixed(4));

      // GOA (Por defecto sale = totalCost)
      initial[`${st.name}_GOA`] = {
        prev: formatNum(goaPrev),
        curr: formatNum(goaCurr),
        clh: costs.clhName || 'TORREJON',
        porte: formatNum(costs.porte),
        pase: formatNum(costs.pase),
        fin: formatNum(costs.fin),
        sale: formatNum(totalCostGoa),
        isCustomSale: false,
      };

      // GASOLINA 95 (Por defecto sale = totalCost)
      initial[`${st.name}_GASOLINA`] = {
        prev: formatNum(gasPrev),
        curr: formatNum(gasCurr),
        clh: costs.clhName || 'TORREJON',
        porte: formatNum(costs.porte),
        pase: formatNum(costs.pase),
        fin: formatNum(costs.fin),
        sale: formatNum(totalCostGas),
        isCustomSale: false,
      };

      // ADBLUE (Solo para las estaciones del recuadro H62:K73)
      if (ADBLUE_STATIONS_CONFIG[st.name]) {
        const adblueData = ADBLUE_STATIONS_CONFIG[st.name];
        initial[`${st.name}_ADBLUE`] = {
          prev: formatNum(adblueData.defaultBuy),
          curr: formatNum(adblueData.defaultBuy),
          clh: '-',
          porte: '0.0000',
          pase: '0.0000',
          fin: '0.0000',
          sale: formatNum(adblueData.defaultSale),
          isCustomSale: true,
        };
      }
    });
    return initial;
  });

  // Estado de Tarifas Especiales B50:F82
  const [specialTariffs, setSpecialTariffs] = useState<SpecialTariffRow[]>(DEFAULT_SPECIAL_TARIFFS_B50_F82);

  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cargar datos previos de localStorage al montar
  useEffect(() => {
    try {
      const savedDate = localStorage.getItem(`efi_purchases_${selectedDate}`);
      const savedGlobal = localStorage.getItem('efi_compras_data');
      const savedSpecial = localStorage.getItem('efi_special_tariffs_b50_f82');

      if (savedDate) {
        const parsed = JSON.parse(savedDate);
        if (parsed.data) setPurchases(parsed.data);
        if (parsed.modified) setModifiedKeys(new Set(parsed.modified));
      } else if (savedGlobal) {
        const parsed = JSON.parse(savedGlobal);
        if (parsed.data) setPurchases(parsed.data);
        if (parsed.modified) setModifiedKeys(new Set(parsed.modified));
      }

      if (savedSpecial) {
        setSpecialTariffs(JSON.parse(savedSpecial));
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedDate]);

  // Manejador de cambios con auto-guardado en localStorage y actualización de fórmulas
  const handleInputChange = (
    stationName: string,
    prodCode: string,
    field: keyof PurchaseRowValues,
    rawVal: string
  ) => {
    const key = `${stationName}_${prodCode}`;
    const fieldKey = `${key}_${field}`;

    setPurchases((prev) => {
      const currentItem = prev[key] || {
        prev: '0',
        curr: '0',
        clh: 'TORREJON',
        porte: '0',
        pase: '0',
        fin: '0',
        sale: '0',
        isCustomSale: false,
      };

      const updated = { ...currentItem, [field]: rawVal };

      // Si el usuario modifica manualmente el campo de venta sugerido
      if (field === 'sale') {
        updated.isCustomSale = true;
      }

      // Si el usuario cambia curr, porte, pase o fin, y NO tiene sale personalizado, sincronizar sale = totalCost
      if (['curr', 'porte', 'pase', 'fin'].includes(field)) {
        const currN = parseNum(field === 'curr' ? rawVal : updated.curr);
        const porteN = parseNum(field === 'porte' ? rawVal : updated.porte);
        const paseN = parseNum(field === 'pase' ? rawVal : updated.pase);
        const finN = parseNum(field === 'fin' ? rawVal : updated.fin);
        const newTotalCost = Number((currN + porteN + paseN + finN).toFixed(4));

        if (!updated.isCustomSale && prodCode !== 'ADBLUE') {
          updated.sale = formatNum(newTotalCost);
        }
      }

      const nextPurchases = { ...prev, [key]: updated };

      // Auto-guardado en localStorage para persistencia al cambiar de ventana
      try {
        localStorage.setItem(`efi_purchases_${selectedDate}`, JSON.stringify({
          data: nextPurchases,
          modified: Array.from(new Set(modifiedKeys).add(fieldKey)),
          updatedAt: new Date().toISOString(),
        }));
        localStorage.setItem('efi_compras_data', JSON.stringify({
          data: nextPurchases,
          modified: Array.from(new Set(modifiedKeys).add(fieldKey)),
          updatedAt: new Date().toISOString(),
        }));
      } catch (e) {}

      return nextPurchases;
    });

    setModifiedKeys((prev) => new Set(prev).add(fieldKey));
    setIsSaved(false);
  };

  // Manejador para Tarifas Especiales B50:F82
  const handleSpecialTariffChange = (id: string, field: keyof SpecialTariffRow, rawVal: string) => {
    const fieldKey = `special_${id}_${field}`;
    setSpecialTariffs((prev) => {
      const next = prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: rawVal };

        if (field === 'basePrice' || field === 'adjustment') {
          const bNum = parseNum(field === 'basePrice' ? rawVal : updated.basePrice);
          const adjNum = parseNum(field === 'adjustment' ? rawVal : updated.adjustment);
          updated.salePrice = formatNum(bNum + adjNum);
        }
        return updated;
      });

      try {
        localStorage.setItem('efi_special_tariffs_b50_f82', JSON.stringify(next));
      } catch (e) {}

      return next;
    });

    setModifiedKeys((prev) => new Set(prev).add(fieldKey));
  };

  // Guardar explícito
  const handleSave = () => {
    try {
      localStorage.setItem(`efi_purchases_${selectedDate}`, JSON.stringify({
        data: purchases,
        modified: Array.from(modifiedKeys),
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem('efi_compras_data', JSON.stringify({
        data: purchases,
        modified: Array.from(modifiedKeys),
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem('efi_special_tariffs_b50_f82', JSON.stringify(specialTariffs));
    } catch (e) {}

    setIsSaved(true);
    setToastMessage('¡Precios de Compras y Tarifas Guardados Correctamente!');
    setTimeout(() => {
      setIsSaved(false);
      setToastMessage(null);
    }, 3500);
  };

  // CIERRE DE DÍA: Copiar P. Venta Sugerido a Precio Anterior
  const handleCierreDeDia = () => {
    setPurchases((prev) => {
      const nextPurchases: Record<string, PurchaseRowValues> = {};
      Object.entries(prev).forEach(([key, item]) => {
        nextPurchases[key] = {
          ...item,
          prev: item.sale, // Copiar precio de venta a precio anterior
        };
      });

      try {
        localStorage.setItem(`efi_purchases_${selectedDate}`, JSON.stringify({
          data: nextPurchases,
          modified: [],
          updatedAt: new Date().toISOString(),
        }));
        localStorage.setItem('efi_compras_data', JSON.stringify({
          data: nextPurchases,
          modified: [],
          updatedAt: new Date().toISOString(),
        }));
      } catch (e) {}

      return nextPurchases;
    });

    setModifiedKeys(new Set());
    setToastMessage('Cierre de Día Completado: P. Venta copiado a Precio Anterior');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // DESCARGAR RESUMEN DIARIO EN EXCEL
  const handleExportDailyExcel = () => {
    let csv = 'ESTACION;TIPO;PRODUCTO;PRECIO ANTERIOR (EUR);PRECIO COMPRA HOY (EUR);CLH (TERMINAL);PORTE (R);PASE (S);FINANCIACION (T);COSTO TOTAL (EUR);P. VENTA SUGERIDO (EUR);MARGEN (EUR)\\n';

    const exportSection = (stationList: typeof propiasStations, typeLabel: string) => {
      stationList.forEach((st) => {
        const prods = [
          { code: 'GOA', name: 'Gasóleo A (GOA)' },
          { code: 'GASOLINA', name: 'Gasolina 95' },
        ];
        if (ADBLUE_STATIONS_CONFIG[st.name]) {
          prods.push({ code: 'ADBLUE', name: 'AdBlue' });
        }

        prods.forEach((prod) => {
          const key = `${st.name}_${prod.code}`;
          const item = purchases[key] || {
            prev: '0', curr: '0', clh: 'TORREJON', porte: '0', pase: '0', fin: '0', sale: '0'
          };
          const currNum = parseNum(item.curr);
          const porteNum = parseNum(item.porte);
          const paseNum = parseNum(item.pase);
          const finNum = parseNum(item.fin);
          const saleNum = parseNum(item.sale);
          const totalCost = Number((currNum + porteNum + paseNum + finNum).toFixed(4));
          const margin = Number((saleNum - totalCost).toFixed(4));
          const clhName = STATION_EXCEL_COSTS[st.name]?.clhName || item.clh || 'TORREJON';

          csv += `${st.name};${typeLabel};${prod.name};${item.prev.replace('.', ',')};${item.curr.replace('.', ',')};${clhName};${item.porte.replace('.', ',')};${item.pase.replace('.', ',')};${item.fin.replace('.', ',')};${totalCost.toFixed(4).replace('.', ',')};${saleNum.toFixed(4).replace('.', ',')};${margin.toFixed(4).replace('.', ',')}\\n`;
        });
      });
    };

    exportSection(propiasStations, 'PROPIA');
    exportSection(fixedCollaborators, 'COLABORADORA FIJA');
    exportSection(remainingCollaborators, 'COLABORADORA RESTANTE');

    // Tarifas Especiales
    csv += '\\nTARIFAS ESPECIALES (B50:F82);;;;;;;;;;;\\n';
    csv += 'TARIFA / CLIENTE;AMBITO;PRODUCTO;PRECIO BASE (EUR);AJUSTE (EUR);;;;PRECIO FINAL (EUR);;\\n';
    specialTariffs.forEach((row) => {
      csv += `${row.name};${row.scope};${row.product};${row.basePrice.replace('.', ',')};${row.adjustment.replace('.', ',')};;;;${row.salePrice.replace('.', ',')};;\\n`;
    });

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `EFI_COMPRAS_DIARIO_${selectedDate}.csv`;
    link.click();

    setToastMessage(`Descargando archivo Excel: EFI_COMPRAS_DIARIO_${selectedDate}.csv`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Renderizador de Tabla de Estaciones (Zero Inputs en CLH, Resaltado Amarillo en Celdas Modificadas)
  const renderStationTable = (
    title: string,
    subtitle: string,
    icon: React.ElementType,
    stations: typeof propiasStations,
    themeColor: 'blue' | 'orange' | 'purple'
  ) => {
    const Icon = icon;
    const filteredStationsForAdBlue = activeProductTab === 'ADBLUE'
      ? stations.filter((st) => ADBLUE_STATIONS_CONFIG[st.name])
      : stations;

    if (filteredStationsForAdBlue.length === 0) {
      return null;
    }

    const themeStyles = {
      blue: {
        border: 'border-blue-500/30',
        badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        stationBg: 'bg-blue-950/40 text-blue-200 border-l-4 border-l-blue-500',
      },
      orange: {
        border: 'border-orange-500/30',
        badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        stationBg: 'bg-orange-950/40 text-orange-200 border-l-4 border-l-orange-500',
      },
      purple: {
        border: 'border-purple-500/30',
        badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        stationBg: 'bg-purple-950/40 text-purple-200 border-l-4 border-l-purple-500',
      },
    }[themeColor];

    return (
      <div className={`bg-slate-900 border ${themeStyles.border} rounded-3xl overflow-hidden shadow-2xl space-y-0`}>
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${themeStyles.badge}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
                <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                  {filteredStationsForAdBlue.length} Estaciones
                </span>
              </div>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center space-x-1.5 bg-amber-400/15 text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full font-bold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Amarillo = Dato Modificado Hoy</span>
            </span>
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
                <th className="py-3.5 px-3 text-slate-300">CLH (Lugar Compra)</th>
                <th className="py-3.5 px-2 text-amber-300">Porte (R)</th>
                <th className="py-3.5 px-2 text-blue-300">Pase (S)</th>
                <th className="py-3.5 px-2 text-purple-300">Financ. (T)</th>
                <th className="py-3.5 px-3 text-emerald-400 bg-slate-900/60">Costo Total (€)</th>
                <th className="py-3.5 px-3 text-blue-400 bg-slate-900/80">P. Venta Sugerido (€)</th>
                <th className="py-3.5 px-3 text-emerald-400">Margen (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              {filteredStationsForAdBlue.map((st) => {
                const stationProds = getFilteredProductsForStation(st.name);
                const excelCosts = STATION_EXCEL_COSTS[st.name];

                return stationProds.map((prod, pIdx) => {
                  const key = `${st.name}_${prod.code}`;
                  const item = purchases[key] || {
                    prev: '0',
                    curr: '0',
                    clh: 'TORREJON',
                    porte: '0',
                    pase: '0',
                    fin: '0',
                    sale: '0',
                    isCustomSale: false,
                  };

                  const currNum = parseNum(item.curr);
                  const porteNum = parseNum(item.porte);
                  const paseNum = parseNum(item.pase);
                  const finNum = parseNum(item.fin);
                  const saleNum = parseNum(item.sale);

                  const totalCost = Number((currNum + porteNum + paseNum + finNum).toFixed(4));
                  const margin = Number((saleNum - totalCost).toFixed(4));

                  const isCurrMod = modifiedKeys.has(`${key}_curr`);
                  const isPrevMod = modifiedKeys.has(`${key}_prev`);
                  const isPorteMod = modifiedKeys.has(`${key}_porte`);
                  const isPaseMod = modifiedKeys.has(`${key}_pase`);
                  const isFinMod = modifiedKeys.has(`${key}_fin`);
                  const isSaleMod = modifiedKeys.has(`${key}_sale`);

                  const clhDisplayName = excelCosts?.clhName && excelCosts.clhName !== '0' && excelCosts.clhName !== 'n/a'
                    ? excelCosts.clhName
                    : 'TORREJON';

                  return (
                    <tr
                      key={key}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        pIdx === stationProds.length - 1 ? 'border-b-2 border-slate-800/80' : ''
                      }`}
                    >
                      {/* 1. Nombre de la Estación */}
                      <td
                        className={`py-2.5 px-4 font-bold sticky left-0 z-10 border-r border-slate-800 transition-colors ${themeStyles.stationBg}`}
                      >
                        {pIdx === 0 ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-sans">
                            <span className="font-extrabold tracking-tight">{st.name}</span>
                            {themeColor === 'orange' && (
                              <span className="text-[9px] bg-orange-500/25 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded-full font-black tracking-wider uppercase inline-flex items-center space-x-1 shadow-sm">
                                <ShieldCheck className="h-3 w-3 text-orange-400" />
                                <span>FIJA</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[10px] pl-2">&rdquor;</span>
                        )}
                      </td>

                      {/* 2. Producto */}
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

                      {/* 3. Precio Anterior */}
                      <td className={`py-2.5 px-3 bg-slate-900/40 ${isPrevMod ? 'bg-amber-400/20' : ''}`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.prev}
                          onChange={(e) => handleInputChange(st.name, prod.code, 'prev', e.target.value)}
                          className={`w-20 rounded px-2 py-1 text-xs font-mono transition-all focus:outline-none ${
                            isPrevMod
                              ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md font-bold'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 focus:border-amber-400'
                          }`}
                        />
                      </td>

                      {/* 4. Precio Compra Hoy (Resaltado en AMARILLO cuando se modifica) */}
                      <td className={`py-2.5 px-3 transition-all ${isCurrMod ? 'bg-amber-400/25' : 'bg-slate-900/30'}`}>
                        <div className="relative inline-flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.curr}
                            onChange={(e) => handleInputChange(st.name, prod.code, 'curr', e.target.value)}
                            placeholder="0,0000"
                            className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-black transition-all focus:outline-none ${
                              isCurrMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40'
                                : 'bg-slate-950 border border-slate-700 text-slate-200 focus:border-amber-400'
                            }`}
                          />
                          {isCurrMod && (
                            <span className="ml-2 text-[9px] bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-black px-1.5 py-0.5 rounded shadow tracking-tighter uppercase animate-in fade-in">
                              HOY
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. CLH (ÚNICAMENTE NOMBRE DEL LUGAR DE COMPRA - SIN NINGÚN CUADRO/INPUT) */}
                      <td className="py-2.5 px-3">
                        {prod.code !== 'ADBLUE' ? (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono font-semibold tracking-tight shadow-sm truncate max-w-[130px]"
                            title={`Lugar de Compra / Terminal: ${clhDisplayName}`}
                          >
                            {clhDisplayName}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs font-mono font-bold">-</span>
                        )}
                      </td>

                      {/* 6. Porte (R) */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.porte}
                          onChange={(e) => handleInputChange(st.name, prod.code, 'porte', e.target.value)}
                          className={`w-16 rounded px-1.5 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                            isPorteMod
                              ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md'
                              : 'bg-slate-950 border border-slate-800 text-amber-300 focus:border-amber-400'
                          }`}
                        />
                      </td>

                      {/* 7. Pase (S) */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.pase}
                          onChange={(e) => handleInputChange(st.name, prod.code, 'pase', e.target.value)}
                          className={`w-16 rounded px-1.5 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                            isPaseMod
                              ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md'
                              : 'bg-slate-950 border border-slate-800 text-blue-300 focus:border-amber-400'
                          }`}
                        />
                      </td>

                      {/* 8. Financiación (T) */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.fin}
                          onChange={(e) => handleInputChange(st.name, prod.code, 'fin', e.target.value)}
                          className={`w-16 rounded px-1.5 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                            isFinMod
                              ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md'
                              : 'bg-slate-950 border border-slate-800 text-purple-300 focus:border-amber-400'
                          }`}
                        />
                      </td>

                      {/* 9. Costo Total (€) */}
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 bg-slate-900/40">
                        {totalCost.toFixed(4)} €
                      </td>

                      {/* 10. P. Venta Sugerido (€) - Por defecto igual a Costo Total, editable y resaltado si se modifica */}
                      <td className={`py-2.5 px-3 bg-blue-500/5 ${isSaleMod ? 'bg-amber-400/20' : ''}`}>
                        <div className="relative inline-flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.sale}
                            onChange={(e) => handleInputChange(st.name, prod.code, 'sale', e.target.value)}
                            className={`w-24 rounded px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                              isSaleMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-400/30'
                                : 'bg-slate-950 border border-blue-500/40 text-blue-300 focus:border-blue-400'
                            }`}
                          />
                          {isSaleMod && (
                            <span className="ml-1.5 text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded shadow">
                              MOD
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 11. Margen (€) */}
                      <td
                        className={`py-2.5 px-3 font-mono font-bold text-xs ${
                          margin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {margin > 0 ? `+${margin.toFixed(4)}` : margin.toFixed(4)} €
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
      {/* 1. Barra Principal Superior */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Layers className="h-4 w-4" />
              <span>Gestión de Compras, Costes Fijos y Tarifas Especiales (B50:F82)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Compras de Combustibles y Red de Estaciones
            </h2>
            <p className="text-slate-400 text-sm">
              Cálculo automático de Costo Total = Compra + Porte (R) + Pase (S) + Financiación (T). P. Venta Sugerido sincronizado por defecto con Costo Total.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportDailyExcel}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/30 shadow-md transition-all active:scale-95"
              title="Descargar toda la información del día en archivo Excel CSV con fecha"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Descargar Resumen Diario (Excel)</span>
            </button>

            <button
              onClick={handleCierreDeDia}
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl text-xs font-bold border border-indigo-500/30 shadow-md transition-all active:scale-95"
              title="Copiar P. Venta Sugerido a Precio Anterior para cerrar el día"
            >
              <RefreshCw className="h-4 w-4 text-indigo-400" />
              <span>Cierre de Día (Copiar Venta a Anterior)</span>
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
              <span>{isSaved ? '¡Guardado con Éxito!' : 'Guardar Precios'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Selector de Sub-Ventanas de Productos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 sm:p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 pl-2">
          <Fuel className="h-4 w-4 text-amber-400" />
          <span>Filtrar Sub-Ventana:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveProductTab('GOA')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeProductTab === 'GOA'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-105'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Fuel className="h-4 w-4" />
            <span>Gasóleo A (GOA)</span>
          </button>

          <button
            onClick={() => setActiveProductTab('GASOLINA')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeProductTab === 'GASOLINA'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Fuel className="h-4 w-4" />
            <span>Gasolina 95</span>
          </button>

          <button
            onClick={() => setActiveProductTab('ADBLUE')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeProductTab === 'ADBLUE'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 scale-105'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Droplet className="h-4 w-4" />
            <span>AdBlue (10 EESS)</span>
          </button>

          <button
            onClick={() => setActiveProductTab('SPECIAL')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeProductTab === 'SPECIAL'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-105'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Star className="h-4 w-4" />
            <span>Tarifas Especiales (B50:F82)</span>
          </button>

          <button
            onClick={() => setActiveProductTab('ALL')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeProductTab === 'ALL'
                ? 'bg-slate-700 text-white shadow-lg scale-105'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Ver Todos los Productos</span>
          </button>
        </div>
      </div>

      {/* 3. Renderizado de las Tablas */}
      {activeProductTab !== 'SPECIAL' && (
        <div className="space-y-8">
          {/* CUADRO 1: ESTACIONES PROPIAS (19 EESS) */}
          {renderStationTable(
            '1. Estaciones Propias',
            'Precios de compra y costes fijos (Porte, Pase, Financiación) de las 19 estaciones propias',
            Building2,
            propiasStations,
            'blue'
          )}

          {/* CUADRO 2 (NUEVO EN SEGUNDO LUGAR): ESTACIONES COLABORADORAS FIJAS (13 EESS FIJAS) */}
          {renderStationTable(
            '2. Estaciones Colaboradoras Fijas',
            'Convenios fijos prioritarios de la red colaboradora con terminales y costes asignados',
            ShieldCheck,
            fixedCollaborators,
            'orange'
          )}

          {/* CUADRO 3: ESTACIONES COLABORADORAS RESTANTES (21 EESS) */}
          {renderStationTable(
            '3. Estaciones Colaboradoras Restantes',
            'Red complementaria de estaciones colaboradoras y depósitos de suministro',
            Store,
            remainingCollaborators,
            'purple'
          )}
        </div>
      )}

      {/* SUB-VENTANA: TARIFAS ESPECIALES (B50:F82) */}
      {(activeProductTab === 'SPECIAL' || activeProductTab === 'ALL') && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl space-y-0">
          <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-white text-base tracking-tight">
                    Tarifas Especiales de Compra y Convenios (Hoja Cálculo Inicial B50:F82)
                  </h3>
                  <span className="text-xs font-mono font-bold bg-slate-800 text-emerald-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                    {specialTariffs.length} Convenios
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Precios base, condiciones y márgenes especiales de clientes y grupos logísticos
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Fórmula: P. Venta Especial = Precio Base + Ajuste
            </div>
          </div>

          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950 z-20">
                <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                  <th className="py-3 px-4 sticky left-0 bg-slate-950 z-30">Tarifa / Convenio (B50:F82)</th>
                  <th className="py-3 px-3">Ámbito / Estación</th>
                  <th className="py-3 px-3">Producto</th>
                  <th className="py-3 px-3 text-amber-300">Precio Base (€)</th>
                  <th className="py-3 px-3 text-blue-300">Ajuste / Condición (€)</th>
                  <th className="py-3 px-3 text-emerald-400 bg-slate-900/60 font-bold">Precio Final Venta (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {specialTariffs.map((row) => {
                  const isBaseMod = modifiedKeys.has(`special_${row.id}_basePrice`);
                  const isAdjMod = modifiedKeys.has(`special_${row.id}_adjustment`);
                  const isSaleMod = modifiedKeys.has(`special_${row.id}_salePrice`);

                  return (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800 font-sans">
                        <span className="text-emerald-300">{row.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">{row.scope}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20 font-sans">
                          {row.product}
                        </span>
                      </td>
                      
                      {/* Precio Base */}
                      <td className={`py-2.5 px-3 ${isBaseMod ? 'bg-amber-400/20' : ''}`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.basePrice}
                          onChange={(e) => handleSpecialTariffChange(row.id, 'basePrice', e.target.value)}
                          className={`w-24 rounded px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                            isBaseMod
                              ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md'
                              : 'bg-slate-950 border border-slate-700 text-slate-200 focus:border-amber-400'
                          }`}
                        />
                      </td>

                      {/* Ajuste */}
                      <td className={`py-2.5 px-3 ${isAdjMod ? 'bg-amber-400/20' : ''}`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.adjustment}
                          onChange={(e) => handleSpecialTariffChange(row.id, 'adjustment', e.target.value)}
                          className={`w-24 rounded px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                            isAdjMod
                              ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md'
                              : 'bg-slate-950 border border-slate-700 text-blue-300 focus:border-blue-400'
                          }`}
                        />
                      </td>

                      {/* Precio Final Venta */}
                      <td className={`py-2.5 px-3 bg-emerald-500/5 ${isSaleMod ? 'bg-amber-400/20' : ''}`}>
                        <div className="relative inline-flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row.salePrice}
                            onChange={(e) => handleSpecialTariffChange(row.id, 'salePrice', e.target.value)}
                            className={`w-28 rounded px-2 py-1 text-xs font-mono font-black transition-all focus:outline-none ${
                              isSaleMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md'
                                : 'bg-slate-950 border border-emerald-500/40 text-emerald-400 focus:border-emerald-400'
                            }`}
                          />
                          {isSaleMod && (
                            <span className="ml-1.5 text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded shadow">
                              MOD
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
      )}

      {/* Toast de Notificaciones */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5">
          <Check className="h-5 w-5" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
