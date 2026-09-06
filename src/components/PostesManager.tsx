'use client';

import React, { useState, useEffect } from 'react';
import { STATION_EXCEL_COSTS } from '@/lib/dataSeed';
import {
  Layers, Flame, Zap, Droplet, Check, Save, Sparkles,
  TrendingUp, ArrowRightLeft, Fuel, ShieldCheck, Gauge,
  Download, Image as ImageIcon
} from 'lucide-react';

// Configuración oficial de fórmulas de costes de Gasolina de la Columna D de CALCULO INICIAL
// Fórmula: Margen Gasolina = Precio Poste - (Base + Porte + Pase) * 1.21
const GASOLINA_FORMULA_CONFIG: Record<string, { base: number; porte: number; pase: number }> = {
  'ALCUBILLAS': { base: 1.238, porte: 0.025, pase: 0.000 },
  'ALFAJARIN': { base: 1.248, porte: 0.005, pase: 0.010 },
  'TORREMOCHA': { base: 1.242, porte: 0.010, pase: 0.010 },
  'UCLES': { base: 1.232, porte: 0.010, pase: 0.010 },
  'VALLECAS': { base: 1.247, porte: 0.005, pase: 0.010 },
  'GANESHA MADRID': { base: 1.247, porte: 0.005, pase: 0.010 },
  'GANESHA TORREJON': { base: 1.247, porte: 0.005, pase: 0.010 },
  'TORREJON': { base: 1.247, porte: 0.005, pase: 0.010 },
  'VALDEMORO': { base: 1.246, porte: 0.006, pase: 0.010 },
  'BENAMEJI': { base: 1.245, porte: 0.005, pase: 0.010 },
  'HUMILLADERO': { base: 1.245, porte: 0.005, pase: 0.010 },
  'ES RIBA-ROJA': { base: 1.100, porte: 0.005, pase: 0.010 },
  'ES PISTA DE SILLA': { base: 1.100, porte: 0.005, pase: 0.010 },
  'ES REAL DE GANDIA': { base: 1.100, porte: 0.005, pase: 0.010 },
};

const POSTES_PROPIAS_STATIONS: {
  name: string;
  defaultGoa: string;
  defaultGasolina: string;
  defaultGain: string;
  hasGasolina?: boolean;
}[] = [
  { name: 'ARCOS', defaultGoa: '1.779', defaultGasolina: '', defaultGain: '', hasGasolina: false },
  { name: 'ALCUBILLAS', defaultGoa: '1.799', defaultGasolina: '1.799', defaultGain: '0.271', hasGasolina: true },
  { name: 'ALFAJARIN', defaultGoa: '1.799', defaultGasolina: '1.799', defaultGain: '0.271', hasGasolina: true },
  { name: 'TORREMOCHA', defaultGoa: '1.799', defaultGasolina: '1.799', defaultGain: '0.272', hasGasolina: true },
  { name: 'UCLES', defaultGoa: '1.799', defaultGasolina: '1.799', defaultGain: '0.284', hasGasolina: true },
  { name: 'VALLECAS', defaultGoa: '1.699', defaultGasolina: '1.739', defaultGain: '0.212', hasGasolina: true },
  { name: 'GANESHA MADRID', defaultGoa: '1.749', defaultGasolina: '1.739', defaultGain: '0.212', hasGasolina: true },
  { name: 'GANESHA TORREJON', defaultGoa: '1.749', defaultGasolina: '1.739', defaultGain: '0.212', hasGasolina: true },
  { name: 'VALDEMORO', defaultGoa: '1.649', defaultGasolina: '1.649', defaultGain: '0.122', hasGasolina: true },
  { name: 'BENAMEJI', defaultGoa: '1.839', defaultGasolina: '1.799', defaultGain: '0.274', hasGasolina: true },
  { name: 'HUMILLADERO', defaultGoa: '1.839', defaultGasolina: '1.799', defaultGain: '0.274', hasGasolina: true },
  { name: 'ES RIBA-ROJA', defaultGoa: '1.659', defaultGasolina: '1.689', defaultGain: '0.340', hasGasolina: true },
  { name: 'ES PISTA DE SILLA', defaultGoa: '1.659', defaultGasolina: '1.689', defaultGain: '0.340', hasGasolina: true },
  { name: 'ES REAL DE GANDIA', defaultGoa: '1.680', defaultGasolina: '1.689', defaultGain: '0.340', hasGasolina: true },
];

