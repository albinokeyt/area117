'use client';

import React, { useState, useEffect } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS, OFFICIAL_SUGGESTED_SALE_PRICES } from '@/lib/dataSeed';
import { generateAndDownloadCierreWorkbook, GasolinaBroncoRow } from '@/lib/excelExportService';
import {
  Save, ArrowRightLeft, Sparkles, Building2, Store, FileText,
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, X, Check, Eye,
  ShieldCheck, Droplet, Fuel, Flame, Layers, Download, RefreshCw, Star, Calendar
} from 'lucide-react';

const formatToDMY = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const DEFAULT_GASOLINA_BRONCO: GasolinaBroncoRow = {
  name: 'GASOLINA BRONCO',
  sinIva: '1.397',
  conIva: '1.690',
  beneficio: '0.034',
  compra: '1.348',
  fecha: '04/09/2026',
};

interface Comp1Props {
  selectedDate: string;
}

// Colaboradoras Fijas (Columna J) para el 2do Cuadro
const FIXED_COLLABORATOR_NAMES = [
  'BENAVENTE',
  'IRUN ZAISA III',
  'AVILESINA',
  'MERIDA',
  'SAN VICENTE DEL PALACIO',
  'WATERY ARANDA',
  'PUERTO DE BARCELONA',
  'GIRONA-CALSINA',
  'FEGOBLAN PONTEVEDRA',
  'VEGA DE VALCARCE',
  'HOILA TOLEDO',
  'PETREM FIGUERES',
];

// Estaciones con AdBlue según celdas H62:K73
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

// Datos EXACTOS de la Hoja de Cálculo Inicial B50:F82 (Imagen proporcionada por el usuario)
export interface SpecialStationRateRow {
  id: string;
  name: string;
  isBlueBg?: boolean;
  isYellowPrice?: boolean;
  isRedRef?: boolean;
  actualPrice: string;
  refPrice: string;
  basePrice: string;
  isCustomActual?: boolean;
  isCustomRef?: boolean;
  isCustomBase?: boolean;
}

