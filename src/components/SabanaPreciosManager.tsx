'use client';

import React, { useState, useEffect } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS, OFFICIAL_SUGGESTED_SALE_PRICES } from '@/lib/dataSeed';
import {
  FileSpreadsheet, Download, Filter, Search, Table, Sparkles, Check,
  Calculator, RotateCcw, Layers
} from 'lucide-react';
import { SabanaFormulaModal } from './SabanaFormulaModal';
import {
  loadSabanaFormulas,
  saveSabanaFormula,
  removeSabanaFormula,
  clearAllSabanaFormulas,
  CellFormula,
  getProgramVariables,
  evaluateFormula
} from '@/lib/sabanaFormulaEngine';

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
    columnsRange: 'Cols T:Y',
    tariffs: [
      { name: 'Especial Javi', markup: 0.116 },
      { name: 'Especial Carreras', markup: 0.116 },
    ],
    borderTheme: 'border-blue-500/30',
    badgeTheme: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  {
    id: 'transfrired',
    title: 'Tarifa Especial Transfrired',
    description: 'Tarifas preferenciales asignadas para flota Transfrired',
    columnsRange: 'Cols Z:AB',
    tariffs: [
      { name: 'Especial Transfrired', markup: 0.116 },
    ],
    borderTheme: 'border-green-500/30',
    badgeTheme: 'bg-green-500/15 text-green-300 border-green-500/30',
  },
  {
    id: 'c0_general',
    title: 'Tarifa C-0 (Especial General)',
    description: 'Tarifa matriz general de convenio C-0 para transporte de carga',
    columnsRange: 'Cols AF:AH',
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
    columnsRange: 'Cols AJ:AN',
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
    columnsRange: 'Cols AP:AW',
    tariffs: [
      { name: 'Tarifa 90 Miki', markup: 0.090 },
      { name: 'Tarifa ECOTRANS', markup: 0.050 },
      { name: 'Tarifa 30', markup: 0.030 },
    ],
    borderTheme: 'border-amber-500/30',
    badgeTheme: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'sur_benito',
    title: 'Tarifas Sur (Benito: 27 Sur & 15 Sur)',
    description: 'Convenios específicos zona Sur: Tarifa 27 Sur y Tarifa 15 Sur',
    columnsRange: 'Cols AZ:BE',
    tariffs: [
      { name: 'Tarifa 27 Sur', markup: 0.027 },
      { name: 'Tarifa 15 Sur', markup: 0.015 },
    ],
    borderTheme: 'border-purple-500/30',
    badgeTheme: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  {
    id: 'tarifa_75',
    title: 'Tarifa Especial 75',
    description: 'Tarifa Especial 75: P. Venta Sugerido Gasóleo A + 0.038. Con IVA = Sin IVA * 1.21',
    columnsRange: 'Cols BG:BH',
    tariffs: [
      { name: 'Tarifa 75', markup: 0.038 },
    ],
    borderTheme: 'border-cyan-500/30',
    badgeTheme: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
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

// Helper para identificar estaciones con fondo azul especial (Alfajarín, Benamejí, Riba-roja, Pista de Silla)
const isBlueSpecialStation = (stName: string): boolean => {
  const upper = stName.toUpperCase();
  return (
    upper.includes('ALFAJARIN') ||
    upper.includes('BENAMEJI') ||
    upper.includes('RIBA-ROJA') ||
    upper.includes('PISTA DE SILLA')
  );
};

export function SabanaPreciosManager({ selectedDate }: SabanaProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PROPIA' | 'COLABORADORA'>('ALL');
  const [comprasPurchases, setComprasPurchases] = useState<Record<string, { sale: string }>>({});
  const [specialRates, setSpecialRates] = useState<any[]>(() => {
    try {
      const sp = localStorage.getItem('efi_special_rates_b50_f82_v3');
      if (sp) {
        const parsed = JSON.parse(sp);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Estados del Modo Formulación
  const [isFormulaMode, setIsFormulaMode] = useState<boolean>(false);
  const [customFormulas, setCustomFormulas] = useState<Record<string, CellFormula>>(() => {
    return loadSabanaFormulas(selectedDate);
  });
  const [activeModalCell, setActiveModalCell] = useState<{
    cellKey: string;
    cellTitle: string;
    defaultValue: number;
    currentFormula?: string;
    columnLabel?: string;
    onApplyToColumn?: (formulaStr: string) => void;
  } | null>(null);

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

  const loadSpecialRates = () => {
    try {
      const sp = localStorage.getItem('efi_special_rates_b50_f82_v3');
      if (sp) {
        const parsed = JSON.parse(sp);
        if (Array.isArray(parsed)) setSpecialRates(parsed);
      }
    } catch (e) {}
  };

  const loadFormulas = () => {
    setCustomFormulas(loadSabanaFormulas(selectedDate));
  };

  useEffect(() => {
    loadComprasData();
    loadSpecialRates();
    loadFormulas();

    const onComprasUpdated = () => {
      loadComprasData();
      loadSpecialRates();
    };
    const onSabanaUpdated = () => loadFormulas();
    const onStorage = () => {
      loadComprasData();
      loadSpecialRates();
      loadFormulas();
    };

    window.addEventListener('efi_compras_updated', onComprasUpdated);
    window.addEventListener('efi_sabana_updated', onSabanaUpdated);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('efi_compras_updated', onComprasUpdated);
      window.removeEventListener('efi_sabana_updated', onSabanaUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [selectedDate]);

  // Obtener P. Venta Sugerido de Compras para cada estación con resolución exacta
  const getStationBasePrice = (stName: string, isPropia?: boolean): number => {
    // 1. Coincidencia directa en comprasPurchases
    let item = comprasPurchases[`${stName}_GOA`];

    // 2. Coincidencia normalizada sin prefijos 'ES '
    const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    if (!item?.sale) {
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

    // 3. Fallback con OFFICIAL_SUGGESTED_SALE_PRICES (P. Venta Sugerido oficial de Compras)
    if (OFFICIAL_SUGGESTED_SALE_PRICES[cleanTarget] !== undefined) {
      return OFFICIAL_SUGGESTED_SALE_PRICES[cleanTarget];
    }
    if (OFFICIAL_SUGGESTED_SALE_PRICES[stName] !== undefined) {
      return OFFICIAL_SUGGESTED_SALE_PRICES[stName];
    }
    const matchedOfficialKey = Object.keys(OFFICIAL_SUGGESTED_SALE_PRICES).find((k) => {
      const baseK = k.toUpperCase().replace(/^ES\s+/, '').trim();
      return baseK === cleanTarget || baseK.includes(cleanTarget) || cleanTarget.includes(baseK);
    });
    if (matchedOfficialKey) {
      return OFFICIAL_SUGGESTED_SALE_PRICES[matchedOfficialKey];
    }

    // 4. Fallback con Costo Total del Excel si nada coincide
    const costs = STATION_EXCEL_COSTS[stName] || {
      porte: 0.0050,
      pase: 0.0100,
      fin: 0.0100,
      defaultCurr: 1.2000,
    };
    return Number((costs.defaultCurr + costs.porte + costs.pase + costs.fin).toFixed(4));
  };

  // Helper para identificar estaciones con celda Naranja en Los Javi (copian Precio Actual / Especial de Tarifas Especiales de Compras)
  const isJaviOrange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('TORREJON') ||
      u.includes('ARCOS') ||
      u.includes('ALFAJARIN') ||
      u.includes('TORREMOCHA') ||
      u.includes('MADRID') ||
      u.includes('VALDEMORO') || // Naranja en Javi
      u.includes('PAMPLONA') ||
      u.includes('HUMILLADERO') ||
      u.includes('UCLES') ||
      u.includes('RIBA-ROJA') ||
      u.includes('PISTA DE SILLA') ||
      u.includes('REAL DE GANDIA') ||
      u.includes('CHIVA') ||
      u.includes('ALBERIC') ||
      u.includes('CATARROJA') ||
      u.includes('MANISES') ||
      u.includes('ABRERA') ||
      u.includes('CASAR') ||
      u.includes('JUNDIZ') ||
      u.includes('OLIVERAL') ||
      u.includes('GUARROMAN') ||
      u.includes('VALDEPE') ||
      u.includes('LLERS') ||
      u.includes('BERA') ||
      u.includes('GIRONA') ||
      u.includes('FIGUERES')
    );
  };

  // Helper para identificar estaciones con celda Naranja en Carreras (copian Precio Actual / Especial de Tarifas Especiales de Compras)
  const isCarrerasOrange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    if (u.includes('VALDEMORO') || u.includes('OPEN')) return false; // Blancas en Carreras
    return (
      isJaviOrange(stName) ||
      u.includes('BENAMEJI') || // Naranja en Carreras
      u.includes('IRUN') ||     // Naranja en Carreras
      u.includes('CAMPANA')     // Naranja en Carreras
    );
  };

  // Obtener Precio Actual / Especial de Tarifas Especiales de Compras
  const getSpecialRateActualPrice = (stName: string): number => {
    if (specialRates && specialRates.length > 0) {
      const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
      const row = specialRates.find((r) => {
        const rNorm = r.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
        return rNorm === cleanTarget || rNorm.includes(cleanTarget) || cleanTarget.includes(rNorm);
      });
      if (row && row.actualPrice) {
        const p = parseFloat(row.actualPrice.toString().replace(',', '.'));
        if (!isNaN(p) && p > 0) return p;
      }
    }
    return getStationBasePrice(stName);
  };

  // Valor por defecto Sin IVA para Especial Javi
  const getJaviSinIvaDefault = (stName: string, isPropia?: boolean): number => {
    if (isJaviOrange(stName)) {
      return Number(getSpecialRateActualPrice(stName).toFixed(3));
    }
    const costoTotal = getStationBasePrice(stName, isPropia);
    if (stName.toUpperCase().includes('PUERTO DE BARCELONA')) {
      const tarifa24Key = 'TAR_24_PUERTO DE BARCELONA_sinIva';
      if (customFormulas[tarifa24Key]) {
        return Number(customFormulas[tarifa24Key].evaluatedValue.toFixed(3));
      }
    }
    return Number((costoTotal + 0.024).toFixed(3));
  };

  // Valor por defecto Sin IVA para Especial Carreras
  const getCarrerasSinIvaDefault = (stName: string, isPropia?: boolean): number => {
    if (isCarrerasOrange(stName)) {
      return Number(getSpecialRateActualPrice(stName).toFixed(3));
    }
    const costoTotal = getStationBasePrice(stName, isPropia);
    if (stName.toUpperCase().includes('PUERTO DE BARCELONA')) {
      const tarifa18Key = 'TAR_18_PUERTO DE BARCELONA_sinIva';
      if (customFormulas[tarifa18Key]) {
        return Number(customFormulas[tarifa18Key].evaluatedValue.toFixed(3));
      }
    }
    return Number((costoTotal + 0.018).toFixed(3));
  };

  // Datos completos de precios y estado para Especial Javi
  const getJaviPrices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getJaviSinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_los_javi_${stName}_Especial Javi_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_los_javi_${stName}_Especial Javi_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
      isOrange: isJaviOrange(stName),
    };
  };

  // Datos completos de precios y estado para Especial Carreras
  const getCarrerasPrices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getCarrerasSinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_los_javi_${stName}_Especial Carreras_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_los_javi_${stName}_Especial Carreras_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
      isOrange: isCarrerasOrange(stName),
    };
  };

  // Helper para identificar estaciones con celda Naranja en Transfrired (copian Precio Actual / Especial de Tarifas Especiales de Compras)
  const isTransfriredOrange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('TORREJON') ||
      u.includes('ARCOS') ||
      u.includes('ALFAJARIN') ||
      u.includes('TORREMOCHA') ||
      u.includes('MADRID') ||
      u.includes('HUMILLADERO') ||
      u.includes('UCLES') ||
      u.includes('RIBA-ROJA') ||
      u.includes('PISTA DE SILLA') ||
      u.includes('REAL DE GANDIA') ||
      u.includes('CHIVA') ||
      u.includes('ALBERIC') ||
      u.includes('CATARROJA') ||
      u.includes('MANISES') ||
      u.includes('ABRERA') ||
      u.includes('CASAR') ||
      u.includes('JUNDIZ') ||
      u.includes('OLIVERAL') ||
      u.includes('GUARROMAN') ||
      u.includes('VALDEPE') ||
      u.includes('GIRONA') ||
      u.includes('FIGUERES')
    );
  };

  // Valor por defecto Sin IVA para Especial Transfrired
  const getTransfriredSinIvaDefault = (stName: string, isPropia?: boolean): number => {
    if (isTransfriredOrange(stName)) {
      return Number(getSpecialRateActualPrice(stName).toFixed(3));
    }
    const costoTotal = getStationBasePrice(stName, isPropia);
    return Number((costoTotal + 0.024).toFixed(3));
  };

  // Datos completos de precios y estado para Especial Transfrired
  const getTransfriredPrices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getTransfriredSinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_transfrired_${stName}_Especial Transfrired_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_transfrired_${stName}_Especial Transfrired_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
      isOrange: isTransfriredOrange(stName),
    };
  };

  // Helper para identificar estaciones con celda Naranja en C-0 (Especial General)
  const isC0Orange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('TORREJON') ||
      u.includes('ARCOS') ||
      u.includes('ALFAJARIN') ||
      u.includes('TORREMOCHA') ||
      u.includes('MADRID') ||
      u.includes('VALDEMORO') ||
      u.includes('PAMPLONA') ||
      u.includes('HUMILLADERO') ||
      u.includes('UCLES') ||
      u.includes('BENAMEJI') ||
      u.includes('ALCUBILLAS') ||
      u.includes('RIBA-ROJA') ||
      u.includes('PISTA DE SILLA') ||
      u.includes('REAL DE GANDIA') ||
      u.includes('CHIVA') ||
      u.includes('ALBERIC') ||
      u.includes('CATARROJA') ||
      u.includes('MANISES') ||
      u.includes('ABRERA') ||
      u.includes('CASAR') ||
      u.includes('JUNDIZ') ||
      u.includes('OLIVERAL') ||
      u.includes('GUARROMAN') ||
      u.includes('VALDEPE') ||
      u.includes('OPEN') ||
      u.includes('IRUN') ||
      u.includes('CAMPANA') ||
      u.includes('LLERS') ||
      u.includes('BERA') ||
      u.includes('GIRONA') ||
      u.includes('FIGUERES')
    );
  };

  // Valor por defecto Sin IVA para C-0 (Especial General)
  const getC0SinIvaDefault = (stName: string, isPropia?: boolean): number => {
    if (isC0Orange(stName)) {
      return Number(getSpecialRateActualPrice(stName).toFixed(3));
    }
    const costoTotal = getStationBasePrice(stName, isPropia);
    return Number((costoTotal + 0.024).toFixed(3));
  };

  // Datos completos de precios y estado para C-0 (Especial General)
  const getC0Prices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getC0SinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_c0_general_${stName}_Especial General C-0_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_c0_general_${stName}_Especial General C-0_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
      isOrange: isC0Orange(stName),
    };
  };

  // Helper para identificar estaciones con celda Naranja en ROR (copian Precio Actual / Especial de Tarifas Especiales de Compras)
  const isRorOrange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('ALFAJARIN') ||
      u.includes('TORREMOCHA') ||
      u.includes('CATARROJA') ||
      u.includes('MANISES') ||
      u.includes('ABRERA')
    );
  };

  // Valor por defecto Sin IVA para Especial ROR
  const getRorSinIvaDefault = (stName: string, isPropia?: boolean): number => {
    if (isRorOrange(stName)) {
      return Number(getSpecialRateActualPrice(stName).toFixed(3));
    }
    const costoTotal = getStationBasePrice(stName, isPropia);
    return Number((costoTotal + 0.024).toFixed(3));
  };

  // Datos completos de precios y estado para Especial ROR
  const getRorPrices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getRorSinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_ror_esteban_${stName}_Especial ROR_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_ror_esteban_${stName}_Especial ROR_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
      isOrange: isRorOrange(stName),
      isGreen: false,
    };
  };

  // Helper para identificar estaciones con celda Verde en Esteban (copian Tarifa 24 Sin IVA)
  const isEstebanGreen = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('PUERTO DE BARCELONA') ||
      u.includes('GIRONA') ||
      u.includes('FEGOBLAN') ||
      u.includes('VEGA DE VALCARCE') ||
      u.includes('HOILA TOLEDO')
    );
  };

  // Helper para identificar estaciones con celda Naranja en Esteban (copian Precio Actual / Especial de Tarifas Especiales de Compras)
  const isEstebanOrange = (stName: string): boolean => {
    if (isEstebanGreen(stName)) return false;
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('ARCOS') ||
      u.includes('ALFAJARIN') ||
      u.includes('TORREMOCHA') ||
      u.includes('MADRID') ||
      u.includes('PAMPLONA') ||
      u.includes('UCLES') ||
      u.includes('ALCUBILLAS') ||
      u.includes('RIBA-ROJA') ||
      u.includes('PISTA DE SILLA') ||
      u.includes('REAL DE GANDIA') ||
      u.includes('CHIVA') ||
      u.includes('ALBERIC') ||
      u.includes('CATARROJA') ||
      u.includes('MANISES') ||
      u.includes('CASAR') ||
      u.includes('OLIVERAL') ||
      u.includes('GUARROMAN') ||
      u.includes('BERA') ||
      u.includes('FIGUERES')
    );
  };

  // Valor por defecto Sin IVA para Especial Esteban
  const getEstebanSinIvaDefault = (stName: string, isPropia?: boolean): number => {
    if (isEstebanGreen(stName)) {
      const t24Key = `STD_${stName}_T24_sinIva`;
      if (customFormulas[t24Key]) {
        return Number(customFormulas[t24Key].evaluatedValue.toFixed(3));
      }
      const base = getStationBasePrice(stName, isPropia);
      return Number((base + 0.024).toFixed(3));
    }
    if (isEstebanOrange(stName)) {
      return Number(getSpecialRateActualPrice(stName).toFixed(3));
    }
    const costoTotal = getStationBasePrice(stName, isPropia);
    return Number((costoTotal + 0.024).toFixed(3));
  };

  // Datos completos de precios y estado para Especial Esteban
  const getEstebanPrices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getEstebanSinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_ror_esteban_${stName}_Especial Esteban_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_ror_esteban_${stName}_Especial Esteban_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
      isGreen: isEstebanGreen(stName),
      isOrange: isEstebanOrange(stName),
    };
  };

  // Helper para identificar estaciones con celda Naranja en Tarifa 30 (ABRERA toma Precio Actual / Especial de Compras)
  const isTarifa30Orange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return u.includes('ABRERA');
  };

  // Valor por defecto Sin IVA para Tarifa 90 Miki (P. Venta Sugerido GOA + 0.09)
  const getMikiSinIvaDefault = (stName: string, isPropia?: boolean): number => {
    const costoTotal = getStationBasePrice(stName, isPropia);
    return Number((costoTotal + 0.09).toFixed(3));
  };

  // Datos completos de precios y estado para Tarifa 90 Miki
  const getMikiPrices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getMikiSinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_miki_ecotrans_tarifa30_${stName}_Tarifa 90 Miki_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_miki_ecotrans_tarifa30_${stName}_Tarifa 90 Miki_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
    };
  };

  // Valor por defecto Sin IVA para Tarifa ECOTRANS (P. Venta Sugerido GOA + 0.05)
  const getEcotransSinIvaDefault = (stName: string, isPropia?: boolean): number => {
    const costoTotal = getStationBasePrice(stName, isPropia);
    return Number((costoTotal + 0.05).toFixed(3));
  };

  // Datos completos de precios y estado para Tarifa ECOTRANS
  const getEcotransPrices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getEcotransSinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_miki_ecotrans_tarifa30_${stName}_Tarifa ECOTRANS_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_miki_ecotrans_tarifa30_${stName}_Tarifa ECOTRANS_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
    };
  };

  // Valor por defecto Sin IVA para Tarifa 30 (ABRERA = Precio Especial, Resto = P. Venta Sugerido GOA + 0.03)
  const getTarifa30SinIvaDefault = (stName: string, isPropia?: boolean): number => {
    if (isTarifa30Orange(stName)) {
      return Number(getSpecialRateActualPrice(stName).toFixed(3));
    }
    const costoTotal = getStationBasePrice(stName, isPropia);
    return Number((costoTotal + 0.03).toFixed(3));
  };

  // Datos completos de precios y estado para Tarifa 30
  const getTarifa30Prices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getTarifa30SinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_miki_ecotrans_tarifa30_${stName}_Tarifa 30_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_miki_ecotrans_tarifa30_${stName}_Tarifa 30_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
      isOrange: isTarifa30Orange(stName),
    };
  };

  // Helper para identificar estaciones con celda Naranja en Tarifas Sur (ABRERA toma Precio Actual / Especial de Compras)
  const isSurOrange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return u.includes('ABRERA');
  };

  // Helper para identificar estaciones con celda Verde en Tarifas Sur (+0.036 en Tarifa 27 / +0.024 en Tarifa 15)
  const isSurGreen = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    const greenList = [
      'VALDEHERRERA',
      'LA JOYOSA',
      'JUNDIZ NORPETROL',
      'OLIVERAL',
      'TJOIL SEVILLA',
      'BENAVENTE',
      'IRUN ZAISA III',
      'TARRAGONA',
      'AVILESINA',
      'LLERS',
      'MERIDA',
      'MURCIA',
      'NORIOIL',
      'SAN VICENTE DEL PALACIO',
      'WATERY ARANDA',
      'BERA',
      'PUERTO DE BARCELONA',
      'GIRONA-CALSINA',
      'FEGOBLAN PONTEVEDRA',
      'VEGA DE VALCARCE',
      'HOILA TOLEDO',
    ];
    return greenList.some((g) => u.includes(g) || g.includes(u));
  };

  // Valor por defecto Sin IVA para Tarifa 27 Sur
  // Naranja: Precio Actual / Especial de Compras
  // Verde: P. Venta Sugerido GOA + 0.036
  // Blanco: P. Venta Sugerido GOA + 0.027
  const getTarifa27SurSinIvaDefault = (stName: string, isPropia?: boolean): number => {
    if (isSurOrange(stName)) {
      return Number(getSpecialRateActualPrice(stName).toFixed(3));
    }
    const costoTotal = getStationBasePrice(stName, isPropia);
    const markup = isSurGreen(stName) ? 0.036 : 0.027;
    return Number((costoTotal + markup).toFixed(3));
  };

  // Datos completos de precios y estado para Tarifa 27 Sur
  const getTarifa27SurPrices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getTarifa27SurSinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_sur_benito_${stName}_Tarifa 27 Sur_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_sur_benito_${stName}_Tarifa 27 Sur_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
      isOrange: isSurOrange(stName),
      isGreen: isSurGreen(stName),
    };
  };

  // Valor por defecto Sin IVA para Tarifa 15 Sur
  // Naranja: Precio Actual / Especial de Compras
  // Verde: P. Venta Sugerido GOA + 0.024
  // Blanco: P. Venta Sugerido GOA + 0.015
  const getTarifa15SurSinIvaDefault = (stName: string, isPropia?: boolean): number => {
    if (isSurOrange(stName)) {
      return Number(getSpecialRateActualPrice(stName).toFixed(3));
    }
    const costoTotal = getStationBasePrice(stName, isPropia);
    const markup = isSurGreen(stName) ? 0.024 : 0.015;
    return Number((costoTotal + markup).toFixed(3));
  };

  // Datos completos de precios y estado para Tarifa 15 Sur
  const getTarifa15SurPrices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getTarifa15SurSinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_sur_benito_${stName}_Tarifa 15 Sur_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_sur_benito_${stName}_Tarifa 15 Sur_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
      isOrange: isSurOrange(stName),
      isGreen: isSurGreen(stName),
    };
  };

  // Valor por defecto Sin IVA para Tarifa Especial 75: P. Venta Sugerido GOA + 0.038
  const getTarifa75SinIvaDefault = (stName: string, isPropia?: boolean): number => {
    const costoTotal = getStationBasePrice(stName, isPropia);
    return Number((costoTotal + 0.038).toFixed(3));
  };

  // Datos completos de precios y estado para Tarifa Especial 75
  const getTarifa75Prices = (stName: string, isPropia?: boolean) => {
    const defaultSinIva = getTarifa75SinIvaDefault(stName, isPropia);
    const sinIvaKey = `SPEC_tarifa_75_${stName}_Tarifa 75_sinIva`;
    const customSinIva = customFormulas[sinIvaKey];
    const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

    const defaultConIva = Number((sinIva * 1.21).toFixed(3));
    const conIvaKey = `SPEC_tarifa_75_${stName}_Tarifa 75_conIva`;
    const customConIva = customFormulas[conIvaKey];
    const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

    return {
      sinIvaKey,
      customSinIva,
      sinIva,
      defaultSinIva,
      conIvaKey,
      customConIva,
      conIva,
      defaultConIva,
    };
  };

  const allStations = [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];

  const filteredStations = allStations.filter((st) => {
    const matchesSearch = st.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = typeFilter === 'ALL' || st.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Guardar fórmula en celda
  const handleSaveFormula = (cellKey: string, rawFormula: string, evaluatedValue: number) => {
    const updated = saveSabanaFormula(selectedDate, cellKey, {
      rawFormula,
      evaluatedValue,
      updatedAt: new Date().toISOString(),
    });
    setCustomFormulas(updated);
    setDownloadToast(`Fórmula guardada para ${cellKey}`);
    setTimeout(() => setDownloadToast(null), 3000);
  };

  // Eliminar fórmula de celda
  const handleRemoveFormula = (cellKey: string) => {
    const updated = removeSabanaFormula(selectedDate, cellKey);
    setCustomFormulas(updated);
    setDownloadToast(`Fórmula restablecida a valor original`);
    setTimeout(() => setDownloadToast(null), 3000);
  };

  // Limpiar todas las fórmulas
  const handleClearAllFormulas = () => {
    if (window.confirm('¿Seguro que deseas eliminar todas las fórmulas personalizadas de la Sábana de Precios y volver a los valores estándar?')) {
      clearAllSabanaFormulas(selectedDate);
      setCustomFormulas({});
      setDownloadToast('Todas las fórmulas han sido restablecidas.');
      setTimeout(() => setDownloadToast(null), 3000);
    }
  };

  // Aplicar fórmula a toda la columna de Tarifas Estándar
  const handleApplyFormulaToStandardColumn = (tariffId: string, isConIva: boolean, rawFormula: string) => {
    const field = isConIva ? 'conIva' : 'sinIva';
    const { map } = getProgramVariables(selectedDate);
    const updatedFormulas = { ...customFormulas };

    allStations.forEach((st) => {
      const cellKey = `STD_${st.name}_T${tariffId}_${field}`;
      const evalRes = evaluateFormula(rawFormula, map);
      if (evalRes.success) {
        saveSabanaFormula(selectedDate, cellKey, {
          rawFormula,
          evaluatedValue: evalRes.value,
          updatedAt: new Date().toISOString(),
        });
        updatedFormulas[cellKey] = {
          rawFormula,
          evaluatedValue: evalRes.value,
          updatedAt: new Date().toISOString(),
        };
      }
    });

    setCustomFormulas(updatedFormulas);
    setDownloadToast(`Fórmula aplicada a toda la columna Tarifa ${tariffId} (${isConIva ? 'Con IVA' : 'Sin IVA'})`);
    setTimeout(() => setDownloadToast(null), 3500);
  };

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

  // Descarga de la tabla de Tarifas Estándar con valores efectivos
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
        const defaultSinIva = Number((base + t.markup).toFixed(3));
        const sinIvaKey = `STD_${st.name}_T${t.id}_sinIva`;
        const sinIva = customFormulas[sinIvaKey]?.evaluatedValue ?? defaultSinIva;

        const defaultConIva = Number((sinIva * 1.21).toFixed(3));
        const conIvaKey = `STD_${st.name}_T${t.id}_conIva`;
        const conIva = customFormulas[conIvaKey]?.evaluatedValue ?? defaultConIva;

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
        const defaultSinIva = Number((base + t.markup).toFixed(3));
        const sinIvaKey = `STD_${st.name}_T${t.id}_sinIva`;
        const sinIva = customFormulas[sinIvaKey]?.evaluatedValue ?? defaultSinIva;

        const defaultConIva = Number((sinIva * 1.21).toFixed(3));
        const conIvaKey = `STD_${st.name}_T${t.id}_conIva`;
        const conIva = customFormulas[conIvaKey]?.evaluatedValue ?? defaultConIva;

        csv += `${sinIva.toFixed(3).replace('.', ',')};${conIva.toFixed(3).replace('.', ',')};`;
      });
      csv += '\n';
    });

    triggerDownload(`SABANA_TARIFAS_12_60_${selectedDate}.csv`, csv);
  };

  // Descarga de un bloque de Tarifa Especial individual
  const handleExportSpecialBlockCsv = (block: SpecialTariffGroupDef) => {
    if (block.id === 'los_javi') {
      let csv = 'EESS DE SERVICIO;ESPECIAL JAVI SIN IVA;ESPECIAL JAVI CON IVA;ESPECIAL CARRERAS SIN IVA;ESPECIAL CARRERAS CON IVA;\n';
      // Propias
      PROPIAS_STATIONS.forEach((st) => {
        const javi = getJaviPrices(st.name, true);
        const carreras = getCarrerasPrices(st.name, true);
        csv += `${st.name};${javi.sinIva.toFixed(3).replace('.', ',')};${javi.conIva.toFixed(3).replace('.', ',')};${carreras.sinIva.toFixed(3).replace('.', ',')};${carreras.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      // Separador COLABORADORAS
      csv += 'COLABORADORAS;-;0,000;-;0,000;\n';
      // Colaboradoras
      COLABORADORA_STATIONS.forEach((st) => {
        const javi = getJaviPrices(st.name, false);
        const carreras = getCarrerasPrices(st.name, false);
        csv += `${st.name};${javi.sinIva.toFixed(3).replace('.', ',')};${javi.conIva.toFixed(3).replace('.', ',')};${carreras.sinIva.toFixed(3).replace('.', ',')};${carreras.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      triggerDownload(`TARIFA_ESPECIAL_LOS_JAVI_Y_CARRERAS_${selectedDate}.csv`, csv);
      return;
    }

    if (block.id === 'transfrired') {
      let csv = 'EESS DE SERVICIO;ESPECIAL TRANSFRIRED SIN IVA;CON IVA;\n';
      // Propias
      PROPIAS_STATIONS.forEach((st) => {
        const tf = getTransfriredPrices(st.name, true);
        csv += `${st.name};${tf.sinIva.toFixed(3).replace('.', ',')};${tf.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      // Separador COLABORADORAS
      csv += 'COLABORADORAS;-;0,000;\n';
      // Colaboradoras
      COLABORADORA_STATIONS.forEach((st) => {
        const tf = getTransfriredPrices(st.name, false);
        csv += `${st.name};${tf.sinIva.toFixed(3).replace('.', ',')};${tf.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      triggerDownload(`TARIFA_ESPECIAL_TRANSFRIRED_${selectedDate}.csv`, csv);
      return;
    }

    if (block.id === 'c0_general') {
      let csv = 'EESS DE SERVICIO;ESPECIAL GENERAL C-0 SIN IVA;CON IVA;\n';
      // Propias
      PROPIAS_STATIONS.forEach((st) => {
        const c0 = getC0Prices(st.name, true);
        csv += `${st.name};${c0.sinIva.toFixed(3).replace('.', ',')};${c0.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      // Separador COLABORADORAS
      csv += 'COLABORADORAS;-;0,000;\n';
      // Colaboradoras
      COLABORADORA_STATIONS.forEach((st) => {
        const c0 = getC0Prices(st.name, false);
        csv += `${st.name};${c0.sinIva.toFixed(3).replace('.', ',')};${c0.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      triggerDownload(`TARIFA_C0_ESPECIAL_GENERAL_${selectedDate}.csv`, csv);
      return;
    }

    if (block.id === 'ror_esteban') {
      let csv = 'EESS DE SERVICIO;ESPECIAL ROR SIN IVA;ESPECIAL ROR CON IVA;ESPECIAL ESTEBAN SIN IVA;ESPECIAL ESTEBAN CON IVA;\n';
      // Propias
      PROPIAS_STATIONS.forEach((st) => {
        const ror = getRorPrices(st.name, true);
        const esteban = getEstebanPrices(st.name, true);
        csv += `${st.name};${ror.sinIva.toFixed(3).replace('.', ',')};${ror.conIva.toFixed(3).replace('.', ',')};${esteban.sinIva.toFixed(3).replace('.', ',')};${esteban.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      // Separador COLABORADORAS
      csv += 'COLABORADORAS;-;0,000;-;0,000;\n';
      // Colaboradoras
      COLABORADORA_STATIONS.forEach((st) => {
        const ror = getRorPrices(st.name, false);
        const esteban = getEstebanPrices(st.name, false);
        csv += `${st.name};${ror.sinIva.toFixed(3).replace('.', ',')};${ror.conIva.toFixed(3).replace('.', ',')};${esteban.sinIva.toFixed(3).replace('.', ',')};${esteban.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      triggerDownload(`TARIFA_ESPECIAL_ROR_Y_ESTEBAN_${selectedDate}.csv`, csv);
      return;
    }

    if (block.id === 'miki_ecotrans_tarifa30') {
      let csv = 'EESS DE SERVICIO;TARIFA 90 MIKI SIN IVA;CON IVA;TARIFA ECOTRANS SIN IVA;CON IVA;TARIFA 30 SIN IVA;CON IVA;\n';
      // Propias
      PROPIAS_STATIONS.forEach((st) => {
        const miki = getMikiPrices(st.name, true);
        const eco = getEcotransPrices(st.name, true);
        const t30 = getTarifa30Prices(st.name, true);
        csv += `${st.name};${miki.sinIva.toFixed(3).replace('.', ',')};${miki.conIva.toFixed(3).replace('.', ',')};${eco.sinIva.toFixed(3).replace('.', ',')};${eco.conIva.toFixed(3).replace('.', ',')};${t30.sinIva.toFixed(3).replace('.', ',')};${t30.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      // Separador COLABORADORAS
      csv += 'COLABORADORAS;-;0,000;-;0,000;-;0,000;\n';
      // Colaboradoras
      COLABORADORA_STATIONS.forEach((st) => {
        const miki = getMikiPrices(st.name, false);
        const eco = getEcotransPrices(st.name, false);
        const t30 = getTarifa30Prices(st.name, false);
        csv += `${st.name};${miki.sinIva.toFixed(3).replace('.', ',')};${miki.conIva.toFixed(3).replace('.', ',')};${eco.sinIva.toFixed(3).replace('.', ',')};${eco.conIva.toFixed(3).replace('.', ',')};${t30.sinIva.toFixed(3).replace('.', ',')};${t30.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      triggerDownload(`TARIFA_90_MIKI_ECOTRANS_TARIFA30_${selectedDate}.csv`, csv);
      return;
    }

    if (block.id === 'sur_benito') {
      let csv = 'EESS DE SERVICIO;TARIFA 27 SUR SIN IVA;CON IVA;TARIFA 15 SUR SIN IVA;CON IVA;\n';
      // Propias
      PROPIAS_STATIONS.forEach((st) => {
        const t27 = getTarifa27SurPrices(st.name, true);
        const t15 = getTarifa15SurPrices(st.name, true);
        csv += `${st.name};${t27.sinIva.toFixed(3).replace('.', ',')};${t27.conIva.toFixed(3).replace('.', ',')};${t15.sinIva.toFixed(3).replace('.', ',')};${t15.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      // Separador COLABORADORAS
      csv += 'COLABORADORAS;-;0,000;-;0,000;\n';
      // Colaboradoras
      COLABORADORA_STATIONS.forEach((st) => {
        const t27 = getTarifa27SurPrices(st.name, false);
        const t15 = getTarifa15SurPrices(st.name, false);
        csv += `${st.name};${t27.sinIva.toFixed(3).replace('.', ',')};${t27.conIva.toFixed(3).replace('.', ',')};${t15.sinIva.toFixed(3).replace('.', ',')};${t15.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      triggerDownload(`TARIFA_SUR_BENITO_${selectedDate}.csv`, csv);
      return;
    }

    if (block.id === 'tarifa_75') {
      let csv = 'EESS DE SERVICIO;TARIFA 75 SIN IVA;CON IVA;\n';
      // Propias
      PROPIAS_STATIONS.forEach((st) => {
        const t75 = getTarifa75Prices(st.name, true);
        csv += `${st.name};${t75.sinIva.toFixed(3).replace('.', ',')};${t75.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      // Separador COLABORADORAS
      csv += 'COLABORADORAS;-;0,000;\n';
      // Colaboradoras
      COLABORADORA_STATIONS.forEach((st) => {
        const t75 = getTarifa75Prices(st.name, false);
        csv += `${st.name};${t75.sinIva.toFixed(3).replace('.', ',')};${t75.conIva.toFixed(3).replace('.', ',')};\n`;
      });
      triggerDownload(`TARIFA_ESPECIAL_75_${selectedDate}.csv`, csv);
      return;
    }

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
        const defaultSinIva = Number((base + t.markup).toFixed(3));
        const sinIvaKey = `SPEC_${block.id}_${st.name}_${t.name}_sinIva`;
        const sinIva = customFormulas[sinIvaKey]?.evaluatedValue ?? defaultSinIva;

        const defaultConIva = Number((sinIva * 1.21).toFixed(3));
        const conIvaKey = `SPEC_${block.id}_${st.name}_${t.name}_conIva`;
        const conIva = customFormulas[conIvaKey]?.evaluatedValue ?? defaultConIva;

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
        const defaultSinIva = Number((base + t.markup).toFixed(3));
        const sinIvaKey = `SPEC_${block.id}_${st.name}_${t.name}_sinIva`;
        const sinIva = customFormulas[sinIvaKey]?.evaluatedValue ?? defaultSinIva;

        const defaultConIva = Number((sinIva * 1.21).toFixed(3));
        const conIvaKey = `SPEC_${block.id}_${st.name}_${t.name}_conIva`;
        const conIva = customFormulas[conIvaKey]?.evaluatedValue ?? defaultConIva;

        csv += `${sinIva.toFixed(3).replace('.', ',')};${conIva.toFixed(3).replace('.', ',')};`;
      });
      csv += '\n';
    });

    const cleanName = block.title.replace(/\s+/g, '_').toUpperCase();
    triggerDownload(`${cleanName}_${selectedDate}.csv`, csv);
  };

  const renderSpecialBlockTable = (block: SpecialTariffGroupDef) => {
    let columns: {
      name: string;
      headerTheme: string;
      getPrices: (stName: string, isPropia: boolean) => {
        sinIvaKey: string;
        conIvaKey: string;
        sinIva: number;
        defaultSinIva: number;
        conIva: number;
        defaultConIva: number;
        customSinIva?: CellFormula;
        customConIva?: CellFormula;
        isOrange?: boolean;
        isGreen?: boolean;
        sinIvaTitle: string;
        conIvaTitle: string;
        columnLabel: string;
        conIvaLabel?: string;
        tooltip: string;
      };
    }[] = [];

    if (block.id === 'los_javi') {
      columns = [
        {
          name: 'ESPECIAL JAVI',
          headerTheme: 'text-amber-300 bg-amber-950/20 border-b border-amber-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getJaviPrices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              isOrange: p.isOrange,
              sinIvaTitle: `${stName} — Especial Javi (Sin IVA)`,
              conIvaTitle: `${stName} — Especial Javi (Con IVA)`,
              columnLabel: `Especial Javi Sin IVA (${p.isOrange ? 'Naranja: Especial' : 'Blanco: P.Venta+0.024'})`,
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : p.isOrange ? 'Naranja: Copiado de Precio Actual / Especial de Tarifas Especiales' : 'Blanco: P. Venta Sugerido GOA + 0.024',
            };
          },
        },
        {
          name: 'ESPECIAL CARRERAS',
          headerTheme: 'text-amber-300 bg-amber-950/20 border-b border-amber-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getCarrerasPrices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              isOrange: p.isOrange,
              sinIvaTitle: `${stName} — Especial Carreras (Sin IVA)`,
              conIvaTitle: `${stName} — Especial Carreras (Con IVA)`,
              columnLabel: `Especial Carreras Sin IVA (${p.isOrange ? 'Naranja: Especial' : 'Blanco: P.Venta+0.018'})`,
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : p.isOrange ? 'Naranja: Copiado de Precio Actual / Especial de Tarifas Especiales' : 'Blanco: P. Venta Sugerido GOA + 0.018',
            };
          },
        },
      ];
    } else if (block.id === 'transfrired') {
      columns = [
        {
          name: 'ESPECIAL TRANSFRIRED',
          headerTheme: 'text-emerald-400 bg-emerald-950/20 border-b border-emerald-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getTransfriredPrices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              isOrange: p.isOrange,
              sinIvaTitle: `${stName} — Especial Transfrired (Sin IVA)`,
              conIvaTitle: `${stName} — Especial Transfrired (Con IVA)`,
              columnLabel: `Especial Transfrired Sin IVA (${p.isOrange ? 'Naranja: Especial' : 'Blanco: P.Venta+0.024'})`,
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : p.isOrange ? 'Naranja: Copiado de Precio Actual / Especial de Tarifas Especiales' : 'Blanco: P. Venta Sugerido GOA + 0.024',
            };
          },
        },
      ];
    } else if (block.id === 'c0_general') {
      columns = [
        {
          name: 'ESPECIAL GENERAL C-0',
          headerTheme: 'text-emerald-400 bg-emerald-950/20 border-b border-emerald-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getC0Prices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              isOrange: p.isOrange,
              sinIvaTitle: `${stName} — Especial General C-0 (Sin IVA)`,
              conIvaTitle: `${stName} — Especial General C-0 (Con IVA)`,
              columnLabel: `Especial General C-0 Sin IVA (${p.isOrange ? 'Naranja: Especial' : 'Blanco: P.Venta+0.024'})`,
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : p.isOrange ? 'Naranja: Copiado de Precio Actual / Especial de Tarifas Especiales' : 'Blanco: P. Venta Sugerido GOA + 0.024',
            };
          },
        },
      ];
    } else if (block.id === 'ror_esteban') {
      columns = [
        {
          name: 'ESPECIAL ROR',
          headerTheme: 'text-cyan-300 bg-cyan-950/20 border-b border-cyan-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getRorPrices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              isOrange: p.isOrange,
              isGreen: p.isGreen,
              sinIvaTitle: `${stName} — Especial ROR (Sin IVA)`,
              conIvaTitle: `${stName} — Especial ROR (Con IVA)`,
              columnLabel: `Especial ROR Sin IVA (${p.isGreen ? 'Verde: Tarifa 24' : p.isOrange ? 'Naranja: Especial' : 'Blanco: P.Venta+0.024'})`,
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : p.isGreen ? 'Verde: Tarifa 24 Sin IVA' : p.isOrange ? 'Naranja: Copiado de Precio Actual / Especial de Tarifas Especiales' : 'Blanco: P. Venta Sugerido GOA + 0.024',
            };
          },
        },
        {
          name: 'ESPECIAL ESTEBAN',
          headerTheme: 'text-cyan-300 bg-cyan-950/20 border-b border-cyan-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getEstebanPrices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              isOrange: p.isOrange,
              isGreen: p.isGreen,
              sinIvaTitle: `${stName} — Especial Esteban (Sin IVA)`,
              conIvaTitle: `${stName} — Especial Esteban (Con IVA)`,
              columnLabel: `Especial Esteban Sin IVA (${p.isGreen ? 'Verde: Tarifa 24' : p.isOrange ? 'Naranja: Especial' : 'Blanco: P.Venta+0.024'})`,
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : p.isGreen ? 'Verde: Tarifa 24 Sin IVA' : p.isOrange ? 'Naranja: Copiado de Precio Actual / Especial de Tarifas Especiales' : 'Blanco: P. Venta Sugerido GOA + 0.024',
            };
          },
        },
      ];
    } else if (block.id === 'miki_ecotrans_tarifa30') {
      columns = [
        {
          name: 'TARIFA 90 MIKI',
          headerTheme: 'text-amber-300 bg-amber-950/20 border-b border-amber-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getMikiPrices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              sinIvaTitle: `${stName} — Tarifa 90 Miki (Sin IVA)`,
              conIvaTitle: `${stName} — Tarifa 90 Miki (Con IVA)`,
              columnLabel: 'Tarifa 90 Miki Sin IVA (=P.Venta+0.090)',
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : 'Blanco: P. Venta Sugerido GOA + 0.090',
            };
          },
        },
        {
          name: 'TARIFA ECOTRANS',
          headerTheme: 'text-emerald-400 bg-emerald-950/20 border-b border-emerald-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getEcotransPrices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              sinIvaTitle: `${stName} — Tarifa ECOTRANS (Sin IVA)`,
              conIvaTitle: `${stName} — Tarifa ECOTRANS (Con IVA)`,
              columnLabel: 'Tarifa ECOTRANS Sin IVA (=P.Venta+0.050)',
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : 'Blanco: P. Venta Sugerido GOA + 0.050',
            };
          },
        },
        {
          name: 'TARIFA 30',
          headerTheme: 'text-amber-300 bg-amber-950/20 border-b border-amber-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getTarifa30Prices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              isOrange: p.isOrange,
              sinIvaTitle: `${stName} — Tarifa 30 (Sin IVA)`,
              conIvaTitle: `${stName} — Tarifa 30 (Con IVA)`,
              columnLabel: `Tarifa 30 Sin IVA (${p.isOrange ? 'Naranja: Abrera Especial' : 'Blanco: P.Venta+0.030'})`,
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : 'Naranja: ABRERA toma Precio Especial | Blanco: P. Venta Sugerido GOA + 0.030',
            };
          },
        },
      ];
    } else if (block.id === 'sur_benito') {
      columns = [
        {
          name: 'TARIFA 27 SUR',
          headerTheme: 'text-purple-300 bg-purple-950/20 border-b border-purple-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getTarifa27SurPrices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              isOrange: p.isOrange,
              isGreen: p.isGreen,
              sinIvaTitle: `${stName} — Tarifa 27 Sur (Sin IVA)`,
              conIvaTitle: `${stName} — Tarifa 27 Sur (Con IVA)`,
              columnLabel: `Tarifa 27 Sur Sin IVA (${p.isGreen ? 'Verde: P.Venta+0.036' : p.isOrange ? 'Naranja: Especial' : 'Blanco: P.Venta+0.027'})`,
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : p.isGreen ? 'Verde: P. Venta Sugerido GOA + 0.036' : p.isOrange ? 'Naranja: Copiado de Precio Actual / Especial de Tarifas Especiales' : 'Blanco: P. Venta Sugerido GOA + 0.027',
            };
          },
        },
        {
          name: 'TARIFA 15 SUR',
          headerTheme: 'text-purple-300 bg-purple-950/20 border-b border-purple-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getTarifa15SurPrices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              isOrange: p.isOrange,
              isGreen: p.isGreen,
              sinIvaTitle: `${stName} — Tarifa 15 Sur (Sin IVA)`,
              conIvaTitle: `${stName} — Tarifa 15 Sur (Con IVA)`,
              columnLabel: `Tarifa 15 Sur Sin IVA (${p.isGreen ? 'Verde: P.Venta+0.024' : p.isOrange ? 'Naranja: Especial' : 'Blanco: P.Venta+0.015'})`,
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : p.isGreen ? 'Verde: P. Venta Sugerido GOA + 0.024' : p.isOrange ? 'Naranja: Copiado de Precio Actual / Especial de Tarifas Especiales' : 'Blanco: P. Venta Sugerido GOA + 0.015',
            };
          },
        },
      ];
    } else if (block.id === 'tarifa_75') {
      columns = [
        {
          name: 'TARIFA ESPECIAL 75',
          headerTheme: 'text-cyan-300 bg-cyan-950/20 border-b border-cyan-500/30',
          getPrices: (stName: string, isPropia: boolean) => {
            const p = getTarifa75Prices(stName, isPropia);
            return {
              sinIvaKey: p.sinIvaKey,
              conIvaKey: p.conIvaKey,
              sinIva: p.sinIva,
              defaultSinIva: p.defaultSinIva,
              conIva: p.conIva,
              defaultConIva: p.defaultConIva,
              customSinIva: p.customSinIva,
              customConIva: p.customConIva,
              sinIvaTitle: `${stName} — Tarifa 75 (Sin IVA)`,
              conIvaTitle: `${stName} — Tarifa 75 (Con IVA)`,
              columnLabel: 'Tarifa 75 Sin IVA (=P.Venta+0.038)',
              tooltip: p.customSinIva ? `Fórmula: ${p.customSinIva.rawFormula}` : 'Blanco: P. Venta Sugerido GOA + 0.038',
            };
          },
        },
      ];
    } else {
      columns = block.tariffs.map((t) => ({
        name: t.name,
        headerTheme: 'text-amber-300 bg-amber-950/20 border-b border-amber-500/30',
        getPrices: (stName: string, isPropia: boolean) => {
          const base = getStationBasePrice(stName, isPropia);
          const defaultSinIva = Number((base + t.markup).toFixed(3));
          const sinIvaKey = `SPEC_${block.id}_${stName}_${t.name}_sinIva`;
          const customSinIva = customFormulas[sinIvaKey];
          const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;
          const defaultConIva = Number((sinIva * 1.21).toFixed(3));
          const conIvaKey = `SPEC_${block.id}_${stName}_${t.name}_conIva`;
          const customConIva = customFormulas[conIvaKey];
          const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;
          return {
            sinIvaKey,
            conIvaKey,
            sinIva,
            defaultSinIva,
            conIva,
            defaultConIva,
            customSinIva,
            customConIva,
            sinIvaTitle: `${stName} — ${block.title} > ${t.name} (Sin IVA)`,
            conIvaTitle: `${stName} — ${block.title} > ${t.name} (Con IVA)`,
            columnLabel: `${block.title} - ${t.name} Sin IVA`,
            tooltip: customSinIva ? `Fórmula: ${customSinIva.rawFormula}` : `Sin IVA: Base + ${t.markup}`,
          };
        },
      }));
    }

    return (
      <div className="overflow-x-auto max-h-[70vh] mt-4 rounded-2xl border border-slate-800 shadow-inner">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-950 z-20">
            <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
              <th className="py-3 px-4 w-12 text-center" rowSpan={2}>
                Nº
              </th>
              <th className="py-3 px-6 sticky left-0 bg-slate-950 z-30 border-r border-slate-800" rowSpan={2}>
                Estación
              </th>
              {columns.map((col, cIdx) => (
                <th
                  key={cIdx}
                  colSpan={2}
                  className={`py-2.5 px-6 text-center font-extrabold uppercase text-xs tracking-wider border-l border-slate-800 ${col.headerTheme}`}
                >
                  {col.name}
                </th>
              ))}
            </tr>
            <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              {columns.map((col, cIdx) => (
                <React.Fragment key={cIdx}>
                  <th className="py-2 px-3 text-center text-slate-300 bg-slate-950 border-l border-slate-800">
                    Sin IVA
                  </th>
                  <th className="py-2 px-3 text-center text-emerald-400 bg-slate-950/90 border-r border-slate-800">
                    Con IVA
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredStations.map((st, idx) => {
              const isPropia = st.type === 'PROPIA';
              const isFirstColab =
                typeFilter === 'ALL' &&
                !searchFilter &&
                st.type === 'COLABORADORA' &&
                (idx === PROPIAS_STATIONS.length || (idx > 0 && filteredStations[idx - 1]?.type === 'PROPIA'));
              const isRedAccent = st.name === 'GUARROMAN' || st.name === 'MURCIA';

              return (
                <React.Fragment key={st.name}>
                  {isFirstColab && (
                    <tr className="bg-yellow-400 text-slate-950 font-black tracking-wider text-xs border-y-2 border-yellow-500 shadow-sm">
                      <td className="py-2 px-4 text-center font-black text-slate-950 bg-yellow-400">-</td>
                      <td
                        className="py-2 px-6 font-black text-slate-950 sticky left-0 bg-yellow-400 z-10"
                        colSpan={1 + columns.length * 2}
                      >
                        COLABORADORAS
                      </td>
                    </tr>
                  )}

                  <tr className={`hover:bg-slate-800/40 transition-colors ${isRedAccent ? 'border-t-2 border-rose-500' : ''}`}>
                    {/* 1. Nº */}
                    <td className="py-2.5 px-4 text-center font-bold text-slate-500 font-mono text-xs">
                      {idx + 1}
                    </td>

                    {/* 2. Estación */}
                    <td
                      className={`py-2.5 px-6 font-bold sticky left-0 z-10 border-r border-slate-800 font-sans ${
                        isBlueSpecialStation(st.name)
                          ? 'bg-blue-900/50 text-blue-200 border-l-4 border-l-blue-400 font-black'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        {isRedAccent && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />}
                        <span>{st.name}</span>
                      </div>
                    </td>

                    {/* Columnas de Tarifas */}
                    {columns.map((col, cIdx) => {
                      const data = col.getPrices(st.name, isPropia);

                      return (
                        <React.Fragment key={cIdx}>
                          {/* Sin IVA */}
                          <td
                            onClick={() => {
                              setActiveModalCell({
                                cellKey: data.sinIvaKey,
                                cellTitle: data.sinIvaTitle,
                                defaultValue: data.defaultSinIva,
                                currentFormula: data.customSinIva?.rawFormula,
                                columnLabel: data.columnLabel,
                              });
                            }}
                            className={`py-2.5 px-4 text-center border-l border-slate-800/50 ${
                              isFormulaMode ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-pointer'
                            }`}
                            title={data.tooltip}
                          >
                            <div className="inline-flex items-center justify-center">
                              <div
                                className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-center transition-all ${
                                  data.customSinIva
                                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-md font-black'
                                    : data.isGreen
                                    ? 'bg-[#92D050] text-slate-950 font-black shadow-sm'
                                    : data.isOrange
                                    ? 'bg-[#FFC000] text-slate-950 font-black shadow-sm'
                                    : 'bg-slate-950 border border-slate-700/60 text-slate-200 hover:border-slate-500'
                                }`}
                              >
                                {data.customSinIva && (
                                  <span className="mr-1 text-[9px] font-black bg-slate-950 text-amber-400 px-1 rounded">fx</span>
                                )}
                                {data.sinIva.toFixed(3).replace('.', ',')}
                              </div>
                            </div>
                          </td>

                          {/* Con IVA */}
                          <td
                            onClick={() => {
                              setActiveModalCell({
                                cellKey: data.conIvaKey,
                                cellTitle: data.conIvaTitle,
                                defaultValue: data.defaultConIva,
                                currentFormula: data.customConIva?.rawFormula,
                                columnLabel: data.conIvaLabel || `${col.name} Con IVA (=Sin IVA * 1.21)`,
                              });
                            }}
                            className={`py-2.5 px-4 text-center border-r border-slate-800/50 ${
                              isFormulaMode ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-pointer'
                            }`}
                            title={data.customConIva ? `Fórmula: ${data.customConIva.rawFormula}` : 'Con IVA: Sin IVA * 1.21'}
                          >
                            <div className="inline-flex items-center justify-center">
                              <div
                                className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-center transition-all ${
                                  data.customConIva
                                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-400 shadow-md font-black'
                                    : 'bg-slate-950 border border-emerald-500/40 text-emerald-400 font-bold hover:border-emerald-400'
                                }`}
                              >
                                {data.customConIva && (
                                  <span className="mr-1 text-[9px] font-black bg-slate-950 text-emerald-300 px-1 rounded">fx</span>
                                )}
                                {data.conIva.toFixed(3).replace('.', ',')}
                              </div>
                            </div>
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Botón Formular */}
            <button
              onClick={() => setIsFormulaMode((prev) => !prev)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${
                isFormulaMode
                  ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/30 font-black scale-105 shadow-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 hover:border-amber-400 shadow-slate-950/50'
              }`}
            >
              <Calculator className="h-4 w-4" />
              <span>{isFormulaMode ? '✓ Modo Formular ACTIVO' : 'Formular'}</span>
              {Object.keys(customFormulas).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-950 text-amber-300 border border-amber-500/40">
                  {Object.keys(customFormulas).length}
                </span>
              )}
            </button>

            <button
              onClick={handleExportStandardCsv}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:from-amber-400 hover:to-amber-300 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Descargar Sábana Estándar (Excel)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Banner Informativo del Modo Formulación Activo */}
      {isFormulaMode && (
        <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 shadow-xl">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center space-x-2">
                <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black text-[10px] uppercase">
                  Modo Formular Activo
                </span>
                <span>Haz clic sobre cualquiera de las celdas de precios en las tablas</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Al hacer clic se abrirá la ventana emergente para crear fórmulas matemáticas estilo Excel y seleccionar cualquier celda de Compras, Postes, Tarifas Especiales o Sábana.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {Object.keys(customFormulas).length > 0 && (
              <button
                onClick={handleClearAllFormulas}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restablecer Todo ({Object.keys(customFormulas).length})</span>
              </button>
            )}
            <button
              onClick={() => setIsFormulaMode(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700"
            >
              Salir del Modo Formular
            </button>
          </div>
        </div>
      )}

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
          {Object.keys(customFormulas).length > 0 && (
            <span className="inline-flex items-center space-x-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>fx = Personalizado ({Object.keys(customFormulas).length})</span>
            </span>
          )}
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
                      const defaultSinIva = Number((base + tariff.markup).toFixed(3));
                      const sinIvaKey = `STD_${st.name}_T${tariff.id}_sinIva`;
                      const customSinIva = customFormulas[sinIvaKey];
                      const sinIva = customSinIva ? customSinIva.evaluatedValue : defaultSinIva;

                      const defaultConIva = Number((sinIva * 1.21).toFixed(3));
                      const conIvaKey = `STD_${st.name}_T${tariff.id}_conIva`;
                      const customConIva = customFormulas[conIvaKey];
                      const conIva = customConIva ? customConIva.evaluatedValue : defaultConIva;

                      const isPurplePrice = isPurple && ['18', '36', '60'].includes(tariff.id);

                      return (
                        <React.Fragment key={`${st.name}_${tariff.id}`}>
                          {/* SIN IVA */}
                          <td
                            onClick={() => {
                              setActiveModalCell({
                                cellKey: sinIvaKey,
                                cellTitle: `${st.name} — Tarifa ${tariff.name} (Sin IVA)`,
                                defaultValue: defaultSinIva,
                                currentFormula: customSinIva?.rawFormula,
                                columnLabel: `Tarifa ${tariff.name} Sin IVA`,
                                onApplyToColumn: (f) => handleApplyFormulaToStandardColumn(tariff.id, false, f),
                              });
                            }}
                            className={`py-2 px-2 text-right font-mono relative transition-all group ${
                              isFormulaMode ? 'cursor-pointer hover:bg-amber-400/20 hover:scale-105 ring-1 ring-amber-400/40' : 'cursor-pointer'
                            } ${
                              customSinIva
                                ? 'bg-amber-500/20 text-amber-200 font-black ring-1 ring-amber-400 shadow-sm'
                                : isPurplePrice
                                ? 'bg-purple-950/40 text-purple-300 font-semibold'
                                : 'text-slate-300 bg-slate-900/10'
                            }`}
                            title={customSinIva ? `Fórmula personalizada: ${customSinIva.rawFormula}` : 'Haz clic para formular esta celda'}
                          >
                            <div className="flex items-center justify-end space-x-1">
                              {customSinIva && (
                                <span className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm">
                                  fx
                                </span>
                              )}
                              <span>{sinIva.toFixed(3).replace('.', ',')}</span>
                            </div>
                          </td>

                          {/* CON IVA */}
                          <td
                            onClick={() => {
                              setActiveModalCell({
                                cellKey: conIvaKey,
                                cellTitle: `${st.name} — Tarifa ${tariff.name} (Con IVA)`,
                                defaultValue: defaultConIva,
                                currentFormula: customConIva?.rawFormula,
                                columnLabel: `Tarifa ${tariff.name} Con IVA`,
                                onApplyToColumn: (f) => handleApplyFormulaToStandardColumn(tariff.id, true, f),
                              });
                            }}
                            className={`py-2 px-2 text-right font-bold font-mono border-r relative transition-all group ${
                              isFormulaMode ? 'cursor-pointer hover:bg-amber-400/20 hover:scale-105 ring-1 ring-amber-400/40' : 'cursor-pointer'
                            } ${
                              customConIva
                                ? 'bg-emerald-500/20 text-emerald-200 font-black ring-1 ring-emerald-400 shadow-sm'
                                : isPurplePrice
                                ? 'bg-purple-600/30 text-purple-200 font-black border-purple-500/40 shadow-inner'
                                : 'text-emerald-400 bg-emerald-500/5 border-slate-800/80'
                            }`}
                            title={customConIva ? `Fórmula personalizada: ${customConIva.rawFormula}` : 'Haz clic para formular esta celda'}
                          >
                            <div className="flex items-center justify-end space-x-1">
                              {customConIva && (
                                <span className="text-[9px] font-mono font-black text-slate-950 bg-emerald-400 px-1 rounded shadow-sm">
                                  fx
                                </span>
                              )}
                              <span>{conIva.toFixed(3).replace('.', ',')}</span>
                            </div>
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
              className={`bg-slate-900 border ${block.borderTheme} rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between ${
                block.id === 'los_javi' || block.id === 'ror_esteban' || block.id === 'miki_ecotrans_tarifa30' || block.id === 'sur_benito' ? 'lg:col-span-2' : ''
              }`}
            >
              <div>
                {/* Header with Title and Individual Download Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${
                      block.id === 'los_javi' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      block.id === 'transfrired' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      block.id === 'c0_general' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      block.id === 'ror_esteban' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                      block.id === 'miki_ecotrans_tarifa30' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      block.id === 'sur_benito' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}>
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-extrabold text-white text-base tracking-tight">{block.title}</h4>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${block.badgeTheme}`}>
                          {block.columnsRange}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {block.id === 'los_javi'
                          ? 'Celdas anaranjadas toman Precio Actual / Especial de Tarifas Especiales. Celdas blancas: P. Venta Sugerido GOA + 0.024 (Javi) / + 0.018 (Carreras). Con IVA = Sin IVA * 1.21'
                          : block.id === 'transfrired'
                          ? 'Celdas anaranjadas toman Precio Actual / Especial de Tarifas Especiales. Celdas blancas: P. Venta Sugerido GOA + 0.024. Con IVA = Sin IVA * 1.21'
                          : block.id === 'c0_general'
                          ? 'Celdas anaranjadas toman Precio Actual / Especial de Tarifas Especiales. Celdas blancas: P. Venta Sugerido GOA + 0.024. Con IVA = Sin IVA * 1.21'
                          : block.id === 'ror_esteban'
                          ? 'Celdas anaranjadas toman Precio Actual / Especial. Celdas verdes: Tarifa 24 Sin IVA. Celdas blancas: P. Venta Sugerido GOA + 0.024. Con IVA = Sin IVA * 1.21'
                          : block.id === 'miki_ecotrans_tarifa30'
                          ? 'Miki: P. Venta Sugerido GOA + 0.09. ECOTRANS: P. Venta Sugerido GOA + 0.05. Tarifa 30: ABRERA toma Precio Especial, resto P. Venta Sugerido GOA + 0.03. Con IVA = Sin IVA * 1.21'
                          : block.id === 'sur_benito'
                          ? 'Celdas anaranjadas toman Precio Actual / Especial de Tarifas Especiales. Celdas verdes: P. Venta Sugerido GOA + 0.036 (Tarifa 27) / + 0.024 (Tarifa 15). Celdas blancas: P. Venta Sugerido GOA + 0.027 (Tarifa 27) / + 0.015 (Tarifa 15). Con IVA = Sin IVA * 1.21'
                          : block.id === 'tarifa_75'
                          ? 'Celdas blancas: P. Venta Sugerido GOA + 0.038. Con IVA = Sin IVA * 1.21'
                          : block.description}
                      </p>
                    </div>
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
                {renderSpecialBlockTable(block)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ventana Emergente de Formulación */}
      {activeModalCell && (
        <SabanaFormulaModal
          isOpen={Boolean(activeModalCell)}
          onClose={() => setActiveModalCell(null)}
          cellKey={activeModalCell.cellKey}
          cellTitle={activeModalCell.cellTitle}
          cellDefaultValue={activeModalCell.defaultValue}
          currentFormula={activeModalCell.currentFormula}
          columnLabel={activeModalCell.columnLabel}
          selectedDate={selectedDate}
          onSave={(formulaStr, evaluatedVal) => {
            handleSaveFormula(activeModalCell.cellKey, formulaStr, evaluatedVal);
          }}
          onRemove={() => {
            handleRemoveFormula(activeModalCell.cellKey);
          }}
          onApplyToColumn={activeModalCell.onApplyToColumn}
        />
      )}

      {/* Confirmation Toast */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5">
          <Check className="h-5 w-5" />
          <span>{downloadToast}</span>
        </div>
      )}
    </div>
  );
}