export function PostesManager() {
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

  const [postes, setPostes] = useState<Record<string, { goa: string; gasolina: string; gasolinaGain: string }>>(() => {
    try {
      const saved = localStorage.getItem('efi_postes_data_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.postes && Object.keys(parsed.postes).length > 0) return parsed.postes;
      }
    } catch (e) {}
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

  // HVO Configuration con carga directa de localStorage
  const [hvoGeneralBase, setHvoGeneralBase] = useState(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      return s ? JSON.parse(s).hvoGeneralBase || '1.2000' : '1.2000';
    } catch (e) { return '1.2000'; }
  });
  const [hvoGeneralAddition, setHvoGeneralAddition] = useState(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      return s ? JSON.parse(s).hvoGeneralAddition || '0.3280' : '0.3280';
    } catch (e) { return '0.3280'; }
  });
  const [hvoAlfajarinSinIva, setHvoAlfajarinSinIva] = useState(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      return s ? JSON.parse(s).hvoAlfajarinSinIva || '1.2560' : '1.2560';
    } catch (e) { return '1.2560'; }
  });
  const [hvoValdemoroAddition, setHvoValdemoroAddition] = useState(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      return s ? JSON.parse(s).hvoValdemoroAddition || '0.0700' : '0.0700';
    } catch (e) { return '0.0700'; }
  });

  // Gasóleo B Configuration con carga síncrona
  const [gasoleoBPosteGlobal, setGasoleoBPosteGlobal] = useState(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      return s ? JSON.parse(s).gasoleoBPosteGlobal || '1.2890' : '1.2890';
    } catch (e) { return '1.2890'; }
  });
  const [gasoleoBRows, setGasoleoBRows] = useState<Record<string, { compra: string; transfer: string; gob: string; poste: string }>>(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      if (s && JSON.parse(s).gasoleoBRows) return JSON.parse(s).gasoleoBRows;
    } catch (e) {}
    return {
      'UCLES': { compra: '1.0045', transfer: '1.0240', gob: '1.2886', poste: '1.2890' },
      'TORREMOCHA': { compra: '1.0045', transfer: '1.0240', gob: '1.2886', poste: '1.2890' },
      'ARCOS': { compra: '1.0045', transfer: '1.0240', gob: '1.2886', poste: '1.2890' },
    };
  });

  const [adblueRows, setAdblueRows] = useState<Record<string, { compra: string; poste: string }>>(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      if (s && JSON.parse(s).adblue) return JSON.parse(s).adblue;
    } catch (e) {}
    return {
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
    };
  });

  const [broncoRow, setBroncoRow] = useState<{
    name: string;
    sinIva: string;
    conIva: string;
    beneficio: string;
    compra: string;
    fecha: string;
  }>(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      if (s && JSON.parse(s).bronco) return JSON.parse(s).bronco;
    } catch (e) {}
    return {
      name: 'GASOLINA BRONCO',
      sinIva: '1.305',
      conIva: '1.579',
      beneficio: '0.048',
      compra: '1.242',
      fecha: '14/08/2026',
    };
  });

  const [gasesRows, setGasesRows] = useState<Record<string, { sinIva: string; poste: string }>>({
    'GLP / Autogas': { sinIva: '0.7850', poste: '0.9490' },
    'GNC (Gas Natural Comprimido)': { sinIva: '0.9500', poste: '1.1490' },
    'GNL (Gas Natural Licuado)': { sinIva: '0.8900', poste: '1.0790' },
  });

  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);
  const [imageToast, setImageToast] = useState<string | null>(null);
  const [validFromDate, setValidFromDate] = useState<string>(() => {
    try {
      return localStorage.getItem('efi_compras_valid_from') || new Date().toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  });

  const [, setComprasUpdateTick] = useState(0);

  useEffect(() => {
    const handleUpdates = () => {
      try {
        const saved = localStorage.getItem('efi_compras_valid_from');
        if (saved) setValidFromDate(saved);
      } catch (e) {}
      setComprasUpdateTick((t) => t + 1);
    };
    window.addEventListener('efi_valid_date_changed', handleUpdates);
    window.addEventListener('efi_compras_updated', handleUpdates);
    window.addEventListener('storage', handleUpdates);
    return () => {
      window.removeEventListener('efi_valid_date_changed', handleUpdates);
      window.removeEventListener('efi_compras_updated', handleUpdates);
      window.removeEventListener('storage', handleUpdates);
    };
  }, []);

  // Helper para buscar costes en el seed de Excel con resolución flexible
  const findStationExcelCosts = (stName: string) => {
    if (STATION_EXCEL_COSTS[stName]) return STATION_EXCEL_COSTS[stName];
    if (STATION_EXCEL_COSTS[`ES ${stName}`]) return STATION_EXCEL_COSTS[`ES ${stName}`];
    const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
    const matchedKey = Object.keys(STATION_EXCEL_COSTS).find((k) => {
      const cleanK = k.toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
      return cleanK === cleanTarget || cleanK.includes(cleanTarget) || cleanTarget.includes(cleanK);
    });
    if (matchedKey) return STATION_EXCEL_COSTS[matchedKey];
    return {
      type: 'PROPIA' as const,
      clhName: 'TORREJON',
      porte: 0.0050,
      pase: 0.0100,
      fin: 0.0100,
      defaultPrev: 1.2000,
      defaultCurr: 1.2080,
    };
  };

  // Obtener Tarifa 60 con IVA desde Sábana de Precios / Compras para calcular Margen GOA
  const getTarifa60ConIva = (stName: string): number => {
    let basePrice = 0;
    const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();

    try {
      const savedGlobal = localStorage.getItem('efi_compras_data');
      const todayStr = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem(`efi_purchases_${validFromDate}`) || localStorage.getItem(`efi_purchases_${todayStr}`);
      const p = savedGlobal ? JSON.parse(savedGlobal).data : savedDate ? JSON.parse(savedDate).data : null;

      if (p) {
        const key = `${stName}_GOA`;
        if (p[key]?.sale) {
          basePrice = parseNum(p[key].sale);
        } else {
          const matchedKey = Object.keys(p).find((k) => {
            if (!k.endsWith('_GOA')) return false;
            const baseK = k.replace(/_GOA$/, '').toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
            return baseK === cleanTarget || baseK.includes(cleanTarget) || cleanTarget.includes(baseK);
          });
          if (matchedKey && p[matchedKey]?.sale) {
            basePrice = parseNum(p[matchedKey].sale);
          }
        }
      }
    } catch (e) {}

    if (!basePrice || basePrice <= 0) {
      const costs = findStationExcelCosts(stName);
      basePrice = Number((costs.defaultCurr + costs.porte + costs.pase + costs.fin).toFixed(3));
    }

    // Tarifa 60 en Sábana de Precios: Sin IVA = basePrice + 0.0800 (3 dec), Con IVA = Sin IVA * 1.21 (3 dec)
    const t60SinIva = Number((basePrice + 0.0800).toFixed(3));
    return Number((t60SinIva * 1.21).toFixed(3));
  };

  // Margen GOA = Tarifa 60 con IVA - Precio Poste GOA
  const getMargenGoa = (stName: string, goaPostePrice: number): { margen: number; t60ConIva: number } => {
    const t60ConIva = getTarifa60ConIva(stName);
    const margen = Number((t60ConIva - goaPostePrice).toFixed(3));
    return { margen, t60ConIva };
  };

  // Margen Gasolina según las fórmulas exactas de la Columna D de CALCULO INICIAL
  const getMargenGasolina = (stName: string, gasPostePrice: number): number | null => {
    const conf = GASOLINA_FORMULA_CONFIG[stName] || GASOLINA_FORMULA_CONFIG[stName.replace(/^GANESHA\s+/, '')];
    if (!conf) return null; // ARCOS no tiene gasolina según el archivo

    let buy = conf.base;
    let porte = conf.porte;
    let pase = conf.pase;

    try {
      const savedGlobal = localStorage.getItem('efi_compras_data');
      if (savedGlobal) {
        const p = JSON.parse(savedGlobal).data;
        const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
        const matchedKey = Object.keys(p).find((k) => {
          if (!k.endsWith('_GASOLINA')) return false;
          const baseK = k.replace(/_GASOLINA$/, '').toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
          return baseK === cleanTarget || baseK.includes(cleanTarget) || cleanTarget.includes(baseK);
        });
        const gasItem = p[`${stName}_GASOLINA`] || (matchedKey ? p[matchedKey] : null);
        if (gasItem) {
          const cNum = parseNum(gasItem.curr);
          if (cNum > 0) buy = cNum;
          const portN = parseNum(gasItem.porte);
          if (portN > 0) porte = portN;
          const pasN = parseNum(gasItem.pase);
          if (pasN > 0) pase = pasN;
        }
      }
    } catch (e) {}

    const costConIva = Number(((buy + porte + pase) * 1.21).toFixed(4));
    return Number((gasPostePrice - costConIva).toFixed(3));
  };

  // Cálculos dinámicos de HVO
  const computedHvoGeneralSinIva = Number((parseNum(hvoGeneralBase) + parseNum(hvoGeneralAddition)).toFixed(4));
  const computedHvoGeneralConIva = Number((computedHvoGeneralSinIva * 1.21).toFixed(4));

  // HVO Alfajarín: Por defecto se copia exactamente del HVO Poste General
  const computedHvoAlfajarinSinIva = hvoAlfajarinSinIva && modifiedKeys.has('hvo_alfajarin')
    ? parseNum(hvoAlfajarinSinIva)
    : computedHvoGeneralSinIva;
  const computedHvoAlfajarinConIva = Number((computedHvoAlfajarinSinIva * 1.21).toFixed(4));

  // HVO Valdemoro: Se le suma el monto al GOA Poste Valdemoro (con IVA) y para calcular sin IVA se divide entre 1.21
  const goaValdemoroPrice = parseNum(postes['VALDEMORO']?.goa || '1.489');
  const computedHvoValdemoroConIva = Number((goaValdemoroPrice + parseNum(hvoValdemoroAddition)).toFixed(4));
  const computedHvoValdemoroSinIva = Number((computedHvoValdemoroConIva / 1.21).toFixed(4));

  useEffect(() => {
    try {
      const saved = localStorage.getItem('efi_postes_data_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.postes) setPostes(parsed.postes);
        if (parsed.hvoGeneralBase) setHvoGeneralBase(parsed.hvoGeneralBase);
        if (parsed.hvoGeneralAddition) setHvoGeneralAddition(parsed.hvoGeneralAddition);
        if (parsed.hvoAlfajarinSinIva) setHvoAlfajarinSinIva(parsed.hvoAlfajarinSinIva);
        if (parsed.hvoValdemoroAddition) setHvoValdemoroAddition(parsed.hvoValdemoroAddition);
        if (parsed.gasoleoBRows) setGasoleoBRows(parsed.gasoleoBRows);
        if (parsed.gasoleoBPosteGlobal) setGasoleoBPosteGlobal(parsed.gasoleoBPosteGlobal);
        if (parsed.adblue) setAdblueRows(parsed.adblue);
        if (parsed.gases) setGasesRows(parsed.gases);
        if (parsed.bronco) setBroncoRow(parsed.bronco);
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
        'efi_postes_data_v2',
        JSON.stringify({
          postes,
          hvoGeneralBase,
          hvoGeneralAddition,
          hvoAlfajarinSinIva,
          hvoValdemoroAddition,
          gasoleoBRows,
          gasoleoBPosteGlobal,
          adblue: adblueRows,
          gases: gasesRows,
          bronco: broncoRow,
          modified: Array.from(modifiedKeys),
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {}
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  // 1. Descarga PNG Estaciones Propias (GOA + GASOLINA)
  const downloadPostesAsPng = (
    stationNames: string[],
    groupTitle: string,
    outputFileName: string
  ) => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    const rowHeight = 44;
    const totalStations = stationNames.length;
    const totalRows = totalStations * 2;

    const col1Width = 180;
    const col2Width = 170;
    const col3Width = 140;
    const width = col1Width + col2Width + col3Width;
    const height = totalRows * rowHeight;

    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    stationNames.forEach((stName, sIdx) => {
      const item = postes[stName] || { goa: '1.579', gasolina: '1.479', gasolinaGain: '0.075' };
      const yStart = sIdx * 2 * rowHeight;

      ctx.fillStyle = '#FBE8DB';
      ctx.fillRect(0, yStart, col1Width, rowHeight * 2);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stName, col1Width / 2, yStart + rowHeight);

      // GOA
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(col1Width, yStart, col2Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = '14px sans-serif';
      ctx.fillText('GOA', col1Width + col2Width / 2, yStart + rowHeight / 2);

      ctx.fillStyle = '#FFF000';
      ctx.fillRect(col1Width + col2Width, yStart, col3Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      const goaPriceStr = parseNum(item.goa).toFixed(3).replace('.', ',');
      ctx.fillText(goaPriceStr, col1Width + col2Width + col3Width / 2, yStart + rowHeight / 2);

      // GASOLINA
      const yGas = yStart + rowHeight;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(col1Width, yGas, col2Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = '14px sans-serif';
      ctx.fillText('GASOLINA', col1Width + col2Width / 2, yGas + rowHeight / 2);

      ctx.fillStyle = '#FFF000';
      ctx.fillRect(col1Width + col2Width, yGas, col3Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      const gasPriceStr = parseNum(item.gasolina).toFixed(3).replace('.', ',');
      ctx.fillText(gasPriceStr, col1Width + col2Width + col3Width / 2, yGas + rowHeight / 2);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(col1Width, yGas);
      ctx.lineTo(width, yGas);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, yStart + rowHeight * 2);
      ctx.lineTo(width, yStart + rowHeight * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(col1Width, 0);
    ctx.lineTo(col1Width, height);
    ctx.moveTo(col1Width + col2Width, 0);
    ctx.lineTo(col1Width + col2Width, height);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = outputFileName;
    link.click();

    setImageToast(`Imagen PNG generada: ${outputFileName}`);
    setTimeout(() => setImageToast(null), 3500);
  };

  // 2. Descarga PNG Combinada HVO (Alfajarín y Valdemoro Sin IVA y Con IVA)
  const downloadHvoReportPng = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    const rowHeight = 44;
    const totalRows = 4; // 2 estaciones x 2 filas (Sin IVA y Con IVA)

    const col1Width = 180;
    const col2Width = 170;
    const col3Width = 140;
    const width = col1Width + col2Width + col3Width;
    const height = totalRows * rowHeight;

    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const hvoStations = [
      {
        name: 'ALFAJARIN',
        sinIva: computedHvoAlfajarinSinIva.toFixed(3).replace('.', ','),
        conIva: computedHvoAlfajarinConIva.toFixed(3).replace('.', ','),
      },
      {
        name: 'VALDEMORO',
        sinIva: computedHvoValdemoroSinIva.toFixed(3).replace('.', ','),
        conIva: computedHvoValdemoroConIva.toFixed(3).replace('.', ','),
      },
    ];

    hvoStations.forEach((st, idx) => {
      const yStart = idx * 2 * rowHeight;

      // Columna 1: Estación
      ctx.fillStyle = '#FBE8DB';
      ctx.fillRect(0, yStart, col1Width, rowHeight * 2);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.name, col1Width / 2, yStart + rowHeight);

      // Fila 1: HVO SIN IVA
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(col1Width, yStart, col2Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = '13px sans-serif';
      ctx.fillText('HVO SIN IVA', col1Width + col2Width / 2, yStart + rowHeight / 2);

      ctx.fillStyle = '#FFF000';
      ctx.fillRect(col1Width + col2Width, yStart, col3Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(st.sinIva, col1Width + col2Width + col3Width / 2, yStart + rowHeight / 2);

      // Fila 2: HVO CON IVA
      const y2 = yStart + rowHeight;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(col1Width, y2, col2Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = '13px sans-serif';
      ctx.fillText('HVO CON IVA (21%)', col1Width + col2Width / 2, y2 + rowHeight / 2);

      ctx.fillStyle = '#FFF000';
      ctx.fillRect(col1Width + col2Width, y2, col3Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(st.conIva, col1Width + col2Width + col3Width / 2, y2 + rowHeight / 2);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(col1Width, y2);
      ctx.lineTo(width, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, yStart + rowHeight * 2);
      ctx.lineTo(width, yStart + rowHeight * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(col1Width, 0);
    ctx.lineTo(col1Width, height);
    ctx.moveTo(col1Width + col2Width, 0);
    ctx.lineTo(col1Width + col2Width, height);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'POSTES_HVO_ALFAJARIN_VALDEMORO.png';
    link.click();

    setImageToast('Imagen PNG generada: POSTES_HVO_ALFAJARIN_VALDEMORO.png');
    setTimeout(() => setImageToast(null), 3500);
  };

  // 3. Descarga PNG Gasóleo B: Compra (Sin IVA y Con IVA para Uclés, Torremocha y Arcos)
  const downloadGasoleoBCompraPng = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    const rowHeight = 44;
    const stationNames = ['UCLES', 'TORREMOCHA', 'ARCOS'];
    const totalRows = stationNames.length * 2;

    const col1Width = 180;
    const col2Width = 170;
    const col3Width = 140;
    const width = col1Width + col2Width + col3Width;
    const height = totalRows * rowHeight;

    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    stationNames.forEach((stName, idx) => {
      const item = gasoleoBRows[stName] || { compra: '1.005' };
      const compraNum = parseNum(item.compra || '1.005');
      const conIvaNum = Number((compraNum * 1.21).toFixed(3));
      const yStart = idx * 2 * rowHeight;

      // Columna 1: Estación
      ctx.fillStyle = '#FBE8DB';
      ctx.fillRect(0, yStart, col1Width, rowHeight * 2);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stName, col1Width / 2, yStart + rowHeight);

      // Fila 1: GOB COMPRA SIN IVA
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(col1Width, yStart, col2Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = '13px sans-serif';
      ctx.fillText('GOB COMPRA SIN IVA', col1Width + col2Width / 2, yStart + rowHeight / 2);

      ctx.fillStyle = '#FFF000';
      ctx.fillRect(col1Width + col2Width, yStart, col3Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(compraNum.toFixed(3).replace('.', ','), col1Width + col2Width + col3Width / 2, yStart + rowHeight / 2);

      // Fila 2: GOB COMPRA CON IVA
      const y2 = yStart + rowHeight;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(col1Width, y2, col2Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = '13px sans-serif';
      ctx.fillText('GOB CON IVA (21%)', col1Width + col2Width / 2, y2 + rowHeight / 2);

      ctx.fillStyle = '#FFF000';
      ctx.fillRect(col1Width + col2Width, y2, col3Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(conIvaNum.toFixed(3).replace('.', ','), col1Width + col2Width + col3Width / 2, y2 + rowHeight / 2);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(col1Width, y2);
      ctx.lineTo(width, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, yStart + rowHeight * 2);
      ctx.lineTo(width, yStart + rowHeight * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(col1Width, 0);
    ctx.lineTo(col1Width, height);
    ctx.moveTo(col1Width + col2Width, 0);
    ctx.lineTo(col1Width + col2Width, height);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'POSTES_GASOLEO_B_COMPRA_SIN_CON_IVA.png';
    link.click();

    setImageToast('Imagen PNG generada: POSTES_GASOLEO_B_COMPRA_SIN_CON_IVA.png');
    setTimeout(() => setImageToast(null), 3500);
  };

  // 4. Descarga PNG Gasóleo B: Solo Precios Transfrired para Uclés, Torremocha y Arcos
  const downloadPreciosTransfriredPng = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    const rowHeight = 44;
    const stationNames = ['UCLES', 'TORREMOCHA', 'ARCOS'];
    const totalRows = stationNames.length;

    const col1Width = 180;
    const col2Width = 190;
    const col3Width = 140;
    const width = col1Width + col2Width + col3Width;
    const height = totalRows * rowHeight;

    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    stationNames.forEach((stName, idx) => {
      const item = gasoleoBRows[stName] || { compra: '1.005' };
      const compraNum = parseNum(item.compra || '1.005');
      const autoTransferNum = Number((compraNum + 0.017).toFixed(3));
      const isTransferMod = modifiedKeys.has(`gasb_transfer_${stName}`);
      const transferNum = isTransferMod && item.transfer ? parseNum(item.transfer) : autoTransferNum;
      const yStart = idx * rowHeight;

      // Columna 1: Estación
      ctx.fillStyle = '#FBE8DB';
      ctx.fillRect(0, yStart, col1Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stName, col1Width / 2, yStart + rowHeight / 2);

      // Columna 2: Concepto Transfrired
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(col1Width, yStart, col2Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = '13px sans-serif';
      ctx.fillText('PRECIOS TRANSFRIRED', col1Width + col2Width / 2, yStart + rowHeight / 2);

      // Columna 3: Precio
      ctx.fillStyle = '#FFF000';
      ctx.fillRect(col1Width + col2Width, yStart, col3Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(transferNum.toFixed(3).replace('.', ','), col1Width + col2Width + col3Width / 2, yStart + rowHeight / 2);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, yStart + rowHeight);
      ctx.lineTo(width, yStart + rowHeight);
      ctx.stroke();
    });

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(col1Width, 0);
    ctx.lineTo(col1Width, height);
    ctx.moveTo(col1Width + col2Width, 0);
    ctx.lineTo(col1Width + col2Width, height);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'POSTES_PRECIOS_TRANSFRIRED.png';
    link.click();

    setImageToast('Imagen PNG generada: POSTES_PRECIOS_TRANSFRIRED.png');
    setTimeout(() => setImageToast(null), 3500);
  };

  // Descarga PNG Gasóleo B: Tabla Completa de 5 Columnas Oficial
  const downloadGasoleoBTablaCompletaPng = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    const rowHeight = 44;
    const stationNames = ['UCLES', 'TORREMOCHA', 'ARCOS'];
    const totalRows = stationNames.length + 1;

    const colWidths = [140, 170, 160, 160, 180];
    const width = colWidths.reduce((a, b) => a + b, 0);
    const height = totalRows * rowHeight;

    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Cabecera
    const headers = ['ESTACIÓN', 'COMPRA SIN IVA', 'TRANSFRIRED', 'TRANSFRIRED CON IVA', 'PRECIO POSTE GOB'];
    let xOffset = 0;
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, rowHeight);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    headers.forEach((h, i) => {
      ctx.fillText(h, xOffset + colWidths[i] / 2, rowHeight / 2);
      xOffset += colWidths[i];
    });

    stationNames.forEach((stName, idx) => {
      const item = gasoleoBRows[stName] || { compra: '1.005' };
      const compraNum = parseNum(item.compra || '1.005');
      const autoTransferNum = Number((compraNum + 0.017).toFixed(3));
      const isTransferMod = modifiedKeys.has(`gasb_transfer_${stName}`);
      const transferNum = isTransferMod && item.transfer ? parseNum(item.transfer) : autoTransferNum;
      const transfriredConIva = Number((transferNum * 1.21).toFixed(3));
      const autoPosteNum = Number(((compraNum + 0.035) * 1.21).toFixed(3));
      const isPosteMod = modifiedKeys.has(`gasb_poste_${stName}`);
      const posteNum = isPosteMod && item.poste ? parseNum(item.poste) : autoPosteNum;

      const y = (idx + 1) * rowHeight;

      // Columna 1: Estación
      ctx.fillStyle = '#FBE8DB';
      ctx.fillRect(0, y, colWidths[0], rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(stName, colWidths[0] / 2, y + rowHeight / 2);

      // Columna 2: Compra Sin IVA
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(colWidths[0], y, colWidths[1], rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = '13px sans-serif';
      ctx.fillText(`${compraNum.toFixed(3).replace('.', ',')} €`, colWidths[0] + colWidths[1] / 2, y + rowHeight / 2);

      // Columna 3: Transfrired
      ctx.fillStyle = '#EFF6FF';
      ctx.fillRect(colWidths[0] + colWidths[1], y, colWidths[2], rowHeight);
      ctx.fillStyle = '#1D4ED8';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${transferNum.toFixed(3).replace('.', ',')} €`, colWidths[0] + colWidths[1] + colWidths[2] / 2, y + rowHeight / 2);

      // Columna 4: Transfrired Con IVA
      ctx.fillStyle = '#ECFDF5';
      ctx.fillRect(colWidths[0] + colWidths[1] + colWidths[2], y, colWidths[3], rowHeight);
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${transfriredConIva.toFixed(3).replace('.', ',')} €`, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] / 2, y + rowHeight / 2);

      // Columna 5: Precio Poste GOB
      ctx.fillStyle = '#FFFBEB';
      ctx.fillRect(colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, colWidths[4], rowHeight);
      ctx.fillStyle = '#B45309';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${posteNum.toFixed(3).replace('.', ',')} €`, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] / 2, y + rowHeight / 2);

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight);
      ctx.lineTo(width, y + rowHeight);
      ctx.stroke();
    });

    let curX = 0;
    colWidths.forEach((w) => {
      curX += w;
      ctx.beginPath();
      ctx.moveTo(curX, 0);
      ctx.lineTo(curX, height);
      ctx.stroke();
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'TABLA_GASOLEO_B_5_COLUMNAS.png';
    link.click();

    setImageToast('Imagen PNG generada: TABLA_GASOLEO_B_5_COLUMNAS.png');
    setTimeout(() => setImageToast(null), 3500);
  };

  // 5. Descarga PNG Gasolina Bronco
  const downloadGasolinaBroncoPng = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    const rowHeight = 44;
    const totalRows = 2; // Sin IVA y Con IVA

    const col1Width = 180;
    const col2Width = 170;
    const col3Width = 140;
    const width = col1Width + col2Width + col3Width;
    const height = totalRows * rowHeight;

    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Columna 1: Nombre
    ctx.fillStyle = '#FBE8DB';
    ctx.fillRect(0, 0, col1Width, rowHeight * 2);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GASOLINA BRONCO', col1Width / 2, rowHeight);

    // Fila 1: SIN IVA
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(col1Width, 0, col2Width, rowHeight);
    ctx.fillStyle = '#000000';
    ctx.font = '13px sans-serif';
    ctx.fillText('SIN IVA', col1Width + col2Width / 2, rowHeight / 2);

    ctx.fillStyle = '#FFF000';
    ctx.fillRect(col1Width + col2Width, 0, col3Width, rowHeight);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(parseNum(broncoRow.sinIva).toFixed(3).replace('.', ','), col1Width + col2Width + col3Width / 2, rowHeight / 2);

    // Fila 2: CON IVA
    const y2 = rowHeight;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(col1Width, y2, col2Width, rowHeight);
    ctx.fillStyle = '#000000';
    ctx.font = '13px sans-serif';
    ctx.fillText('CON IVA (21%)', col1Width + col2Width / 2, y2 + rowHeight / 2);

    ctx.fillStyle = '#FFF000';
    ctx.fillRect(col1Width + col2Width, y2, col3Width, rowHeight);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(parseNum(broncoRow.conIva).toFixed(3).replace('.', ','), col1Width + col2Width + col3Width / 2, y2 + rowHeight / 2);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(col1Width, y2);
    ctx.lineTo(width, y2);
    ctx.stroke();

    ctx.strokeRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(col1Width, 0);
    ctx.lineTo(col1Width, height);
    ctx.moveTo(col1Width + col2Width, 0);
    ctx.lineTo(col1Width + col2Width, height);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'POSTES_GASOLINA_BRONCO.png';
    link.click();

    setImageToast('Imagen PNG generada: POSTES_GASOLINA_BRONCO.png');
    setTimeout(() => setImageToast(null), 3500);
  };

  const MADRID_GROUP = ['VALLECAS', 'GANESHA MADRID', 'GANESHA TORREJON', 'VALDEMORO'];
  const SUR_GROUP = ['BENAMEJI', 'HUMILLADERO'];

  return (
    <div className="space-y-8">
      {/* Banner Principal */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Layers className="h-4 w-4" />
              <span>Gestión de Postes Públicos y Descargas en Imagen PNG</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Precios en Postes de Estaciones Propias
            </h2>
            <p className="text-slate-400 text-sm">
              Descarga imágenes PNG oficiales por estación, por grupos (Madrid y Sur), para HVO (Alfajarín y Valdemoro con Sin/Con IVA) y Gasóleo B (Compra y Transfer).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => downloadPostesAsPng(MADRID_GROUP, 'Grupo Madrid', 'POSTES_MADRID_VALLECAS_TORREJON_VALDEMORO.png')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-bold border border-blue-500/30 shadow-md transition-all active:scale-95"
              title="Descargar imagen PNG combinada de Vallecas, Madrid, Torrejón y Valdemoro"
            >
              <ImageIcon className="h-4 w-4 text-blue-400" />
              <span>PNG Conjunto Madrid (4 EESS)</span>
            </button>

            <button
              onClick={() => downloadPostesAsPng(SUR_GROUP, 'Grupo Sur', 'POSTES_SUR_BENAMEJI_HUMILLADERO.png')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/30 shadow-md transition-all active:scale-95"
              title="Descargar imagen PNG combinada de Benamejí y Humilladero"
            >
              <ImageIcon className="h-4 w-4 text-emerald-400" />
              <span>PNG Conjunto Sur (2 EESS)</span>
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

      {/* 1. Tabla Postes Estaciones Propias (14 Estaciones) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Postes de Estaciones Propias</h3>
              <p className="text-xs text-slate-400">Precios en surtidor con descargas en formato de imagen PNG</p>
            </div>
          </div>
          <span className="text-xs text-amber-400/90 font-mono bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 font-bold">
            Fórmula: GOA Premium = GOA + 0.04 EUR
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3.5 px-5 sticky left-0 bg-slate-950 z-10">Estación</th>
                <th className="py-3.5 px-4 text-amber-300">Gasóleo A (€/L)</th>
                <th className="py-3.5 px-4 text-emerald-400">
                  <span>Margen GOA (€)</span>
                  <span className="block text-[9px] text-slate-400 font-normal">T60 Con IVA - Poste</span>
                </th>
                <th className="py-3.5 px-4 text-amber-400 bg-amber-500/5">
                  <span>GOA Premium</span>
                  <span className="block text-[9px] text-amber-300/70 font-normal">GOA + 0.04€</span>
                </th>
                <th className="py-3.5 px-4 text-blue-300">Gasolina 95 (€/L)</th>
                <th className="py-3.5 px-4 text-emerald-400">
                  <span>Margen Gasolina (€)</span>
                  <span className="block text-[9px] text-slate-400 font-normal">Fórmula Columna D</span>
                </th>
                <th className="py-3.5 px-4 text-center">Descargar PNG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              {POSTES_PROPIAS_STATIONS.map((st) => {
                const item = postes[st.name] || { goa: st.defaultGoa, gasolina: st.defaultGasolina, gasolinaGain: st.defaultGain };
                const goaNum = parseNum(item.goa);
                const gasNum = parseNum(item.gasolina);
                const premiumPrice = Number((goaNum + 0.04).toFixed(3));

                // 1. Margen Gasóleo A = Tarifa 60 con IVA - Precio Poste Gasóleo A
                const { margen: margenGoa, t60ConIva } = getMargenGoa(st.name, goaNum);

                // 2. Margen Gasolina según fórmula oficial de la columna D
                const hasGasolina = st.hasGasolina !== false && st.name !== 'ARCOS';
                const autoMargenGas = hasGasolina ? getMargenGasolina(st.name, gasNum) : null;
                const isGainMod = modifiedKeys.has(`poste_${st.name}_gasolinaGain`);
                const displayMargenGas = isGainMod
                  ? item.gasolinaGain
                  : (autoMargenGas !== null ? autoMargenGas.toFixed(3) : '—');

                const isGoaMod = modifiedKeys.has(`poste_${st.name}_goa`);
                const isGasMod = modifiedKeys.has(`poste_${st.name}_gasolina`);

                const isMadridGroup = MADRID_GROUP.includes(st.name);
                const isSurGroup = SUR_GROUP.includes(st.name);

                return (
                  <tr key={st.name} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-5 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                      <div className="flex items-center space-x-2">
                        <span>{st.name}</span>
                        {isMadridGroup && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                            Madrid
                          </span>
                        )}
                        {isSurGroup && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            Sur
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* 1. Gasóleo A (€/L) */}
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

                    {/* 2. Margen Gasóleo A (€) = Tarifa 60 con IVA - Poste GOA */}
                    <td className="py-3 px-4 bg-slate-900/40">
                      <div className="flex flex-col">
                        <span
                          className={`font-mono font-bold text-xs ${
                            margenGoa >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {margenGoa >= 0 ? `+${margenGoa.toFixed(3)}` : margenGoa.toFixed(3)} €
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          T60: {t60ConIva.toFixed(3)} €
                        </span>
                      </div>
                    </td>

                    {/* 3. GOA Premium (GOA + 0.04€) */}
                    <td className="py-3 px-4 bg-amber-500/5 font-mono font-bold text-amber-300 text-sm">
                      {premiumPrice.toFixed(3)} €
                    </td>

                    {/* 4. Gasolina 95 (€/L) */}
                    <td className={`py-3 px-4 transition-all ${isGasMod ? 'bg-amber-400/20' : ''}`}>
                      {hasGasolina ? (
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
                      ) : (
                        <span className="text-slate-600 font-mono text-center block">—</span>
                      )}
                    </td>

                    {/* 5. Margen Gasolina (€) según Columna D de CALCULO INICIAL */}
                    <td className={`py-3 px-4 transition-all ${isGainMod ? 'bg-amber-400/20' : ''}`}>
                      {hasGasolina ? (
                        <div className="relative inline-flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displayMargenGas}
                            onChange={(e) => handlePosteChange(st.name, 'gasolinaGain', e.target.value)}
                            className={`w-24 rounded-lg px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                              isGainMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md'
                                : parseNum(displayMargenGas) >= 0
                                ? 'bg-slate-950 border border-emerald-500/40 text-emerald-400 focus:border-emerald-400'
                                : 'bg-slate-950 border border-rose-500/40 text-rose-400 focus:border-rose-400'
                            }`}
                          />
                          {isGainMod && (
                            <span className="ml-1 text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded">
                              MOD
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-center block">—</span>
                      )}
                    </td>

                    {/* Descargar PNG */}
                    <td className="py-3 px-4 text-center">
                      {isMadridGroup ? (
                        <button
                          onClick={() => downloadPostesAsPng(MADRID_GROUP, 'Madrid', 'POSTES_MADRID_CONJUNTO.png')}
                          className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded-lg text-[11px] font-bold border border-blue-500/40 transition-colors inline-flex items-center space-x-1"
                          title="Descarga el grupo Madrid completo en una imagen PNG"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-blue-300" />
                          <span>PNG Madrid</span>
                        </button>
                      ) : isSurGroup ? (
                        <button
                          onClick={() => downloadPostesAsPng(SUR_GROUP, 'Sur', 'POSTES_SUR_CONJUNTO.png')}
                          className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-lg text-[11px] font-bold border border-emerald-500/40 transition-colors inline-flex items-center space-x-1"
                          title="Descarga el grupo Sur completo en una imagen PNG"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-emerald-300" />
                          <span>PNG Sur</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => downloadPostesAsPng([st.name], st.name, `POSTES_${st.name.replace(/\s+/g, '_')}.png`)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold border border-slate-700 transition-colors inline-flex items-center space-x-1"
                          title={`Descargar imagen PNG de ${st.name}`}
                        >
                          <Download className="h-3.5 w-3.5 text-amber-400" />
                          <span>PNG</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Sección HVO con Suma de Montos y Reporte Combinado PNG */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">HVO (Hidrobiodiésel 100% Renovable)</h3>
              <p className="text-xs text-slate-400">Configuración de montos sumados al coste de compra y descargas PNG con precios Sin y Con IVA</p>
            </div>
          </div>
          
          <button
            onClick={downloadHvoReportPng}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            title="Descargar imagen PNG de HVO Alfajarín y Valdemoro con precios Sin IVA y Con IVA"
          >
            <ImageIcon className="h-4 w-4" />
            <span>Descargar PNG Reporte HVO (Alfajarín y Valdemoro)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* HVO General */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">HVO Poste General</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">100% Bio</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-slate-400 block font-medium">Precio Compra Base Sin IVA (€):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={hvoGeneralBase}
                  onChange={(e) => {
                    setHvoGeneralBase(e.target.value);
                    setModifiedKeys((prev) => new Set(prev).add('hvo_gen_base'));
                    setIsSaved(false);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-amber-300 block font-medium">Monto a Sumar al HVO General (€):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={hvoGeneralAddition}
                  onChange={(e) => {
                    setHvoGeneralAddition(e.target.value);
                    setModifiedKeys((prev) => new Set(prev).add('hvo_gen_add'));
                    setIsSaved(false);
                  }}
                  className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-1.5 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Precio Final Sin IVA:</span>
                <span className="font-bold text-white">{computedHvoGeneralSinIva.toFixed(4)} €/L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Precio Con IVA (21%):</span>
                <span className="font-bold text-emerald-400">{computedHvoGeneralConIva.toFixed(4)} €/L</span>
              </div>
            </div>
          </div>

          {/* HVO ALFAJARIN */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">HVO ALFAJARIN</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">Específica</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-slate-400 block font-medium">Precio Sin IVA (€/L):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={hvoAlfajarinSinIva}
                  onChange={(e) => {
                    setHvoAlfajarinSinIva(e.target.value);
                    setModifiedKeys((prev) => new Set(prev).add('hvo_alfajarin'));
                    setIsSaved(false);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-8 border-t border-slate-800/80 space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Precio Final Sin IVA:</span>
                <span className="font-bold text-white">{computedHvoAlfajarinSinIva.toFixed(4)} €/L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Precio Con IVA (21%):</span>
                <span className="font-bold text-emerald-400">{computedHvoAlfajarinConIva.toFixed(4)} €/L</span>
              </div>
            </div>
          </div>

          {/* HVO VALDEMORO */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">HVO VALDEMORO</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/30">
                GOA Valdemoro + Suma
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">GOA Poste Valdemoro:</span>
                <span className="text-amber-300 font-bold">{goaValdemoroPrice.toFixed(3)} €/L</span>
              </div>

              <div>
                <label className="text-[11px] text-emerald-300 block font-medium">Monto a Sumar al GOA Valdemoro (€):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={hvoValdemoroAddition}
                  onChange={(e) => {
                    setHvoValdemoroAddition(e.target.value);
                    setModifiedKeys((prev) => new Set(prev).add('hvo_valdemoro_add'));
                    setIsSaved(false);
                  }}
                  className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-emerald-300 font-mono font-bold text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Precio Final Sin IVA:</span>
                <span className="font-bold text-white">{computedHvoValdemoroSinIva.toFixed(4)} €/L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Precio Con IVA (21%):</span>
                <span className="font-bold text-emerald-400">{computedHvoValdemoroConIva.toFixed(4)} €/L</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sección Gasóleo B con Nueva Columna Precio Poste y 2 Botones PNG Oficiales */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Gasóleo B (Agrícola y Calefacción)</h3>
              <p className="text-xs text-slate-400">Precios asignados a Uclés, Torremocha y Arcos con descargas PNG de Compra y Precios Transfrired</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadGasoleoBTablaCompletaPng}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
              title="Descarga PNG de la tabla completa de 5 columnas oficial"
            >
              <Download className="h-4 w-4" />
              <span>PNG Tabla Completa (5 Columnas)</span>
            </button>

            <button
              onClick={() => {
                downloadGasoleoBCompraPng();
                setTimeout(() => downloadPreciosTransfriredPng(), 600);
              }}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all active:scale-95"
              title="Descarga automática de ambos archivos PNG (Compra y Transfrired)"
            >
              <Download className="h-4 w-4 text-amber-400" />
              <span>Descargar Ambos PNGs (Compra + Transfrired)</span>
            </button>

            <button
              onClick={downloadGasoleoBCompraPng}
              className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl text-xs font-bold border border-rose-500/30 transition-all active:scale-95"
              title="Descarga PNG de las 3 estaciones con Precio Compra Sin IVA y Con IVA"
            >
              <Download className="h-4 w-4 text-rose-400" />
              <span>PNG Compra GOB (Sin/Con IVA)</span>
            </button>

            <button
              onClick={downloadPreciosTransfriredPng}
              className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-bold border border-blue-500/30 transition-all active:scale-95"
              title="Descarga PNG de las 3 estaciones solo con la columna Precios Transfrired"
            >
              <Download className="h-4 w-4 text-blue-400" />
              <span>PNG Precios Transfrired (3 EESS)</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-bold">
                <th className="py-3 px-4">Estación</th>
                <th className="py-3 px-4 text-amber-300">Precio Compra Sin IVA (€)</th>
                <th className="py-3 px-4 text-blue-300">Precio Transfrired (€)</th>
                <th className="py-3 px-4 text-emerald-400">Transfrired Con IVA (€)</th>
                <th className="py-3 px-4 text-amber-400 bg-slate-900">Precio Poste Gasóleo B (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {['UCLES', 'TORREMOCHA', 'ARCOS'].map((stName) => {
                const item = gasoleoBRows[stName] || { compra: '1.005', transfer: '', gob: '', poste: '' };
                const compraNum = parseNum(item.compra);
                const isMod = modifiedKeys.has(`gasb_${stName}`);

                // Fórmulas oficiales Gasóleo B:
                // 1. Transfrired = Compra Sin IVA + 0.017
                const autoTransferNum = Number((compraNum + 0.017).toFixed(3));
                const isTransferMod = modifiedKeys.has(`gasb_transfer_${stName}`);
                const transferDisplay = isTransferMod && item.transfer ? item.transfer : autoTransferNum.toFixed(3);
                const transferNum = parseNum(transferDisplay);

                // 2. Transfrired Con IVA = Transfrired * 1.21
                const transfriredConIva = Number((transferNum * 1.21).toFixed(3));

                // 3. Precio Poste Gasóleo B = (Compra Sin IVA + 0.035) * 1.21
                const autoPosteNum = Number(((compraNum + 0.035) * 1.21).toFixed(3));
                const isPosteMod = modifiedKeys.has(`gasb_poste_${stName}`);
                const posteDisplay = isPosteMod && item.poste ? item.poste : autoPosteNum.toFixed(3);

                return (
                  <tr key={stName} className="hover:bg-slate-800/40 transition-colors">
                    {/* 1. Estación */}
                    <td className="py-3 px-4 font-bold text-white">{stName}</td>
                    
                    {/* 2. Precio Compra Sin IVA */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.compra}
                        onChange={(e) => {
                          const val = e.target.value;
                          const valNum = parseNum(val);
                          const nextTransfer = modifiedKeys.has(`gasb_transfer_${stName}`)
                            ? item.transfer
                            : Number((valNum + 0.017).toFixed(3)).toFixed(3);
                          const nextPoste = modifiedKeys.has(`gasb_poste_${stName}`)
                            ? item.poste
                            : Number(((valNum + 0.035) * 1.21).toFixed(3)).toFixed(3);
                          setGasoleoBRows((prev) => ({
                            ...prev,
                            [stName]: {
                              ...prev[stName],
                              compra: val,
                              transfer: nextTransfer,
                              poste: nextPoste,
                            },
                          }));
                          setModifiedKeys((prev) => new Set(prev).add(`gasb_${stName}`));
                          setIsSaved(false);
                        }}
                        className={`w-28 rounded px-2 py-1 text-xs font-mono font-bold ${
                          isMod ? 'bg-amber-400/25 border border-amber-400 text-amber-200' : 'bg-slate-950 border border-slate-700 text-slate-200'
                        }`}
                      />
                    </td>

                    {/* 3. Precio Transfrired (Compra Sin IVA + 0.017) */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={transferDisplay}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGasoleoBRows((prev) => ({
                            ...prev,
                            [stName]: { ...prev[stName], transfer: val },
                          }));
                          setModifiedKeys((prev) => new Set(prev).add(`gasb_transfer_${stName}`));
                          setIsSaved(false);
                        }}
                        className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-blue-300 font-bold focus:border-blue-400 focus:outline-none"
                      />
                    </td>

                    {/* 4. Transfrired Con IVA (Transfrired * 1.21) */}
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                      {transfriredConIva.toFixed(3)} €
                    </td>

                    {/* 5. Precio Poste Gasóleo B: (Compra Sin IVA + 0.035) * 1.21 */}
                    <td className="py-3 px-4 bg-slate-900/50">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={posteDisplay}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGasoleoBRows((prev) => ({
                            ...prev,
                            [stName]: { ...prev[stName], poste: val },
                          }));
                          setModifiedKeys((prev) => new Set(prev).add(`gasb_poste_${stName}`));
                          setIsSaved(false);
                        }}
                        className="w-28 bg-slate-950 border border-amber-500/40 rounded px-2 py-1 text-xs font-mono text-amber-300 font-black focus:border-amber-400 focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Sección AdBlue */}
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

      {/* 5. Sección Gases */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Fuel className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Gases y Energías Alternativas (GLP, GNC, GNL)</h3>
              <p className="text-xs text-slate-400">Precios sin IVA y cálculo con IVA para combustibles a gas</p>
            </div>
          </div>
          <span className="text-xs text-teal-400 font-mono font-bold bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
            Módulo Gases
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

      {imageToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5">
          <Check className="h-5 w-5" />
          <span>{imageToast}</span>
        </div>
      )}
    </div>
  );
}