const DEFAULT_SPECIAL_RATES_B50_F82: SpecialStationRateRow[] = [
  { id: 'torrejon', name: 'TORREJON', isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'arcos_jalon', name: 'ARCOS JALON', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'alfajarin', name: 'ALFAJARIN', isBlueBg: true, isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'torremocha', name: 'TORREMOCHA', isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'madrid', name: 'MADRID', isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'valdemoro', name: 'VALDEMORO', isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'el_casar', name: 'EL CASAR', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'pamplona', name: 'PAMPLONA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'humilladero', name: 'HUMILLADERO', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'ucles', name: 'UCLES', isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'benameji', name: 'BENAMEJI', isBlueBg: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'soria_alcubillas', name: 'SORIA ALCUBILLAS', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'riba_roja', name: 'RIBA-ROJA', isBlueBg: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'pista_silla', name: 'PISTA DE SILLA', isBlueBg: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'real_gandia', name: 'ES REAL DE GANDIA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'chiva', name: 'ES CHIVA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'alberic', name: 'ES ALBERIC', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'catarroja', name: 'CATARROJA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'manises', name: 'MANISES - EXOIL', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'jundiz', name: 'JUNDIZ NORPETROL', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'oliveral', name: 'OLIVERAL', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'llers', name: 'LLERS', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'guarroman', name: 'GUARROMAN', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'valdepenas', name: 'VALDEPEÑAS', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'bera', name: 'BERA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'abrera', name: 'ABRERA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'la_campana', name: 'LA CAMPANA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'irun', name: 'IRUN', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'girona_calsina', name: 'GIRONA-CALSINA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'open', name: 'OPEN', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'figueres', name: 'FIGUERES', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
];

type ProductSubTab = 'GOA' | 'GASOLINA' | 'ADBLUE' | 'SPECIAL' | 'ALL';

interface PurchaseRowValues {
  prev: string;
  curr: string;
  clh: string;
  porte: string;
  pase: string;
  fin: string;
  prevSale?: string;
  sale: string;
  isCustomSale?: boolean;
}

export function Comp1PurchaseManager({ selectedDate }: Comp1Props) {
  const [activeProductTab, setActiveProductTab] = useState<ProductSubTab>('GOA');
  const [validFromDate, setValidFromDate] = useState<string>(() => {
    try {
      return localStorage.getItem('efi_compras_valid_from') || selectedDate || new Date().toISOString().split('T')[0];
    } catch (e) {
      return selectedDate;
    }
  });

  // 3 Bloques Estructurales
  const propiasStations = PROPIAS_STATIONS;
  const fixedCollaborators = FIXED_COLLABORATOR_NAMES
    .map((fname) => COLABORADORA_STATIONS.find((st) => st.name.toUpperCase().includes(fname.toUpperCase())))
    .filter(Boolean) as typeof COLABORADORA_STATIONS;
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

  const formatNum = (num: number, decimals: number = 3): string => {
    return num.toFixed(decimals);
  };

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

  const [purchases, setPurchases] = useState<Record<string, PurchaseRowValues>>(() => {
    try {
      const savedDate = localStorage.getItem(`efi_purchases_${selectedDate}`);
      const savedGlobal = localStorage.getItem('efi_compras_data');
      if (savedDate) {
        const parsed = JSON.parse(savedDate);
        if (parsed.data && Object.keys(parsed.data).length > 0) return parsed.data;
      }
      if (savedGlobal) {
        const parsed = JSON.parse(savedGlobal);
        if (parsed.data && Object.keys(parsed.data).length > 0) return parsed.data;
      }
    } catch (e) {}

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
      const totalCostGoa = Number((goaCurr + costs.porte + costs.pase + costs.fin).toFixed(3));
      const suggestedGoa = OFFICIAL_SUGGESTED_SALE_PRICES[st.name] ?? totalCostGoa;

      const gasPrev = costs.defaultPrev + 0.1200;
      const gasCurr = costs.defaultCurr + 0.1200;
      const totalCostGas = Number((gasCurr + costs.porte + costs.pase + costs.fin).toFixed(3));

      initial[`${st.name}_GOA`] = {
        prev: formatNum(goaPrev),
        curr: formatNum(goaCurr),
        clh: costs.clhName || 'TORREJON',
        porte: formatNum(costs.porte),
        pase: formatNum(costs.pase),
        fin: formatNum(costs.fin),
        prevSale: formatNum(suggestedGoa),
        sale: formatNum(suggestedGoa),
        isCustomSale: false,
      };

      initial[`${st.name}_GASOLINA`] = {
        prev: formatNum(gasPrev),
        curr: formatNum(gasCurr),
        clh: costs.clhName || 'TORREJON',
        porte: formatNum(costs.porte),
        pase: formatNum(costs.pase),
        fin: formatNum(costs.fin),
        prevSale: formatNum(totalCostGas),
        sale: formatNum(totalCostGas),
        isCustomSale: false,
      };

      if (ADBLUE_STATIONS_CONFIG[st.name]) {
        const adblueData = ADBLUE_STATIONS_CONFIG[st.name];
        initial[`${st.name}_ADBLUE`] = {
          prev: formatNum(adblueData.defaultBuy),
          curr: formatNum(adblueData.defaultBuy),
          clh: '-',
          porte: '0.000',
          pase: '0.000',
          fin: '0.000',
          prevSale: formatNum(adblueData.defaultBuy),
          sale: formatNum(adblueData.defaultBuy),
          isCustomSale: false,
        };
      }
    });
    return initial;
  });

  // Estado de Tarifas Especiales B50:F82 EXACTAS
  const [specialRates, setSpecialRates] = useState<SpecialStationRateRow[]>(() => {
    try {
      const saved = localStorage.getItem('efi_special_rates_b50_f82_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SPECIAL_RATES_B50_F82;
  });

  // Estado de Cuadro Especial: Gasolina Bronco (Cálculo Inicial F3:H4)
  const [gasolinaBronco, setGasolinaBronco] = useState<GasolinaBroncoRow>(() => {
    try {
      const savedDate = localStorage.getItem(`efi_purchases_bronco_${selectedDate}`);
      if (savedDate) return JSON.parse(savedDate);
      const savedGlobal = localStorage.getItem('efi_compras_gasolina_bronco');
      if (savedGlobal) return JSON.parse(savedGlobal);
    } catch (e) {}
    return {
      ...DEFAULT_GASOLINA_BRONCO,
      fecha: selectedDate ? formatToDMY(selectedDate) : DEFAULT_GASOLINA_BRONCO.fecha,
    };
  });

  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedDate = localStorage.getItem(`efi_purchases_${selectedDate}`);
      const savedGlobal = localStorage.getItem('efi_compras_data');
      const savedSpecial = localStorage.getItem('efi_special_rates_b50_f82_v3');
      const savedValidDate = localStorage.getItem('efi_compras_valid_from');
      const savedBroncoDate = localStorage.getItem(`efi_purchases_bronco_${selectedDate}`);
      const savedBroncoGlobal = localStorage.getItem('efi_compras_gasolina_bronco');

      if (savedValidDate) {
        setValidFromDate(savedValidDate);
      }

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
        setSpecialRates(JSON.parse(savedSpecial));
      }

      if (savedBroncoDate) {
        setGasolinaBronco(JSON.parse(savedBroncoDate));
      } else if (savedBroncoGlobal) {
        const parsed = JSON.parse(savedBroncoGlobal);
        setGasolinaBronco({
          ...parsed,
          fecha: selectedDate ? formatToDMY(selectedDate) : parsed.fecha,
        });
      } else if (selectedDate) {
        setGasolinaBronco((prev) => ({
          ...prev,
          fecha: formatToDMY(selectedDate),
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedDate]);

  const handleBroncoChange = (field: keyof GasolinaBroncoRow, val: string) => {
    setGasolinaBronco((prev) => {
      const updated = { ...prev, [field]: val };

      if (field === 'conIva') {
        const conIvaN = parseNum(val);
        const sinIvaN = conIvaN > 0 ? Number((conIvaN / 1.21).toFixed(3)) : 0;
        const compraN = parseNum(updated.compra);
        const beneficioN = Number((sinIvaN - (compraN + 0.015)).toFixed(3));
        updated.sinIva = sinIvaN.toFixed(3);
        updated.beneficio = beneficioN.toFixed(3);
      } else if (field === 'sinIva') {
        const sinIvaN = parseNum(val);
        const conIvaN = Number((sinIvaN * 1.21).toFixed(3));
        const compraN = parseNum(updated.compra);
        const beneficioN = Number((sinIvaN - (compraN + 0.015)).toFixed(3));
        updated.conIva = conIvaN.toFixed(3);
        updated.beneficio = beneficioN.toFixed(3);
      } else if (field === 'compra') {
        const compraN = parseNum(val);
        const sinIvaN = parseNum(updated.sinIva);
        const beneficioN = Number((sinIvaN - (compraN + 0.015)).toFixed(3));
        updated.beneficio = beneficioN.toFixed(3);
      } else if (field === 'beneficio') {
        const beneficioN = parseNum(val);
        const compraN = parseNum(updated.compra);
        const sinIvaN = Number((compraN + 0.015 + beneficioN).toFixed(3));
        const conIvaN = Number((sinIvaN * 1.21).toFixed(3));
        updated.sinIva = sinIvaN.toFixed(3);
        updated.conIva = conIvaN.toFixed(3);
      }

      try {
        localStorage.setItem(`efi_purchases_bronco_${selectedDate}`, JSON.stringify(updated));
        localStorage.setItem('efi_compras_gasolina_bronco', JSON.stringify(updated));
        window.dispatchEvent(new Event('efi_compras_updated'));
      } catch (e) {}

      return updated;
    });
    setModifiedKeys((prev) => new Set(prev).add(`bronco_${field}`));
    setIsSaved(false);
  };

  const handleValidDateChange = (newDate: string) => {
    setValidFromDate(newDate);
    try {
      localStorage.setItem('efi_compras_valid_from', newDate);
      localStorage.setItem('efi_global_valid_from_date', newDate);
      window.dispatchEvent(new Event('efi_valid_date_changed'));
    } catch (e) {}
  };

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

      if (field === 'sale') {
        updated.isCustomSale = true;
      }

      if (['curr', 'porte', 'pase', 'fin'].includes(field)) {
        const currN = parseNum(field === 'curr' ? rawVal : updated.curr);
        const porteN = parseNum(field === 'porte' ? rawVal : updated.porte);
        const paseN = parseNum(field === 'pase' ? rawVal : updated.pase);
        const finN = parseNum(field === 'fin' ? rawVal : updated.fin);
        const newTotalCost = Number((currN + porteN + paseN + finN).toFixed(3));

        if (!updated.isCustomSale) {
          updated.sale = formatNum(newTotalCost);
        }
      }

      const nextPurchases = { ...prev, [key]: updated };

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
        window.dispatchEvent(new Event('efi_compras_updated'));
      } catch (e) {}

      return nextPurchases;
    });

    setModifiedKeys((prev) => new Set(prev).add(fieldKey));
    setIsSaved(false);
  };

  // Helper para buscar el item de Gasóleo A (GOA) de una estación en compras
  const findGoaItemForStation = (stName: string): PurchaseRowValues | null => {
    const normalize = (s: string) =>
      s
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^ES\s+/, '')
        .replace(/[-_]/g, ' ')
        .trim();

    const targetNorm = normalize(stName);

    // 1. Coincidencia directa por clave
    const directKey = `${stName}_GOA`;
    if (purchases[directKey]) return purchases[directKey];

    // 2. Coincidencia normalizada exacta
    const entries = Object.entries(purchases).filter(([k]) => k.endsWith('_GOA'));
    for (const [k, item] of entries) {
      const baseName = k.replace(/_GOA$/, '');
      if (normalize(baseName) === targetNorm) {
        return item;
      }
    }

    // 3. Coincidencia por inclusión (ej. FIGUERES -> PETREM FIGUERES, IRUN -> IRUN ZAISA III)
    for (const [k, item] of entries) {
      const baseNorm = normalize(k.replace(/_GOA$/, ''));
      if (baseNorm.includes(targetNorm) || targetNorm.includes(baseNorm)) {
        return item;
      }
    }

    return null;
  };

  // 1) Obtener P. Venta Sugerido de Gasóleo A (GOA) para una estación
  const getGoaSuggestedSaleForStation = (stName: string): string => {
    const item = findGoaItemForStation(stName);
    if (item) {
      const currNum = parseNum(item.curr);
      const porteNum = parseNum(item.porte);
      const paseNum = parseNum(item.pase);
      const finNum = parseNum(item.fin);
      const totalCost = Number((currNum + porteNum + paseNum + finNum).toFixed(3));
      const effectiveSale = item.isCustomSale && item.sale ? item.sale : totalCost.toFixed(3);
      if (parseNum(effectiveSale) > 0) {
        return effectiveSale;
      }
    }

    const costs = STATION_EXCEL_COSTS[stName] || {
      porte: 0.0050,
      pase: 0.0100,
      fin: 0.0100,
      defaultCurr: 1.2000,
    };
    return (costs.defaultCurr + costs.porte + costs.pase + costs.fin).toFixed(3);
  };

  // 2) Obtener Costo Total de Gasóleo A (GOA) dividido entre mil + 0.008 (o Costo Total + 0.008 si ya está en euros)
  const getGoaBaseCostForStation = (stName: string): string => {
    let totalCostNum = 0;
    const item = findGoaItemForStation(stName);
    if (item) {
      const currNum = parseNum(item.curr);
      const porteNum = parseNum(item.porte);
      const paseNum = parseNum(item.pase);
      const finNum = parseNum(item.fin);
      totalCostNum = Number((currNum + porteNum + paseNum + finNum).toFixed(3));
    }

    if (totalCostNum === 0) {
      const costs = STATION_EXCEL_COSTS[stName] || {
        porte: 0.0050,
        pase: 0.0100,
        fin: 0.0100,
        defaultCurr: 1.2000,
      };
      totalCostNum = Number((costs.defaultCurr + costs.porte + costs.pase + costs.fin).toFixed(3));
    }

    const baseVal = totalCostNum > 50 ? (totalCostNum / 1000) + 0.008 : totalCostNum + 0.008;
    return baseVal.toFixed(3);
  };

  // 1. Precio Actual / Especial: SIEMPRE se copia de la columna P. Venta Sugerido de Gasóleo A (GOA)
  const getSpecialActualPrice = (row: SpecialStationRateRow): string => {
    if (row.isCustomActual && row.actualPrice && row.actualPrice.trim() !== '') {
      return row.actualPrice;
    }
    return getGoaSuggestedSaleForStation(row.name);
  };

  // 2. Precio Referencia: editable, por defecto es Precio Actual / Especial + 0.0080
  const getSpecialRefPrice = (row: SpecialStationRateRow, actualVal: string): string => {
    if (row.isCustomRef && row.refPrice && row.refPrice.trim() !== '') {
      return row.refPrice;
    }
    const actNum = parseNum(actualVal);
    if (actNum > 0) {
      return (actNum + 0.0080).toFixed(3);
    }
    return actualVal;
  };

  // 3. Precio Base / Coste: SIEMPRE se copia de Costo Total de Gasóleo A (GOA) dividido entre mil + 0.008
  const getSpecialBasePrice = (row: SpecialStationRateRow): string => {
    if (row.isCustomBase && row.basePrice && row.basePrice.trim() !== '') {
      return row.basePrice;
    }
    return getGoaBaseCostForStation(row.name);
  };

  // Manejador para Tarifas Especiales
  const handleSpecialRateChange = (id: string, field: 'actualPrice' | 'refPrice' | 'basePrice', rawVal: string) => {
    const fieldKey = `special_${id}_${field}`;
    const customFlag =
      field === 'actualPrice' ? 'isCustomActual' : field === 'refPrice' ? 'isCustomRef' : 'isCustomBase';

    setSpecialRates((prev) => {
      const next = prev.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          [field]: rawVal,
          [customFlag]: rawVal.trim() !== '',
        };
      });

      try {
        localStorage.setItem('efi_special_rates_b50_f82_v3', JSON.stringify(next));
      } catch (e) {}

      return next;
    });

    setModifiedKeys((prev) => {
      const nextSet = new Set(prev);
      if (rawVal.trim() !== '') {
        nextSet.add(fieldKey);
      } else {
        nextSet.delete(fieldKey);
      }
      return nextSet;
    });
  };

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
      localStorage.setItem('efi_special_rates_b50_f82_v3', JSON.stringify(specialRates));
      localStorage.setItem('efi_compras_valid_from', validFromDate);
      localStorage.setItem(`efi_purchases_bronco_${selectedDate}`, JSON.stringify(gasolinaBronco));
      localStorage.setItem('efi_compras_gasolina_bronco', JSON.stringify(gasolinaBronco));
    } catch (e) {}

    setIsSaved(true);
    setToastMessage('¡Precios de Compras, Gasolina Bronco y Tarifas Guardados Correctamente!');
    setTimeout(() => {
      setIsSaved(false);
      setToastMessage(null);
    }, 3500);
  };

  const handleCierreDeDia = () => {
    setPurchases((prev) => {
      const nextPurchases: Record<string, PurchaseRowValues> = {};
      Object.entries(prev).forEach(([key, item]) => {
        const currNum = parseNum(item.curr);
        const porteNum = parseNum(item.porte);
        const paseNum = parseNum(item.pase);
        const finNum = parseNum(item.fin);
        const totalCost = Number((currNum + porteNum + paseNum + finNum).toFixed(3));
        const effectiveSale = item.isCustomSale && item.sale ? item.sale : formatNum(totalCost);

        // 3) los datos de cada fila en la columna costo total se copian en la columna p.ant.compra y los datos de la columna p.venta sugerido se copian en la columna p. venta ant.
        nextPurchases[key] = {
          ...item,
          prev: formatNum(totalCost),
          prevSale: effectiveSale,
          sale: formatNum(totalCost),
          isCustomSale: false,
        };
      });

      const timestamp = new Date().toISOString();
      try {
        // 2) Guardar y sincronizar todas las ventanas del sistema (compras, postes, sabana de precios, pdfs y clientes, efi export)
        localStorage.setItem(`efi_purchases_${selectedDate}`, JSON.stringify({
          data: nextPurchases,
          modified: [],
          updatedAt: timestamp,
        }));
        localStorage.setItem('efi_compras_data', JSON.stringify({
          data: nextPurchases,
          modified: [],
          updatedAt: timestamp,
        }));
        localStorage.setItem('efi_special_rates_b50_f82_v3', JSON.stringify(specialRates));
        localStorage.setItem('efi_compras_valid_from', validFromDate);
        localStorage.setItem('efi_global_valid_from_date', validFromDate);
        localStorage.setItem('efi_last_cierre_date', selectedDate);
        localStorage.setItem('efi_last_cierre_timestamp', timestamp);
        localStorage.setItem(`efi_purchases_bronco_${selectedDate}`, JSON.stringify(gasolinaBronco));
        localStorage.setItem('efi_compras_gasolina_bronco', JSON.stringify(gasolinaBronco));

        localStorage.setItem(`efi_cierre_completo_${selectedDate}`, JSON.stringify({
          selectedDate,
          validFromDate,
          purchases: nextPurchases,
          specialRates,
          gasolinaBronco,
          closedAt: timestamp,
        }));

        // Notificar reactivamente a todas las ventanas
        window.dispatchEvent(new Event('efi_compras_updated'));
        window.dispatchEvent(new Event('efi_valid_date_changed'));
        window.dispatchEvent(new Event('efi_cierre_dia'));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error('Error al guardar cierre en localStorage:', e);
      }

      // Descargar archivo Excel (.xlsx) con formato idéntico al oficial consolidado
      try {
        generateAndDownloadCierreWorkbook(selectedDate, validFromDate, nextPurchases, specialRates, gasolinaBronco);
      } catch (e) {
        console.error('Error al generar libro Excel de Cierre:', e);
      }

      return nextPurchases;
    });

    setModifiedKeys(new Set());
    setToastMessage('¡Cierre de Día Completado! Datos guardados en todos los módulos y Excel descargado.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExportDailyExcel = () => {
    let csv = `INFORME DIARIO DE COMPRAS Y COSTES - AREA 117\nFECHA EMISION:;${selectedDate};PRECIOS VALIDOS A PARTIR DE:;${validFromDate}\nAVISO IMPORTANTE:;TODOS LOS PRECIOS Y COSTES TIENEN VALIDEZ OFICIAL A PARTIR DEL:;${validFromDate}\n\n`;
    csv += 'ESTACION;TIPO;PRODUCTO;P. ANT. COMPRA (EUR);PRECIO COMPRA HOY (EUR);CLH (TERMINAL);PORTE (R);PASE (S);FINANCIACION (T);COSTO TOTAL (EUR);P. VENTA ANT. (EUR);P. VENTA SUGERIDO (EUR);MARGEN (EUR)\n';

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
            prev: '0.000', curr: '0.000', clh: 'TORREJON', porte: '0.000', pase: '0.000', fin: '0.000', sale: '0.000', prevSale: '0.000'
          };
          const currNum = parseNum(item.curr);
          const porteNum = parseNum(item.porte);
          const paseNum = parseNum(item.pase);
          const finNum = parseNum(item.fin);
          const totalCost = Number((currNum + porteNum + paseNum + finNum).toFixed(3));
          const effectiveSale = item.isCustomSale && item.sale ? item.sale : totalCost.toFixed(3);
          const saleNum = parseNum(effectiveSale);
          const margin = Number((saleNum - totalCost).toFixed(3));
          const clhName = STATION_EXCEL_COSTS[st.name]?.clhName || item.clh || 'TORREJON';
          const prevSaleVal = item.prevSale || effectiveSale;

          csv += `${st.name};${typeLabel};${prod.name};${item.prev.replace('.', ',')};${item.curr.replace('.', ',')};${clhName};${item.porte.replace('.', ',')};${item.pase.replace('.', ',')};${item.fin.replace('.', ',')};${totalCost.toFixed(3).replace('.', ',')};${prevSaleVal.replace('.', ',')};${effectiveSale.replace('.', ',')};${margin.toFixed(3).replace('.', ',')}\n`;
        });
      });
    };

    exportSection(propiasStations, 'PROPIA');
    exportSection(fixedCollaborators, 'COLABORADORA FIJA');
    exportSection(remainingCollaborators, 'COLABORADORA RESTANTE');

    // Cuadro Especial: GASOLINA BRONCO
    csv += '\nCUADRO ESPECIAL: GASOLINA BRONCO;;;;;;;;;;;\n';
    csv += 'PRODUCTO;SIN IVA (EUR);CON IVA (EUR);BENEFICIO (EUR);COMPRA (EUR);FECHA;;;;;;\n';
    csv += `${gasolinaBronco.name};${gasolinaBronco.sinIva.replace('.', ',')};${gasolinaBronco.conIva.replace('.', ',')};${gasolinaBronco.beneficio.replace('.', ',')};${gasolinaBronco.compra.replace('.', ',')};${gasolinaBronco.fecha};;;;;;\n`;

    // Tarifas Especiales B50:F82
    csv += '\nTARIFAS ESPECIALES;;;;;;;;;;;\n';
    csv += 'ESTACION;PRECIO REFERENCIA (EUR);PRECIO ACTUAL / ESPECIAL (EUR);PRECIO BASE / COSTE (EUR);;;;;;;;\n';
    specialRates.forEach((row) => {
      const actVal = getSpecialActualPrice(row);
      const refVal = getSpecialRefPrice(row, actVal);
      const baseVal = getSpecialBasePrice(row);
      csv += `${row.name};${refVal.replace('.', ',')};${actVal.replace('.', ',')};${baseVal.replace('.', ',')};;;;;;;;\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `EFI_COMPRAS_VALIDO_A_PARTIR_DE_${validFromDate}.csv`;
    link.click();

    setToastMessage(`Descargando archivo Excel: EFI_COMPRAS_DIARIO_${selectedDate}.csv`);
    setTimeout(() => setToastMessage(null), 3500);
  };

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
              {activeProductTab === 'ADBLUE' ? (
                <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-cyan-500/30 font-bold">
                  <th className="py-3.5 px-4 sticky left-0 bg-slate-950 z-20">Estación</th>
                  <th className="py-3.5 px-3 text-cyan-300">Producto</th>
                  <th className="py-3.5 px-3 bg-slate-900/70 text-slate-300">P. Ant. Compra (€)</th>
                  <th className="py-3.5 px-3 text-amber-300 bg-slate-900">
                    Precio Compra Hoy (€) <span className="text-[10px] text-slate-500 font-normal">(. o ,)</span>
                  </th>
                  <th className="py-3.5 px-3 text-amber-400 bg-slate-900/50">Precio Sin IVA (€)</th>
                  <th className="py-3.5 px-3 text-emerald-400 bg-slate-900/80">Precio Con IVA 21% (€)</th>
                  <th className="py-3.5 px-3 bg-slate-900/50 text-slate-300">P. Venta Ant. (€)</th>
                  <th className="py-3.5 px-3 text-blue-400 bg-slate-900/60">P. Venta Sugerido (€)</th>
                  <th className="py-3.5 px-3 text-emerald-400">Margen (€)</th>
                </tr>
              ) : (
                <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                  <th className="py-3.5 px-4 sticky left-0 bg-slate-950 z-20">Estación</th>
                  <th className="py-3.5 px-3">Producto</th>
                  <th className="py-3.5 px-3 bg-slate-900/70 text-slate-300">P. Ant. Compra (€)</th>
                  <th className="py-3.5 px-3 text-amber-300 bg-slate-900">
                    Precio Compra Hoy (€) <span className="text-[10px] text-slate-500 font-normal">(. o ,)</span>
                  </th>
                  <th className="py-3.5 px-3 text-slate-300">CLH (Lugar Compra)</th>
                  <th className="py-3.5 px-2 text-amber-300">Porte (R)</th>
                  <th className="py-3.5 px-2 text-blue-300">Pase (S)</th>
                  <th className="py-3.5 px-2 text-purple-300">Financ. (T)</th>
                  <th className="py-3.5 px-3 text-emerald-400 bg-slate-900/60">Costo Total (€)</th>
                  <th className="py-3.5 px-3 bg-slate-900/50 text-slate-300">P. Venta Ant. (€)</th>
                  <th className="py-3.5 px-3 text-blue-400 bg-slate-900/80">P. Venta Sugerido (€)</th>
                  <th className="py-3.5 px-3 text-emerald-400">Margen (€)</th>
                </tr>
              )}
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

                  const totalCost = Number((currNum + porteNum + paseNum + finNum).toFixed(3));
                  const defaultSale = prod.code === 'GOA' && OFFICIAL_SUGGESTED_SALE_PRICES[st.name]
                    ? OFFICIAL_SUGGESTED_SALE_PRICES[st.name].toFixed(3)
                    : totalCost.toFixed(3);
                  const displaySale = item.sale && item.sale !== '0' && item.sale !== '0.000' ? item.sale : defaultSale;
                  const saleNum = parseNum(displaySale);
                  const margin = Number((saleNum - totalCost).toFixed(3));
                  const displayPrevSale = item.prevSale !== undefined ? item.prevSale : (item.prev || totalCost.toFixed(3));

                  const isCurrMod = modifiedKeys.has(`${key}_curr`);
                  const isPrevMod = modifiedKeys.has(`${key}_prev`);
                  const isPorteMod = modifiedKeys.has(`${key}_porte`);
                  const isPaseMod = modifiedKeys.has(`${key}_pase`);
                  const isFinMod = modifiedKeys.has(`${key}_fin`);
                  const isPrevSaleMod = modifiedKeys.has(`${key}_prevSale`);
                  const isSaleMod = modifiedKeys.has(`${key}_sale`);

                  const clhDisplayName = excelCosts?.clhName && excelCosts.clhName !== '0' && excelCosts.clhName !== 'n/a'
                    ? excelCosts.clhName
                    : 'TORREJON';

                  if (activeProductTab === 'ADBLUE') {
                    const adblueSinIva = currNum;
                    const adblueConIva = Number((currNum * 1.21).toFixed(3));
                    const displayAdblueSale = item.isCustomSale && item.sale ? item.sale : currNum.toFixed(3);
                    const adblueSaleNum = parseNum(displayAdblueSale);
                    const adblueMargin = Number((adblueSaleNum - currNum).toFixed(3));
                    const displayAdbluePrevSale = item.prevSale !== undefined ? item.prevSale : (item.prev || currNum.toFixed(3));

                    return (
                      <tr
                        key={key}
                        className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60"
                      >
                        {/* 1. Estación */}
                        <td className={`py-2.5 px-4 font-bold sticky left-0 z-10 border-r border-slate-800 transition-colors ${themeStyles.stationBg}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-sans">
                            <span className="font-extrabold tracking-tight">{st.name}</span>
                            {themeColor === 'orange' && (
                              <span className="text-[9px] bg-orange-500/25 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded-full font-black tracking-wider uppercase inline-flex items-center space-x-1 shadow-sm">
                                <ShieldCheck className="h-3 w-3 text-orange-400" />
                                <span>FIJA</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Producto */}
                        <td className="py-2.5 px-3 font-semibold">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            <Droplet className="h-3.5 w-3.5 text-cyan-400" />
                            <span>AdBlue</span>
                          </span>
                        </td>

                        {/* 3. P. Ant. Compra */}
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

                        {/* 4. Precio Compra Hoy */}
                        <td className={`py-2.5 px-3 transition-all ${isCurrMod ? 'bg-amber-400/25' : 'bg-slate-900/30'}`}>
                          <div className="relative inline-flex items-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.curr}
                              onChange={(e) => handleInputChange(st.name, prod.code, 'curr', e.target.value)}
                              placeholder="0,000"
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

                        {/* 5. Precio Sin IVA (= Precio Compra Hoy) */}
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-300 bg-slate-900/40 text-center">
                          {adblueSinIva.toFixed(3)} €
                        </td>

                        {/* 6. Precio Con IVA 21% (= Precio Sin IVA * 1.21) */}
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 bg-slate-900/60 text-center">
                          {adblueConIva.toFixed(3)} €
                        </td>

                        {/* 7. P. Venta Ant. */}
                        <td className={`py-2.5 px-3 bg-slate-900/30 ${isPrevSaleMod ? 'bg-amber-400/20' : ''}`}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displayAdbluePrevSale}
                            onChange={(e) => handleInputChange(st.name, prod.code, 'prevSale', e.target.value)}
                            className={`w-20 rounded px-2 py-1 text-xs font-mono transition-all focus:outline-none ${
                              isPrevSaleMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md font-bold'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 focus:border-amber-400'
                            }`}
                          />
                        </td>

                        {/* 8. P. Venta Sugerido */}
                        <td className={`py-2.5 px-3 bg-blue-500/5 ${isSaleMod ? 'bg-amber-400/20' : ''}`}>
                          <div className="relative inline-flex items-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={displayAdblueSale}
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

                        {/* 9. Margen */}
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              adblueMargin >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                            }`}
                          >
                            {adblueMargin > 0 ? `+${adblueMargin.toFixed(3)}` : adblueMargin.toFixed(3)} €
                          </span>
                        </td>
                      </tr>
                    );
                  }

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

                      {/* 3. P. Ant. Compra */}
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

                      {/* 4. Precio Compra Hoy */}
                      <td className={`py-2.5 px-3 transition-all ${isCurrMod ? 'bg-amber-400/25' : 'bg-slate-900/30'}`}>
                        <div className="relative inline-flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.curr}
                            onChange={(e) => handleInputChange(st.name, prod.code, 'curr', e.target.value)}
                            placeholder="0,000"
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

                      {/* 5. CLH (Badge sin ningún input) */}
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
                        {totalCost.toFixed(3)} €
                      </td>

                      {/* 10. P. Venta Ant. (€) */}
                      <td className={`py-2.5 px-3 bg-slate-900/30 ${isPrevSaleMod ? 'bg-amber-400/20' : ''}`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={displayPrevSale}
                          onChange={(e) => handleInputChange(st.name, prod.code, 'prevSale', e.target.value)}
                          className={`w-20 rounded px-2 py-1 text-xs font-mono transition-all focus:outline-none ${
                            isPrevSaleMod
                              ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md font-bold'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 focus:border-amber-400'
                          }`}
                        />
                      </td>

                      {/* 11. P. Venta Sugerido (€) */}
                      <td className={`py-2.5 px-3 bg-blue-500/5 ${isSaleMod ? 'bg-amber-400/20' : ''}`}>
                        <div className="relative inline-flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displaySale}
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

                      {/* 12. Margen (€) */}
                      <td
                        className={`py-2.5 px-3 font-mono font-bold text-xs ${
                          margin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {margin > 0 ? `+${margin.toFixed(3)}` : margin.toFixed(3)} €
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
              <span>Gestión de Compras, Costes Fijos y Tarifas Especiales</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Compras de Combustibles y Red de Estaciones
            </h2>
            <p className="text-slate-400 text-sm">
              Cálculo automático de Costo Total = Compra + Porte + Pase + Financiación. P. Venta Sugerido sincronizado por defecto.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950 border border-slate-700 rounded-xl p-2 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Válido A Partir De:</span>
                <input
                  type="date"
                  value={validFromDate}
                  onChange={(e) => handleValidDateChange(e.target.value)}
                  className="bg-transparent text-xs text-white font-mono font-bold focus:outline-none"
                />
              </div>
            </div>

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
              <span>Cierre de Día</span>
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
              <span>{isSaved ? '¡Guardado!' : 'Guardar Precios'}</span>
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
            <span>Tarifas Especiales</span>
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
          {/* CUADRO ESPECIAL: GASOLINA BRONCO (Hoja Cálculo Inicial F3:H4) */}
          {(activeProductTab === 'GASOLINA' || activeProductTab === 'ALL') && (
            <div className="bg-slate-900 border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl space-y-0">
              <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Fuel className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-white text-base tracking-tight">
                        Cuadro Especial: Gasolina Bronco
                      </h3>
                      <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                        Cálculo Inicial (F3:H4)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Fórmulas: Con IVA = Sin IVA × 1,21 | Beneficio = Sin IVA - (Compra + 0,015 €)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 px-3 py-1 rounded-full font-bold">
                    Amarillo = Con IVA (Editable / Reactivo)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto p-4 sm:p-6">
                <div className="max-w-5xl mx-auto rounded-2xl border border-amber-600/30 overflow-hidden shadow-xl bg-slate-950">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-[#fceade] text-slate-900 font-black text-xs uppercase tracking-wider border-b border-amber-300">
                        <th className="py-3.5 px-6 text-left font-black">PRODUCTO</th>
                        <th className="py-3.5 px-4 font-black">SIN IVA</th>
                        <th className="py-3.5 px-4 font-black text-amber-950 bg-yellow-300">CON IVA</th>
                        <th className="py-3.5 px-4 font-black text-emerald-800">BENEFICIO</th>
                        <th className="py-3.5 px-4 font-black text-blue-900">COMPRA</th>
                        <th className="py-3.5 px-4 font-black text-rose-800">FECHA</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      <tr className="bg-slate-900/90 hover:bg-slate-900 transition-colors">
                        {/* PRODUCTO */}
                        <td className="py-3 px-6 text-left font-black text-white bg-[#fdf2e9] text-slate-900 border-r border-slate-700/60">
                          <input
                            type="text"
                            value={gasolinaBronco.name}
                            onChange={(e) => handleBroncoChange('name', e.target.value)}
                            className="bg-transparent text-slate-950 font-black text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-1.5 py-0.5 w-full uppercase"
                          />
                        </td>

                        {/* SIN IVA */}
                        <td className="py-3 px-4 border-r border-slate-800">
                          <div className="inline-flex items-center space-x-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={gasolinaBronco.sinIva}
                              onChange={(e) => handleBroncoChange('sinIva', e.target.value)}
                              className="w-24 text-center font-bold text-slate-100 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400"
                            />
                            <span className="text-slate-400 font-bold">€</span>
                          </div>
                        </td>

                        {/* CON IVA (Amarillo llamativo como en el Excel) */}
                        <td className="py-3 px-4 bg-amber-500/10 border-r border-slate-800">
                          <div className="inline-flex items-center space-x-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={gasolinaBronco.conIva}
                              onChange={(e) => handleBroncoChange('conIva', e.target.value)}
                              className="w-24 text-center font-black text-slate-950 bg-yellow-300 ring-2 ring-yellow-400 shadow-md rounded-lg px-2 py-1 focus:outline-none focus:ring-4 focus:ring-yellow-200 cursor-pointer"
                              title="Precio Con IVA (al cambiarlo se recalcula Sin IVA y Beneficio automáticamente)"
                            />
                            <span className="text-amber-400 font-black">€</span>
                          </div>
                        </td>

                        {/* BENEFICIO */}
                        <td className="py-3 px-4 border-r border-slate-800">
                          <div className="inline-flex items-center space-x-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={gasolinaBronco.beneficio}
                              onChange={(e) => handleBroncoChange('beneficio', e.target.value)}
                              className="w-24 text-center font-bold text-emerald-400 bg-slate-950 border border-emerald-900/50 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-400"
                              title="Beneficio = Sin IVA - (Compra + 0.015)"
                            />
                            <span className="text-emerald-400 font-bold">€</span>
                          </div>
                        </td>

                        {/* COMPRA */}
                        <td className="py-3 px-4 border-r border-slate-800">
                          <div className="inline-flex items-center space-x-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={gasolinaBronco.compra}
                              onChange={(e) => handleBroncoChange('compra', e.target.value)}
                              className="w-24 text-center font-bold text-blue-300 bg-slate-950 border border-blue-900/50 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
                            />
                            <span className="text-blue-300 font-bold">€</span>
                          </div>
                        </td>

                        {/* FECHA */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={gasolinaBronco.fecha}
                            onChange={(e) => handleBroncoChange('fecha', e.target.value)}
                            className="w-28 text-center font-bold text-rose-500 bg-slate-950 border border-rose-950 rounded-lg px-2 py-1 focus:outline-none focus:border-rose-400"
                            title="Fecha del cálculo"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {renderStationTable(
            '1. Estaciones Propias',
            'Precios de compra y costes fijos (Porte, Pase, Financiación) de las 19 estaciones propias',
            Building2,
            propiasStations,
            'blue'
          )}

          {renderStationTable(
            '2. Estaciones Colaboradoras Fijas',
            'Convenios fijos prioritarios de la red colaboradora con terminales y costes asignados',
            ShieldCheck,
            fixedCollaborators,
            'orange'
          )}

          {renderStationTable(
            '3. Estaciones Colaboradoras Restantes',
            'Red complementaria de estaciones colaboradoras y depósitos de suministro',
            Store,
            remainingCollaborators,
            'purple'
          )}
        </div>
      )}

      {/* SUB-VENTANA: TARIFAS ESPECIALES EXACTO */}
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
                    Tarifas Especiales
                  </h3>
                  <span className="text-xs font-mono font-bold bg-slate-800 text-emerald-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                    31 Estaciones
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Precio Actual = P. Venta Sugerido GOA | Precio Base / Coste = Costo Total GOA / 1000 + 0,0080 €
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Valores editables con auto-guardado en tiempo real
            </div>
          </div>

          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950 z-20">
                <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                  <th className="py-3 px-4 w-12 text-center">Nº</th>
                  <th className="py-3 px-6 sticky left-0 bg-slate-950 z-30">Estación</th>
                  <th className="py-3 px-6 text-center text-rose-400 bg-slate-900/60">
                    Precio Referencia (€)
                  </th>
                  <th className="py-3 px-6 text-center text-amber-300 bg-slate-900/80">
                    Precio Actual / Especial (€)
                  </th>
                  <th className="py-3 px-6 text-center text-slate-300">
                    Precio Base / Coste (€)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {specialRates.map((row, idx) => {
                  const displayActual = getSpecialActualPrice(row);
                  const displayRef = getSpecialRefPrice(row, displayActual);
                  const displayBase = getSpecialBasePrice(row);

                  const isActMod = modifiedKeys.has(`special_${row.id}_actualPrice`) || Boolean(row.isCustomActual && row.actualPrice);
                  const isRefMod = modifiedKeys.has(`special_${row.id}_refPrice`) || Boolean(row.isCustomRef && row.refPrice);
                  const isBaseMod = modifiedKeys.has(`special_${row.id}_basePrice`) || Boolean(row.isCustomBase && row.basePrice);

                  return (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-center font-bold text-slate-500 font-mono">
                        {idx + 1}
                      </td>

                      {/* Estación con fondo azul para estaciones específicas como Alfajarín, Benamejí, Riba-roja, Pista de Silla */}
                      <td
                        className={`py-2.5 px-6 font-bold sticky left-0 z-10 border-r border-slate-800 font-sans ${
                          row.isBlueBg
                            ? 'bg-blue-900/50 text-blue-200 border-l-4 border-l-blue-400 font-black'
                            : 'bg-slate-900 text-white'
                        }`}
                      >
                        {row.name}
                      </td>

                      {/* 2. Precio Referencia (€) */}
                      <td className="py-2.5 px-6 text-center">
                        <div className="inline-flex items-center justify-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displayRef}
                            onChange={(e) => handleSpecialRateChange(row.id, 'refPrice', e.target.value)}
                            className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-center transition-all focus:outline-none ${
                              isRefMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md'
                                : row.isRedRef
                                ? 'bg-slate-950 border border-rose-900/50 text-rose-400 font-bold focus:border-rose-400'
                                : 'bg-slate-950 border border-slate-700 text-slate-300 focus:border-amber-400'
                            }`}
                          />
                        </div>
                      </td>

                      {/* 3. Precio Actual / Especial (€) (= P. Venta Sugerido Gasóleo A) */}
                      <td className="py-2.5 px-6 text-center">
                        <div className="inline-flex items-center justify-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displayActual}
                            onChange={(e) => handleSpecialRateChange(row.id, 'actualPrice', e.target.value)}
                            className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-black text-center transition-all focus:outline-none ${
                              isActMod
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-md font-black'
                                : row.isYellowPrice
                                ? 'bg-amber-300 text-slate-950 font-black shadow-sm'
                                : 'bg-slate-950 border border-slate-700 text-slate-100 focus:border-amber-400'
                            }`}
                          />
                        </div>
                      </td>

                      {/* 4. Precio Base / Coste (€) (= Costo Total Gasóleo A / 1000 + 0.008) */}
                      <td className="py-2.5 px-6 text-center">
                        <div className="inline-flex items-center justify-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displayBase}
                            onChange={(e) => handleSpecialRateChange(row.id, 'basePrice', e.target.value)}
                            className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono text-center transition-all focus:outline-none ${
                              isBaseMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 focus:border-amber-400'
                            }`}
                          />
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
