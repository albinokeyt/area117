'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { STATION_EXCEL_COSTS } from '@/lib/dataSeed';
import { getPostesStations } from '@/lib/stationsService';
import {
  Layers, Flame, Zap, Droplet, Check, Save, Sparkles,
  TrendingUp, ArrowRightLeft, Fuel, ShieldCheck, Gauge,
  Download, Image as ImageIcon, Calculator, RotateCcw
} from 'lucide-react';
import {
  CellFormula,
  getSabanaTariff60ConIvaForStation,
  loadPostesFormulas,
  savePostesFormula,
  removePostesFormula,
  clearAllPostesFormulas,
  reevaluateAllPostesFormulas,
  getProgramVariables,
  evaluateFormula
} from '@/lib/sabanaFormulaEngine';
import { SabanaFormulaModal } from '@/components/SabanaFormulaModal';

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
  { name: 'ARCOS', defaultGoa: '1,779', defaultGasolina: '', defaultGain: '', hasGasolina: false },
  { name: 'ALCUBILLAS', defaultGoa: '1,799', defaultGasolina: '1,799', defaultGain: '0,271', hasGasolina: true },
  { name: 'ALFAJARIN', defaultGoa: '1,799', defaultGasolina: '1,799', defaultGain: '0,271', hasGasolina: true },
  { name: 'TORREMOCHA', defaultGoa: '1,799', defaultGasolina: '1,799', defaultGain: '0,272', hasGasolina: true },
  { name: 'UCLES', defaultGoa: '1,799', defaultGasolina: '1,799', defaultGain: '0,284', hasGasolina: true },
  { name: 'VALLECAS', defaultGoa: '1,709', defaultGasolina: '1,739', defaultGain: '0,212', hasGasolina: true },
  { name: 'GANESHA MADRID', defaultGoa: '1,699', defaultGasolina: '1,739', defaultGain: '0,212', hasGasolina: true },
  { name: 'GANESHA TORREJON', defaultGoa: '1,699', defaultGasolina: '1,739', defaultGain: '0,212', hasGasolina: true },
  { name: 'VALDEMORO', defaultGoa: '1,659', defaultGasolina: '1,649', defaultGain: '0,122', hasGasolina: true },
  { name: 'BENAMEJI', defaultGoa: '1,839', defaultGasolina: '1,799', defaultGain: '0,274', hasGasolina: true },
  { name: 'HUMILLADERO', defaultGoa: '1,839', defaultGasolina: '1,799', defaultGain: '0,274', hasGasolina: true },
  { name: 'ES RIBA-ROJA', defaultGoa: '1,659', defaultGasolina: '1,689', defaultGain: '0,340', hasGasolina: true },
  { name: 'ES PISTA DE SILLA', defaultGoa: '1,659', defaultGasolina: '1,689', defaultGain: '0,340', hasGasolina: true },
  { name: 'ES REAL DE GANDIA', defaultGoa: '1,680', defaultGasolina: '1,689', defaultGain: '0,340', hasGasolina: true },
];

interface PostesManagerProps {
  selectedDate?: string;
}

export function PostesManager({ selectedDate }: PostesManagerProps = {}) {
  const parseNum = (val: string | number | undefined): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = val.toString().replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const formatNum = (num: number, decimals: number = 3): string => {
    if (isNaN(num) || !isFinite(num)) return '0,000';
    return num.toFixed(decimals).replace('.', ',');
  };

  const [stationsVersion, setStationsVersion] = useState(0);
  const postesStations = useMemo(() => getPostesStations(), [stationsVersion]);

  useEffect(() => {
    const handleStationsUpdated = () => {
      setStationsVersion((v) => v + 1);
      const saved = localStorage.getItem('efi_postes_data_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.postes) {
            const sanitized: Record<string, { goa: string; gasolina: string; gasolinaGain: string }> = {};
            Object.entries(parsed.postes).forEach(([k, v]: [string, any]) => {
              sanitized[k] = {
                goa: (v.goa || '').replace('.', ','),
                gasolina: (v.gasolina || '').replace('.', ','),
                gasolinaGain: (v.gasolinaGain || '').replace('.', ','),
              };
            });
            setPostes(sanitized);
          }
        } catch (e) {}
      }
    };
    window.addEventListener('efi_stations_updated', handleStationsUpdated);
    return () => window.removeEventListener('efi_stations_updated', handleStationsUpdated);
  }, []);

  const [postes, setPostes] = useState<Record<string, { goa: string; gasolina: string; gasolinaGain: string }>>(() => {
    try {
      const saved = localStorage.getItem('efi_postes_data_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.postes && Object.keys(parsed.postes).length > 0) {
          const sanitized: Record<string, { goa: string; gasolina: string; gasolinaGain: string }> = {};
          Object.entries(parsed.postes).forEach(([k, v]: [string, any]) => {
            sanitized[k] = {
              goa: (v.goa || '').replace('.', ','),
              gasolina: (v.gasolina || '').replace('.', ','),
              gasolinaGain: (v.gasolinaGain || '').replace('.', ','),
            };
          });
          return sanitized;
        }
      }
    } catch (e) {}
    const init: Record<string, { goa: string; gasolina: string; gasolinaGain: string }> = {};
    getPostesStations().forEach((st) => {
      init[st.name] = {
        goa: (st.defaultGoa || '').replace('.', ','),
        gasolina: (st.defaultGasolina || '').replace('.', ','),
        gasolinaGain: (st.defaultGain || '').replace('.', ','),
      };
    });
    return init;
  });

  // HVO Configuration con carga directa de localStorage y sanitización a coma decimal
  const [hvoGeneralBase, setHvoGeneralBase] = useState(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      return s ? (JSON.parse(s).hvoGeneralBase || '1,285').replace('.', ',') : '1,285';
    } catch (e) { return '1,285'; }
  });
  const [hvoGeneralAddition, setHvoGeneralAddition] = useState(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      return s ? (JSON.parse(s).hvoGeneralAddition || '0,243').replace('.', ',') : '0,243';
    } catch (e) { return '0,243'; }
  });
  const [hvoAlfajarinSinIva, setHvoAlfajarinSinIva] = useState(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      return s ? (JSON.parse(s).hvoAlfajarinSinIva || '1,528').replace('.', ',') : '1,528';
    } catch (e) { return '1,528'; }
  });
  const [hvoValdemoroAddition, setHvoValdemoroAddition] = useState(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      return s ? (JSON.parse(s).hvoValdemoroAddition || '0,070').replace('.', ',') : '0,070';
    } catch (e) { return '0,070'; }
  });

  // Gasóleo B Configuration con carga síncrona y sanitización a coma decimal
  const [gasoleoBPosteGlobal, setGasoleoBPosteGlobal] = useState(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      return s ? (JSON.parse(s).gasoleoBPosteGlobal || '1,350').replace('.', ',') : '1,350';
    } catch (e) { return '1,350'; }
  });
  const [gasoleoBRows, setGasoleoBRows] = useState<Record<string, { compra: string; transfer: string; gob: string; poste: string }>>(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      if (s && JSON.parse(s).gasoleoBRows) {
        const raw = JSON.parse(s).gasoleoBRows;
        const sanitized: Record<string, { compra: string; transfer: string; gob: string; poste: string }> = {};
        Object.entries(raw).forEach(([k, v]: [string, any]) => {
          sanitized[k] = {
            compra: (v.compra || '').replace('.', ','),
            transfer: (v.transfer || '').replace('.', ','),
            gob: (v.gob || '').replace('.', ','),
            poste: (v.poste || '').replace('.', ','),
          };
        });
        return sanitized;
      }
    } catch (e) {}
    return {
      'UCLES': { compra: '1,081', transfer: '1,098', gob: '1,329', poste: '1,350' },
      'TORREMOCHA': { compra: '1,081', transfer: '1,098', gob: '1,329', poste: '1,350' },
      'ARCOS': { compra: '1,081', transfer: '1,098', gob: '1,329', poste: '1,350' },
    };
  });

  const [adblueRows, setAdblueRows] = useState<Record<string, { compra: string; poste: string }>>(() => {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      if (s && JSON.parse(s).adblue) {
        const raw = JSON.parse(s).adblue;
        const sanitized: Record<string, { compra: string; poste: string }> = {};
        Object.entries(raw).forEach(([k, v]: [string, any]) => {
          sanitized[k] = {
            compra: (v.compra || '').replace('.', ','),
            poste: (v.poste || '').replace('.', ','),
          };
        });
        return sanitized;
      }
    } catch (e) {}
    return {
      'TORREJON': { compra: '0,536', poste: '0,849' },
      'ARCOS JALON': { compra: '0,265', poste: '0,749' },
      'ALFAJARIN': { compra: '0,400', poste: '0,849' },
      'TORREMOCHA': { compra: '0,265', poste: '0,749' },
      'MADRID': { compra: '0,536', poste: '0,849' },
      'VALLECAS': { compra: '0,619', poste: '0,849' },
      'HUMILLADERO': { compra: '0,577', poste: '0,790' },
      'UCLES': { compra: '0,300', poste: '0,799' },
      'BENAMEJI': { compra: '0,536', poste: '0,799' },
      'SORIA ALCUBILLAS': { compra: '0,255', poste: '0,849' },
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
      if (s && JSON.parse(s).bronco) {
        const raw = JSON.parse(s).bronco;
        return {
          ...raw,
          sinIva: (raw.sinIva || '').replace('.', ','),
          conIva: (raw.conIva || '').replace('.', ','),
          beneficio: (raw.beneficio || '').replace('.', ','),
          compra: (raw.compra || '').replace('.', ','),
        };
      }
    } catch (e) {}
    return {
      name: 'GASOLINA BRONCO',
      sinIva: '1,305',
      conIva: '1,579',
      beneficio: '0,048',
      compra: '1,242',
      fecha: '14/08/2026',
    };
  });

  const [gasesRows, setGasesRows] = useState<Record<string, { sinIva: string; poste: string }>>({
    'GLP / Autogas': { sinIva: '0,785', poste: '0,949' },
    'GNC (Gas Natural Comprimido)': { sinIva: '0,950', poste: '1,149' },
    'GNL (Gas Natural Licuado)': { sinIva: '0,890', poste: '1,079' },
  });

  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);
  const [imageToast, setImageToast] = useState<string | null>(null);
  const [validFromDate, setValidFromDate] = useState<string>(() => {
    try {
      return selectedDate || localStorage.getItem('efi_compras_valid_from') || new Date().toISOString().split('T')[0];
    } catch (e) {
      return selectedDate || new Date().toISOString().split('T')[0];
    }
  });

  const [comprasUpdateTick, setComprasUpdateTick] = useState(0);

  // Sincronizar fecha si cambia la prop selectedDate
  useEffect(() => {
    if (selectedDate && selectedDate !== validFromDate) {
      setValidFromDate(selectedDate);
      setCustomPostesFormulas(loadPostesFormulas(selectedDate));
      setComprasUpdateTick((t) => t + 1);
    }
  }, [selectedDate, validFromDate]);

  // Estados de Modo Formular para Postes
  const [isFormulaMode, setIsFormulaMode] = useState<boolean>(false);
  const [customPostesFormulas, setCustomPostesFormulas] = useState<Record<string, CellFormula>>(() => {
    return loadPostesFormulas(selectedDate || validFromDate);
  });

  // Reevaluación en vivo de todas las fórmulas de Postes en función del contexto global y actualizaciones
  const resolvedPostesFormulas = useMemo(() => {
    return reevaluateAllPostesFormulas(customPostesFormulas, selectedDate || validFromDate);
  }, [customPostesFormulas, selectedDate, validFromDate, comprasUpdateTick, postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, gasoleoBRows, adblueRows, broncoRow, gasesRows]);

  // Sincronizar fórmulas recalculadas a localStorage si cambiaron
  useEffect(() => {
    let hasDiff = false;
    for (const [key, item] of Object.entries(resolvedPostesFormulas)) {
      if (customPostesFormulas[key]?.evaluatedValue !== item.evaluatedValue) {
        hasDiff = true;
        break;
      }
    }
    if (hasDiff) {
      try {
        const effDate = selectedDate || validFromDate;
        localStorage.setItem(`efi_postes_custom_formulas_${effDate}`, JSON.stringify(resolvedPostesFormulas));
        localStorage.setItem('efi_postes_custom_formulas_global', JSON.stringify(resolvedPostesFormulas));
      } catch (e) {}
    }
  }, [resolvedPostesFormulas, selectedDate, validFromDate, customPostesFormulas]);

  const [activeModalCell, setActiveModalCell] = useState<{
    cellKey: string;
    cellTitle: string;
    defaultValue: number;
    currentFormula?: string;
    columnLabel?: string;
    onApplyToColumn?: (formulaStr: string) => void;
  } | null>(null);

  useEffect(() => {
    const handleUpdates = () => {
      try {
        const saved = selectedDate || localStorage.getItem('efi_compras_valid_from');
        if (saved) {
          setValidFromDate(saved);
          setCustomPostesFormulas(loadPostesFormulas(saved));
        } else {
          setCustomPostesFormulas(loadPostesFormulas(validFromDate));
        }
      } catch (e) {
        setCustomPostesFormulas(loadPostesFormulas(validFromDate));
      }
      setComprasUpdateTick((t) => t + 1);
    };
    window.addEventListener('efi_valid_date_changed', handleUpdates);
    window.addEventListener('efi_compras_updated', handleUpdates);
    window.addEventListener('efi_sabana_updated', handleUpdates);
    window.addEventListener('efi_export_updated', handleUpdates);
    window.addEventListener('efi_postes_updated', handleUpdates);
    window.addEventListener('storage', handleUpdates);
    return () => {
      window.removeEventListener('efi_valid_date_changed', handleUpdates);
      window.removeEventListener('efi_compras_updated', handleUpdates);
      window.removeEventListener('efi_sabana_updated', handleUpdates);
      window.removeEventListener('efi_export_updated', handleUpdates);
      window.removeEventListener('efi_postes_updated', handleUpdates);
      window.removeEventListener('storage', handleUpdates);
    };
  }, [selectedDate, validFromDate]);

  // Guardar fórmula en celda de Postes
  const handleSaveFormula = (cellKey: string, rawFormula: string, evaluatedValue: number) => {
    const updated = savePostesFormula(validFromDate, cellKey, {
      rawFormula,
      evaluatedValue,
      updatedAt: new Date().toISOString(),
    });
    setCustomPostesFormulas(updated);

    // Sincronizar en el estado correspondiente de Postes para que los cálculos e imágenes se actualicen
    postesStations.forEach((st) => {
      if (cellKey === `POSTE_${st.name}_GOA`) {
        const valStr = formatNum(evaluatedValue, 3);
        setPostes((prev) => ({
          ...prev,
          [st.name]: { ...(prev[st.name] || { goa: '', gasolina: '', gasolinaGain: '' }), goa: valStr },
        }));
        setModifiedKeys((prev) => new Set(prev).add(`poste_${st.name}_goa`));
      } else if (cellKey === `POSTE_${st.name}_GASOLINA`) {
        const valStr = formatNum(evaluatedValue, 3);
        setPostes((prev) => ({
          ...prev,
          [st.name]: { ...(prev[st.name] || { goa: '', gasolina: '', gasolinaGain: '' }), gasolina: valStr },
        }));
        setModifiedKeys((prev) => new Set(prev).add(`poste_${st.name}_gasolina`));
      } else if (cellKey === `POSTE_${st.name}_MARGEN_GASOLINA`) {
        const valStr = formatNum(evaluatedValue, 3);
        setPostes((prev) => ({
          ...prev,
          [st.name]: { ...(prev[st.name] || { goa: '', gasolina: '', gasolinaGain: '' }), gasolinaGain: valStr },
        }));
        setModifiedKeys((prev) => new Set(prev).add(`poste_${st.name}_gasolinaGain`));
      }
    });

    // Casos HVO
    if (cellKey === 'POSTE_HVO_GENERAL_BASE') {
      setHvoGeneralBase(formatNum(evaluatedValue, 3));
      setModifiedKeys((prev) => new Set(prev).add('hvo_gen_base'));
    } else if (cellKey === 'POSTE_HVO_GENERAL_ADD') {
      setHvoGeneralAddition(formatNum(evaluatedValue, 3));
      setModifiedKeys((prev) => new Set(prev).add('hvo_gen_add'));
    } else if (cellKey === 'POSTE_HVO_ALFAJARIN_SIN_IVA') {
      setHvoAlfajarinSinIva(formatNum(evaluatedValue, 3));
      setModifiedKeys((prev) => new Set(prev).add('hvo_alfajarin'));
    } else if (cellKey === 'POSTE_HVO_VALDEMORO_ADD') {
      setHvoValdemoroAddition(formatNum(evaluatedValue, 3));
      setModifiedKeys((prev) => new Set(prev).add('hvo_valdemoro_add'));
    }

    // Casos Gasóleo B
    ['UCLES', 'TORREMOCHA', 'ARCOS'].forEach((stName) => {
      if (cellKey === `POSTE_GASB_${stName}_COMPRA`) {
        setGasoleoBRows((prev) => ({
          ...prev,
          [stName]: { ...prev[stName], compra: formatNum(evaluatedValue, 3) },
        }));
        setModifiedKeys((prev) => new Set(prev).add(`gasb_${stName}`));
      } else if (cellKey === `POSTE_GASB_${stName}_TRANSFER`) {
        setGasoleoBRows((prev) => ({
          ...prev,
          [stName]: { ...prev[stName], transfer: formatNum(evaluatedValue, 3) },
        }));
        setModifiedKeys((prev) => new Set(prev).add(`gasb_transfer_${stName}`));
      } else if (cellKey === `POSTE_GASB_${stName}_POSTE`) {
        setGasoleoBRows((prev) => ({
          ...prev,
          [stName]: { ...prev[stName], poste: formatNum(evaluatedValue, 3) },
        }));
        setModifiedKeys((prev) => new Set(prev).add(`gasb_poste_${stName}`));
      }
    });

    // Casos AdBlue
    Object.keys(adblueRows).forEach((stName) => {
      if (cellKey === `POSTE_ADBLUE_${stName}_COMPRA`) {
        setAdblueRows((prev) => ({
          ...prev,
          [stName]: { ...prev[stName], compra: formatNum(evaluatedValue, 3) },
        }));
        setModifiedKeys((prev) => new Set(prev).add(`adblue_${stName}`));
      } else if (cellKey === `POSTE_ADBLUE_${stName}_POSTE`) {
        setAdblueRows((prev) => ({
          ...prev,
          [stName]: { ...prev[stName], poste: formatNum(evaluatedValue, 3) },
        }));
        setModifiedKeys((prev) => new Set(prev).add(`adblue_${stName}`));
      }
    });

    // Casos Gases
    Object.keys(gasesRows).forEach((gasName) => {
      let shortName = 'GLP';
      if (gasName.includes('GNC')) shortName = 'GNC';
      else if (gasName.includes('GNL')) shortName = 'GNL';
      if (cellKey === `POSTE_GASES_${shortName}_SIN_IVA`) {
        setGasesRows((prev) => ({
          ...prev,
          [gasName]: { ...prev[gasName], sinIva: formatNum(evaluatedValue, 3) },
        }));
        setModifiedKeys((prev) => new Set(prev).add(`gas_${gasName}`));
      } else if (cellKey === `POSTE_GASES_${shortName}_POSTE`) {
        setGasesRows((prev) => ({
          ...prev,
          [gasName]: { ...prev[gasName], poste: formatNum(evaluatedValue, 3) },
        }));
        setModifiedKeys((prev) => new Set(prev).add(`gas_${gasName}`));
      }
    });

    // Casos Bronco
    if (cellKey === 'POSTE_BRONCO_SIN_IVA') {
      setBroncoRow((prev) => ({ ...prev, sinIva: formatNum(evaluatedValue, 3) }));
      setModifiedKeys((prev) => new Set(prev).add('bronco_sinIva'));
    } else if (cellKey === 'POSTE_BRONCO_CON_IVA') {
      setBroncoRow((prev) => ({ ...prev, conIva: formatNum(evaluatedValue, 3) }));
      setModifiedKeys((prev) => new Set(prev).add('bronco_conIva'));
    } else if (cellKey === 'POSTE_BRONCO_BENEFICIO') {
      setBroncoRow((prev) => ({ ...prev, beneficio: formatNum(evaluatedValue, 3) }));
      setModifiedKeys((prev) => new Set(prev).add('bronco_beneficio'));
    } else if (cellKey === 'POSTE_BRONCO_COMPRA') {
      setBroncoRow((prev) => ({ ...prev, compra: formatNum(evaluatedValue, 3) }));
      setModifiedKeys((prev) => new Set(prev).add('bronco_compra'));
    }

    setImageToast(`Fórmula guardada para ${cellKey}`);
    setTimeout(() => setImageToast(null), 3000);
  };

  // Eliminar fórmula de celda
  const handleRemoveFormula = (cellKey: string) => {
    const updated = removePostesFormula(validFromDate, cellKey);
    setCustomPostesFormulas(updated);
    setImageToast(`Fórmula restablecida a valor original`);
    setTimeout(() => setImageToast(null), 3000);
  };

  // Limpiar todas las fórmulas de Postes
  const handleClearAllFormulas = () => {
    if (window.confirm('¿Seguro que deseas eliminar todas las fórmulas personalizadas de la ventana de Postes y volver a los valores estándar?')) {
      clearAllPostesFormulas(validFromDate);
      setCustomPostesFormulas({});
      setImageToast('Todas las fórmulas de Postes han sido restablecidas.');
      setTimeout(() => setImageToast(null), 3000);
    }
  };

  // Aplicar fórmula a toda la columna de Postes (Tabla 1, Gasóleo B o AdBlue)
  const handleApplyFormulaToPostesColumn = (
    columnType:
      | 'goa'
      | 'margenGoa'
      | 'goaPremium'
      | 'gasolina'
      | 'margenGasolina'
      | 'gasbCompra'
      | 'gasbTransfer'
      | 'gasbTransferConIva'
      | 'gasbPoste'
      | 'adblueCompra'
      | 'adblueConIva'
      | 'adbluePoste',
    rawFormula: string,
    sourceStationName?: string
  ) => {
    const { map } = getProgramVariables(validFromDate);
    const updatedFormulas = { ...customPostesFormulas };
    const sourceNorm = sourceStationName ? sourceStationName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() : '';

    if (columnType.startsWith('gasb')) {
      const gasbStations = ['UCLES', 'TORREMOCHA', 'ARCOS'];
      gasbStations.forEach((stName) => {
        let cellKey = '';
        if (columnType === 'gasbCompra') cellKey = `POSTE_GASB_${stName}_COMPRA`;
        else if (columnType === 'gasbTransfer') cellKey = `POSTE_GASB_${stName}_TRANSFER`;
        else if (columnType === 'gasbTransferConIva') cellKey = `POSTE_GASB_${stName}_TRANSFER_CON_IVA`;
        else if (columnType === 'gasbPoste') cellKey = `POSTE_GASB_${stName}_POSTE`;

        const targetNorm = stName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        let adaptedFormula = rawFormula;
        if (sourceNorm && sourceStationName && targetNorm !== sourceNorm) {
          adaptedFormula = adaptedFormula.split(sourceNorm).join(targetNorm);
          adaptedFormula = adaptedFormula.split(sourceStationName).join(stName);
        }

        const evalRes = evaluateFormula(adaptedFormula, map, { stationName: stName });
        if (evalRes.success) {
          savePostesFormula(validFromDate, cellKey, {
            rawFormula: adaptedFormula,
            evaluatedValue: evalRes.value,
            updatedAt: new Date().toISOString(),
          });
          updatedFormulas[cellKey] = {
            rawFormula: adaptedFormula,
            evaluatedValue: evalRes.value,
            updatedAt: new Date().toISOString(),
          };

          if (columnType === 'gasbCompra') {
            setGasoleoBRows((prev) => ({
              ...prev,
              [stName]: { ...prev[stName], compra: formatNum(evalRes.value, 3) },
            }));
            setModifiedKeys((prev) => new Set(prev).add(`gasb_${stName}`));
          } else if (columnType === 'gasbTransfer') {
            setGasoleoBRows((prev) => ({
              ...prev,
              [stName]: { ...prev[stName], transfer: formatNum(evalRes.value, 3) },
            }));
            setModifiedKeys((prev) => new Set(prev).add(`gasb_transfer_${stName}`));
          } else if (columnType === 'gasbPoste') {
            setGasoleoBRows((prev) => ({
              ...prev,
              [stName]: { ...prev[stName], poste: formatNum(evalRes.value, 3) },
            }));
            setModifiedKeys((prev) => new Set(prev).add(`gasb_poste_${stName}`));
          }
        }
      });
    } else if (columnType.startsWith('adblue')) {
      Object.keys(adblueRows).forEach((stName) => {
        let cellKey = '';
        if (columnType === 'adblueCompra') cellKey = `POSTE_ADBLUE_${stName}_COMPRA`;
        else if (columnType === 'adblueConIva') cellKey = `POSTE_ADBLUE_${stName}_CON_IVA`;
        else if (columnType === 'adbluePoste') cellKey = `POSTE_ADBLUE_${stName}_POSTE`;

        const targetNorm = stName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        let adaptedFormula = rawFormula;
        if (sourceNorm && sourceStationName && targetNorm !== sourceNorm) {
          adaptedFormula = adaptedFormula.split(sourceNorm).join(targetNorm);
          adaptedFormula = adaptedFormula.split(sourceStationName).join(stName);
        }

        const evalRes = evaluateFormula(adaptedFormula, map, { stationName: stName });
        if (evalRes.success) {
          savePostesFormula(validFromDate, cellKey, {
            rawFormula: adaptedFormula,
            evaluatedValue: evalRes.value,
            updatedAt: new Date().toISOString(),
          });
          updatedFormulas[cellKey] = {
            rawFormula: adaptedFormula,
            evaluatedValue: evalRes.value,
            updatedAt: new Date().toISOString(),
          };

          if (columnType === 'adblueCompra') {
            setAdblueRows((prev) => ({
              ...prev,
              [stName]: { ...prev[stName], compra: formatNum(evalRes.value, 3) },
            }));
            setModifiedKeys((prev) => new Set(prev).add(`adblue_${stName}`));
          } else if (columnType === 'adbluePoste') {
            setAdblueRows((prev) => ({
              ...prev,
              [stName]: { ...prev[stName], poste: formatNum(evalRes.value, 3) },
            }));
            setModifiedKeys((prev) => new Set(prev).add(`adblue_${stName}`));
          }
        }
      });
    } else {
      const nextMods = new Set(modifiedKeys);
      postesStations.forEach((st) => {
        let cellKey = '';
        if (columnType === 'goa') cellKey = `POSTE_${st.name}_GOA`;
        else if (columnType === 'margenGoa') cellKey = `POSTE_${st.name}_MARGEN_GOA`;
        else if (columnType === 'goaPremium') cellKey = `POSTE_${st.name}_GOA_PREMIUM`;
        else if (columnType === 'gasolina') cellKey = `POSTE_${st.name}_GASOLINA`;
        else if (columnType === 'margenGasolina') cellKey = `POSTE_${st.name}_MARGEN_GASOLINA`;

        const targetNorm = st.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

        let adaptedFormula = rawFormula;
        if (sourceNorm && sourceStationName && targetNorm !== sourceNorm) {
          adaptedFormula = adaptedFormula.split(sourceNorm).join(targetNorm);
          adaptedFormula = adaptedFormula.split(sourceStationName).join(st.name);
        }

        const evalRes = evaluateFormula(adaptedFormula, map, { stationName: st.name });
        if (evalRes.success) {
          savePostesFormula(validFromDate, cellKey, {
            rawFormula: adaptedFormula,
            evaluatedValue: evalRes.value,
            updatedAt: new Date().toISOString(),
          });
          updatedFormulas[cellKey] = {
            rawFormula: adaptedFormula,
            evaluatedValue: evalRes.value,
            updatedAt: new Date().toISOString(),
          };

          if (columnType === 'goa') {
            setPostes((prev) => ({
              ...prev,
              [st.name]: { ...(prev[st.name] || { goa: '', gasolina: '', gasolinaGain: '' }), goa: formatNum(evalRes.value, 3) },
            }));
            nextMods.add(`poste_${st.name}_goa`);
            nextMods.add(`poste_${st.name}_margenGoa`);
            nextMods.add(`poste_${st.name}_goaPremium`);
          } else if (columnType === 'gasolina') {
            setPostes((prev) => ({
              ...prev,
              [st.name]: { ...(prev[st.name] || { goa: '', gasolina: '', gasolinaGain: '' }), gasolina: formatNum(evalRes.value, 3) },
            }));
            nextMods.add(`poste_${st.name}_gasolina`);
            nextMods.add(`poste_${st.name}_gasolinaGain`);
          } else if (columnType === 'margenGasolina') {
            setPostes((prev) => ({
              ...prev,
              [st.name]: { ...(prev[st.name] || { goa: '', gasolina: '', gasolinaGain: '' }), gasolinaGain: formatNum(evalRes.value, 3) },
            }));
            nextMods.add(`poste_${st.name}_gasolinaGain`);
          } else if (columnType === 'margenGoa') {
            nextMods.add(`poste_${st.name}_margenGoa`);
          } else if (columnType === 'goaPremium') {
            nextMods.add(`poste_${st.name}_goaPremium`);
          }
        }
      });
      setModifiedKeys(nextMods);
    }

    setCustomPostesFormulas(updatedFormulas);
    setImageToast(`Fórmula aplicada a toda la columna`);
    setTimeout(() => setImageToast(null), 3500);
  };

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
    return getSabanaTariff60ConIvaForStation(stName, selectedDate || validFromDate);
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

  // Cálculos dinámicos de HVO con soporte completo de fórmulas
  const hvoGenBaseVal = resolvedPostesFormulas['POSTE_HVO_GENERAL_BASE']?.evaluatedValue ?? parseNum(hvoGeneralBase);
  const hvoGenAddVal = resolvedPostesFormulas['POSTE_HVO_GENERAL_ADD']?.evaluatedValue ?? parseNum(hvoGeneralAddition);
  const computedHvoGeneralSinIva = resolvedPostesFormulas['POSTE_HVO_GENERAL_SIN_IVA']?.evaluatedValue ?? Number((hvoGenBaseVal + hvoGenAddVal).toFixed(4));
  const computedHvoGeneralConIva = resolvedPostesFormulas['POSTE_HVO_GENERAL_CON_IVA']?.evaluatedValue ?? Number((computedHvoGeneralSinIva * 1.21).toFixed(4));

  // HVO Alfajarín: Por defecto se copia del HVO Poste General, o su valor específico
  const hvoAlfaSinVal = resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA']?.evaluatedValue ?? (hvoAlfajarinSinIva && parseNum(hvoAlfajarinSinIva) > 0 ? parseNum(hvoAlfajarinSinIva) : computedHvoGeneralSinIva);
  const computedHvoAlfajarinSinIva = hvoAlfaSinVal;
  const computedHvoAlfajarinConIva = resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_CON_IVA']?.evaluatedValue ?? Number((computedHvoAlfajarinSinIva * 1.21).toFixed(4));

  // HVO Valdemoro: Se le suma el monto al GOA Poste Valdemoro (con IVA) y para calcular sin IVA se divide entre 1.21
  const goaValdemoroPrice = resolvedPostesFormulas['POSTE_VALDEMORO_GOA']?.evaluatedValue ?? parseNum(postes['VALDEMORO']?.goa || postes['ES VALDEMORO']?.goa || '1.659');
  const hvoValAddVal = resolvedPostesFormulas['POSTE_HVO_VALDEMORO_ADD']?.evaluatedValue ?? parseNum(hvoValdemoroAddition);
  const computedHvoValdemoroConIva = resolvedPostesFormulas['POSTE_HVO_VALDEMORO_CON_IVA']?.evaluatedValue ?? Number((goaValdemoroPrice + hvoValAddVal).toFixed(4));
  const computedHvoValdemoroSinIva = resolvedPostesFormulas['POSTE_HVO_VALDEMORO_SIN_IVA']?.evaluatedValue ?? Number((computedHvoValdemoroConIva / 1.21).toFixed(4));

  const postesDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper centralizado para persistir Postes y HVO y emitir eventos reactivos al instante
  const executePersistPostesData = (
    currentPostes = postes,
    currentGenBase = hvoGeneralBase,
    currentGenAdd = hvoGeneralAddition,
    currentAlfajarin = hvoAlfajarinSinIva,
    currentValdemoro = hvoValdemoroAddition,
    currentModified = modifiedKeys,
    currentGasoleoB = gasoleoBRows,
    currentAdblue = adblueRows,
    currentGases = gasesRows,
    currentBronco = broncoRow
  ) => {
    try {
      const dataToSave = {
        postes: currentPostes,
        hvoGeneralBase: currentGenBase,
        hvoGeneralAddition: currentGenAdd,
        hvoAlfajarinSinIva: currentAlfajarin,
        hvoValdemoroAddition: currentValdemoro,
        gasoleoBRows: currentGasoleoB,
        gasoleoBPosteGlobal,
        adblue: currentAdblue,
        gases: currentGases,
        bronco: currentBronco,
        modified: Array.from(currentModified),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('efi_postes_data_v2', JSON.stringify(dataToSave));
      window.dispatchEvent(new Event('efi_postes_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  const persistPostesData = (
    currentPostes = postes,
    currentGenBase = hvoGeneralBase,
    currentGenAdd = hvoGeneralAddition,
    currentAlfajarin = hvoAlfajarinSinIva,
    currentValdemoro = hvoValdemoroAddition,
    currentModified = modifiedKeys,
    currentGasoleoB = gasoleoBRows,
    currentAdblue = adblueRows,
    currentGases = gasesRows,
    currentBronco = broncoRow,
    immediate = false
  ) => {
    if (postesDebounceTimerRef.current) {
      clearTimeout(postesDebounceTimerRef.current);
    }
    if (immediate) {
      executePersistPostesData(
        currentPostes,
        currentGenBase,
        currentGenAdd,
        currentAlfajarin,
        currentValdemoro,
        currentModified,
        currentGasoleoB,
        currentAdblue,
        currentGases,
        currentBronco
      );
      return;
    }
    postesDebounceTimerRef.current = setTimeout(() => {
      executePersistPostesData(
        currentPostes,
        currentGenBase,
        currentGenAdd,
        currentAlfajarin,
        currentValdemoro,
        currentModified,
        currentGasoleoB,
        currentAdblue,
        currentGases,
        currentBronco
      );
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (postesDebounceTimerRef.current) {
        clearTimeout(postesDebounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('efi_postes_data_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.postes) {
          const sanitized: Record<string, { goa: string; gasolina: string; gasolinaGain: string }> = {};
          Object.entries(parsed.postes).forEach(([k, v]: [string, any]) => {
            sanitized[k] = {
              goa: (v.goa || '').replace('.', ','),
              gasolina: (v.gasolina || '').replace('.', ','),
              gasolinaGain: (v.gasolinaGain || '').replace('.', ','),
            };
          });
          setPostes(sanitized);
        }
        if (parsed.hvoGeneralBase) setHvoGeneralBase(String(parsed.hvoGeneralBase).replace('.', ','));
        if (parsed.hvoGeneralAddition) setHvoGeneralAddition(String(parsed.hvoGeneralAddition).replace('.', ','));
        if (parsed.hvoAlfajarinSinIva) setHvoAlfajarinSinIva(String(parsed.hvoAlfajarinSinIva).replace('.', ','));
        if (parsed.hvoValdemoroAddition) setHvoValdemoroAddition(String(parsed.hvoValdemoroAddition).replace('.', ','));
        if (parsed.gasoleoBRows) {
          const sanitized: Record<string, { compra: string; transfer: string; gob: string; poste: string }> = {};
          Object.entries(parsed.gasoleoBRows).forEach(([k, v]: [string, any]) => {
            sanitized[k] = {
              compra: (v.compra || '').replace('.', ','),
              transfer: (v.transfer || '').replace('.', ','),
              gob: (v.gob || '').replace('.', ','),
              poste: (v.poste || '').replace('.', ','),
            };
          });
          setGasoleoBRows(sanitized);
        }
        if (parsed.gasoleoBPosteGlobal) setGasoleoBPosteGlobal(String(parsed.gasoleoBPosteGlobal).replace('.', ','));
        if (parsed.adblue) {
          const sanitized: Record<string, { compra: string; poste: string }> = {};
          Object.entries(parsed.adblue).forEach(([k, v]: [string, any]) => {
            sanitized[k] = {
              compra: (v.compra || '').replace('.', ','),
              poste: (v.poste || '').replace('.', ','),
            };
          });
          setAdblueRows(sanitized);
        }
        if (parsed.gases) {
          const sanitized: Record<string, { sinIva: string; poste: string }> = {};
          Object.entries(parsed.gases).forEach(([k, v]: [string, any]) => {
            sanitized[k] = {
              sinIva: (v.sinIva || '').replace('.', ','),
              poste: (v.poste || '').replace('.', ','),
            };
          });
          setGasesRows(sanitized);
        }
        if (parsed.bronco) {
          setBroncoRow({
            ...parsed.bronco,
            sinIva: (parsed.bronco.sinIva || '').replace('.', ','),
            conIva: (parsed.bronco.conIva || '').replace('.', ','),
            beneficio: (parsed.bronco.beneficio || '').replace('.', ','),
            compra: (parsed.bronco.compra || '').replace('.', ','),
          });
        }
        if (parsed.modified) setModifiedKeys(new Set(parsed.modified));
      } else {
        persistPostesData();
      }
    } catch (e) {
      console.error(e);
    }

    const handleCierreDia = () => {
      setModifiedKeys(new Set());
      try {
        const saved = localStorage.getItem('efi_postes_data_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.modified = [];
          localStorage.setItem('efi_postes_data_v2', JSON.stringify(parsed));
          window.dispatchEvent(new Event('efi_postes_updated'));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (e) {}
    };

    window.addEventListener('efi_cierre_dia', handleCierreDia);
    return () => {
      window.removeEventListener('efi_cierre_dia', handleCierreDia);
    };
  }, []);

  const handlePosteChange = (stName: string, field: 'goa' | 'gasolina' | 'gasolinaGain', rawVal: string) => {
    const cleanVal = rawVal.replace('.', ',');
    const updatedPostes = {
      ...postes,
      [stName]: {
        ...postes[stName],
        [field]: cleanVal,
      },
    };
    setPostes(updatedPostes);

    const updatedMods = new Set(modifiedKeys);
    updatedMods.add(`poste_${stName}_${field}`);
    if (field === 'goa') {
      updatedMods.add(`poste_${stName}_margenGoa`);
      updatedMods.add(`poste_${stName}_goaPremium`);
    }
    if (field === 'gasolina') {
      updatedMods.add(`poste_${stName}_gasolinaGain`);
    }
    setModifiedKeys(updatedMods);
    setIsSaved(false);

    persistPostesData(updatedPostes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods);
  };

  const handleSave = () => {
    executePersistPostesData();
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

      const customGoa = resolvedPostesFormulas[`POSTE_${stName}_GOA`];
      const customGas = resolvedPostesFormulas[`POSTE_${stName}_GASOLINA`];

      ctx.fillStyle = '#FFF000';
      ctx.fillRect(col1Width + col2Width, yStart, col3Width, rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      const goaPriceStr = (customGoa ? customGoa.evaluatedValue : parseNum(item.goa)).toFixed(3).replace('.', ',');
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
      const gasPriceStr = (customGas ? customGas.evaluatedValue : parseNum(item.gasolina)).toFixed(3).replace('.', ',');
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
      const customCompra = resolvedPostesFormulas[`POSTE_GASB_${stName}_COMPRA`];
      const compraNum = customCompra ? customCompra.evaluatedValue : parseNum(item.compra || '1.005');
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
      const customCompra = resolvedPostesFormulas[`POSTE_GASB_${stName}_COMPRA`];
      const customTransfer = resolvedPostesFormulas[`POSTE_GASB_${stName}_TRANSFER`];
      const compraNum = customCompra ? customCompra.evaluatedValue : parseNum(item.compra || '1.005');
      const autoTransferNum = Number((compraNum + 0.017).toFixed(3));
      const isTransferMod = modifiedKeys.has(`gasb_transfer_${stName}`);
      const transferNum = customTransfer ? customTransfer.evaluatedValue : (isTransferMod && item.transfer ? parseNum(item.transfer) : autoTransferNum);
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
      const customCompra = resolvedPostesFormulas[`POSTE_GASB_${stName}_COMPRA`];
      const customTransfer = resolvedPostesFormulas[`POSTE_GASB_${stName}_TRANSFER`];
      const customTransCon = resolvedPostesFormulas[`POSTE_GASB_${stName}_TRANSFER_CON_IVA`];
      const customPoste = resolvedPostesFormulas[`POSTE_GASB_${stName}_POSTE`];

      const compraNum = customCompra ? customCompra.evaluatedValue : parseNum(item.compra || '1.005');
      const autoTransferNum = Number((compraNum + 0.017).toFixed(3));
      const isTransferMod = modifiedKeys.has(`gasb_transfer_${stName}`);
      const transferNum = customTransfer ? customTransfer.evaluatedValue : (isTransferMod && item.transfer ? parseNum(item.transfer) : autoTransferNum);
      const transfriredConIva = customTransCon ? customTransCon.evaluatedValue : Number((transferNum * 1.21).toFixed(3));
      const autoPosteNum = Number(((compraNum + 0.035) * 1.21).toFixed(3));
      const isPosteMod = modifiedKeys.has(`gasb_poste_${stName}`);
      const posteNum = customPoste ? customPoste.evaluatedValue : (isPosteMod && item.poste ? parseNum(item.poste) : autoPosteNum);

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

    const customSin = resolvedPostesFormulas['POSTE_BRONCO_SIN_IVA'];
    const customCon = resolvedPostesFormulas['POSTE_BRONCO_CON_IVA'];
    const broncoSinNum = customSin ? customSin.evaluatedValue : parseNum(broncoRow.sinIva);
    const broncoConNum = customCon ? customCon.evaluatedValue : (customSin ? Number((broncoSinNum * 1.21).toFixed(3)) : parseNum(broncoRow.conIva));

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
    ctx.fillText(broncoSinNum.toFixed(3).replace('.', ','), col1Width + col2Width + col3Width / 2, rowHeight / 2);

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
    ctx.fillText(broncoConNum.toFixed(3).replace('.', ','), col1Width + col2Width + col3Width / 2, y2 + rowHeight / 2);

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
              {Object.keys(customPostesFormulas).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-950 text-amber-300 border border-amber-500/40">
                  {Object.keys(customPostesFormulas).length}
                </span>
              )}
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
                  Modo Formular Activo en Postes
                </span>
                <span>Haz clic sobre cualquiera de las celdas de la tabla para formular con fórmulas tipo Excel</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Puedes formular Gasóleo A, Margen GOA, GOA Premium, Gasolina 95, Margen Gasolina, HVO, Gasóleo B, AdBlue y Bronco usando variables de cualquier ventana del sistema.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {Object.keys(customPostesFormulas).length > 0 && (
              <button
                onClick={handleClearAllFormulas}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restablecer Todo ({Object.keys(customPostesFormulas).length})</span>
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full">
              Amarillo = Dato Modificado Hoy
            </span>
            <span className="text-xs text-amber-400/90 font-mono bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 font-bold">
              Fórmula: GOA Premium = GOA + 0.04 EUR
            </span>
          </div>
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
              {postesStations.map((st) => {
                const item = postes[st.name] || { goa: st.defaultGoa, gasolina: st.defaultGasolina, gasolinaGain: st.defaultGain };

                // 1. Gasóleo A
                const goaKey = `POSTE_${st.name}_GOA`;
                const customGoa = resolvedPostesFormulas[goaKey];
                const goaNum = customGoa ? customGoa.evaluatedValue : parseNum(item.goa);
                const goaDisplay = customGoa ? formatNum(customGoa.evaluatedValue, 3) : item.goa;

                // 2. Margen Gasóleo A = Tarifa 60 con IVA - Precio Poste Gasóleo A
                const { margen: defaultMargenGoa, t60ConIva } = getMargenGoa(st.name, goaNum);
                const margenGoaKey = `POSTE_${st.name}_MARGEN_GOA`;
                const customMargenGoa = resolvedPostesFormulas[margenGoaKey];
                const margenGoa = customMargenGoa ? customMargenGoa.evaluatedValue : defaultMargenGoa;

                // 3. GOA Premium = GOA + 0.04€
                const defaultPremium = Number((goaNum + 0.04).toFixed(3));
                const premiumKey = `POSTE_${st.name}_GOA_PREMIUM`;
                const customPremium = resolvedPostesFormulas[premiumKey];
                const premiumPrice = customPremium ? customPremium.evaluatedValue : defaultPremium;

                // 4. Gasolina 95
                const hasGasolina = st.hasGasolina !== false && st.name !== 'ARCOS';
                const gasKey = `POSTE_${st.name}_GASOLINA`;
                const customGas = resolvedPostesFormulas[gasKey];
                const gasNum = customGas ? customGas.evaluatedValue : parseNum(item.gasolina);
                const gasDisplay = customGas ? formatNum(customGas.evaluatedValue, 3) : item.gasolina;

                const isGoaMod = modifiedKeys.has(`poste_${st.name}_goa`);
                const isMargenGoaMod = modifiedKeys.has(`poste_${st.name}_margenGoa`) || isGoaMod;
                const isPremiumMod = modifiedKeys.has(`poste_${st.name}_goaPremium`) || isGoaMod;
                const isGasMod = modifiedKeys.has(`poste_${st.name}_gasolina`);
                const isGainMod = modifiedKeys.has(`poste_${st.name}_gasolinaGain`) || isGasMod;

                // 5. Margen Gasolina según fórmula oficial de la columna D
                const autoMargenGas = hasGasolina ? getMargenGasolina(st.name, gasNum) : null;
                const margenGasolinaKey = `POSTE_${st.name}_MARGEN_GASOLINA`;
                const customMargenGas = resolvedPostesFormulas[margenGasolinaKey];
                const displayMargenGas = customMargenGas
                  ? formatNum(customMargenGas.evaluatedValue, 3)
                  : isGainMod
                  ? item.gasolinaGain
                  : autoMargenGas !== null
                  ? formatNum(autoMargenGas, 3)
                  : '—';

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
                    <td
                      onClick={() => {
                        if (!isFormulaMode) return;
                        setActiveModalCell({
                          cellKey: goaKey,
                          cellTitle: `${st.name} — Gasóleo A (€/L)`,
                          defaultValue: parseNum(item.goa),
                          currentFormula: customGoa?.rawFormula,
                          columnLabel: `Gasóleo A (€/L) - ${st.name}`,
                          onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('goa', f, st.name),
                        });
                      }}
                      className={`py-3 px-4 transition-all ${
                        isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10' : ''
                      } ${isGoaMod ? 'bg-amber-400/20' : ''}`}
                      title={
                        isFormulaMode
                          ? customGoa
                            ? `Fórmula: ${customGoa.rawFormula}`
                            : 'Haz clic para formular esta celda'
                          : customGoa
                          ? `Fórmula: ${customGoa.rawFormula}`
                          : 'Precio Poste Gasóleo A'
                      }
                    >
                      <div className="relative inline-flex items-center">
                        {isFormulaMode ? (
                          <div
                            className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all text-center flex items-center justify-between ${
                              customGoa
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                                : 'bg-slate-950 border border-slate-700 text-slate-200'
                            }`}
                          >
                            {customGoa && (
                              <span className="mr-1 text-[9px] font-black bg-slate-950 text-amber-400 px-1 rounded">
                                fx
                              </span>
                            )}
                            <span className="flex-1 text-right">{goaDisplay}</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={goaDisplay}
                            onChange={(e) => handlePosteChange(st.name, 'goa', e.target.value)}
                            className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                              customGoa
                                ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                                : isGoaMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                                : 'bg-slate-950 border border-slate-700 text-slate-200 focus:border-amber-400'
                            }`}
                          />
                        )}
                        {customGoa && !isFormulaMode && (
                          <span className="ml-1.5 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            fx
                          </span>
                        )}
                        {isGoaMod && !customGoa && (
                          <span className="ml-2 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            HOY
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Margen Gasóleo A (€) = Tarifa 60 con IVA - Poste GOA */}
                    <td
                      onClick={() => {
                        if (!isFormulaMode) return;
                        setActiveModalCell({
                          cellKey: margenGoaKey,
                          cellTitle: `${st.name} — Margen GOA (€)`,
                          defaultValue: defaultMargenGoa,
                          currentFormula: customMargenGoa?.rawFormula,
                          columnLabel: `Margen GOA (€) - ${st.name}`,
                          onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('margenGoa', f, st.name),
                        });
                      }}
                      className={`py-3 px-4 transition-all ${
                        isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 hover:ring-1 hover:ring-amber-400/50' : ''
                      } ${isMargenGoaMod ? 'bg-amber-400/20' : 'bg-slate-900/40'}`}
                      title={
                        isFormulaMode
                          ? customMargenGoa
                            ? `Fórmula: ${customMargenGoa.rawFormula}`
                            : 'Haz clic para formular esta celda'
                          : customMargenGoa
                          ? `Fórmula: ${customMargenGoa.rawFormula}`
                          : 'T60 Con IVA - Poste'
                      }
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-1.5">
                          {customMargenGoa && (
                            <span className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm">
                              fx
                            </span>
                          )}
                          <span
                            className={`font-mono font-bold text-xs ${
                              customMargenGoa
                                ? 'text-amber-300 font-black'
                                : isMargenGoaMod
                                ? 'text-amber-300 font-black'
                                : margenGoa >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {margenGoa >= 0 ? `+${formatNum(margenGoa, 3)}` : formatNum(margenGoa, 3)} €
                          </span>
                          {isMargenGoaMod && !customMargenGoa && (
                            <span className="ml-1 text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded shadow">
                              MOD
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">
                          T60: {formatNum(t60ConIva, 3)} €
                        </span>
                      </div>
                    </td>

                    {/* 3. GOA Premium (GOA + 0.04€) */}
                    <td
                      onClick={() => {
                        if (!isFormulaMode) return;
                        setActiveModalCell({
                          cellKey: premiumKey,
                          cellTitle: `${st.name} — GOA Premium (€)`,
                          defaultValue: defaultPremium,
                          currentFormula: customPremium?.rawFormula,
                          columnLabel: `GOA Premium (€) - ${st.name}`,
                          onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('goaPremium', f, st.name),
                        });
                      }}
                      className={`py-3 px-4 font-mono font-bold text-sm transition-all ${
                        isFormulaMode ? 'cursor-pointer hover:bg-amber-500/20 hover:ring-1 hover:ring-amber-400/50' : ''
                      } ${isPremiumMod ? 'bg-amber-400/20 text-amber-200 font-black' : 'bg-amber-500/5 text-amber-300'}`}
                      title={
                        isFormulaMode
                          ? customPremium
                            ? `Fórmula: ${customPremium.rawFormula}`
                            : 'Haz clic para formular esta celda'
                          : customPremium
                          ? `Fórmula: ${customPremium.rawFormula}`
                          : 'GOA + 0.04€'
                      }
                    >
                      <div className="flex items-center space-x-1.5">
                        {customPremium && (
                          <span className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm">
                            fx
                          </span>
                        )}
                        <span>{formatNum(premiumPrice, 3)} €</span>
                        {isPremiumMod && !customPremium && (
                          <span className="ml-1.5 text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded shadow">
                            MOD
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Gasolina 95 (€/L) */}
                    <td
                      onClick={() => {
                        if (!isFormulaMode || !hasGasolina) return;
                        setActiveModalCell({
                          cellKey: gasKey,
                          cellTitle: `${st.name} — Gasolina 95 (€/L)`,
                          defaultValue: parseNum(item.gasolina),
                          currentFormula: customGas?.rawFormula,
                          columnLabel: `Gasolina 95 (€/L) - ${st.name}`,
                          onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('gasolina', f, st.name),
                        });
                      }}
                      className={`py-3 px-4 transition-all ${
                        isFormulaMode && hasGasolina ? 'cursor-pointer hover:bg-amber-500/10' : ''
                      } ${isGasMod ? 'bg-amber-400/20' : ''}`}
                      title={
                        isFormulaMode
                          ? customGas
                            ? `Fórmula: ${customGas.rawFormula}`
                            : 'Haz clic para formular esta celda'
                          : customGas
                          ? `Fórmula: ${customGas.rawFormula}`
                          : 'Precio Poste Gasolina 95'
                      }
                    >
                      {hasGasolina ? (
                        <div className="relative inline-flex items-center">
                          {isFormulaMode ? (
                            <div
                              className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all text-center flex items-center justify-between ${
                                customGas
                                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                                  : 'bg-slate-950 border border-slate-700 text-slate-200'
                              }`}
                            >
                              {customGas && (
                                <span className="mr-1 text-[9px] font-black bg-slate-950 text-amber-400 px-1 rounded">
                                  fx
                                </span>
                              )}
                              <span className="flex-1 text-right">{gasDisplay}</span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={gasDisplay}
                              onChange={(e) => handlePosteChange(st.name, 'gasolina', e.target.value)}
                              className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                                customGas
                                  ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                                  : isGasMod
                                  ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30'
                                  : 'bg-slate-950 border border-slate-700 text-slate-200 focus:border-amber-400'
                              }`}
                            />
                          )}
                          {customGas && !isFormulaMode && (
                            <span className="ml-1.5 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                              fx
                            </span>
                          )}
                          {isGasMod && !customGas && (
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
                    <td
                      onClick={() => {
                        if (!isFormulaMode || !hasGasolina) return;
                        setActiveModalCell({
                          cellKey: margenGasolinaKey,
                          cellTitle: `${st.name} — Margen Gasolina (€)`,
                          defaultValue: typeof autoMargenGas === 'number' ? autoMargenGas : 0,
                          currentFormula: customMargenGas?.rawFormula,
                          columnLabel: `Margen Gasolina (€) - ${st.name}`,
                          onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('margenGasolina', f, st.name),
                        });
                      }}
                      className={`py-3 px-4 transition-all ${
                        isFormulaMode && hasGasolina ? 'cursor-pointer hover:bg-amber-500/10' : ''
                      } ${isGainMod ? 'bg-amber-400/20' : ''}`}
                      title={
                        isFormulaMode
                          ? customMargenGas
                            ? `Fórmula: ${customMargenGas.rawFormula}`
                            : 'Haz clic para formular esta celda'
                          : customMargenGas
                          ? `Fórmula: ${customMargenGas.rawFormula}`
                          : 'Margen Gasolina'
                      }
                    >
                      {hasGasolina ? (
                        <div className="relative inline-flex items-center">
                          {isFormulaMode ? (
                            <div
                              className={`w-24 rounded-lg px-2 py-1 text-xs font-mono font-bold transition-all text-center flex items-center justify-between ${
                                customMargenGas
                                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                                  : 'bg-slate-950 border border-emerald-500/40 text-emerald-400'
                              }`}
                            >
                              {customMargenGas && (
                                <span className="mr-1 text-[9px] font-black bg-slate-950 text-amber-400 px-1 rounded">
                                  fx
                                </span>
                              )}
                              <span className="flex-1 text-right">{displayMargenGas}</span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={displayMargenGas}
                              onChange={(e) => handlePosteChange(st.name, 'gasolinaGain', e.target.value)}
                              className={`w-24 rounded-lg px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                                customMargenGas
                                  ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                                  : isGainMod
                                  ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                                  : parseNum(displayMargenGas) >= 0
                                  ? 'bg-slate-950 border border-emerald-500/40 text-emerald-400 focus:border-emerald-400'
                                  : 'bg-slate-950 border border-rose-500/40 text-rose-400 focus:border-rose-400'
                              }`}
                            />
                          )}
                          {customMargenGas && !isFormulaMode && (
                            <span className="ml-1 text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded shadow">
                              fx
                            </span>
                          )}
                          {isGainMod && !customMargenGas && (
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
      {(() => {
        const isHvoGenBaseMod = modifiedKeys.has('hvo_gen_base');
        const isHvoGenAddMod = modifiedKeys.has('hvo_gen_add');
        const isHvoGenTotalMod = isHvoGenBaseMod || isHvoGenAddMod || modifiedKeys.has('hvo_gen_sin_iva');
        const isHvoAlfaMod = modifiedKeys.has('hvo_alfajarin') || isHvoGenBaseMod || isHvoGenAddMod;
        const isHvoValAddMod = modifiedKeys.has('hvo_valdemoro_add');
        const isValdemoroGoaMod = modifiedKeys.has('poste_VALDEMORO_goa') || modifiedKeys.has('poste_ES VALDEMORO_goa');
        const isHvoValTotalMod = isHvoValAddMod || isValdemoroGoaMod;

        return (
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
              
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full">
                  Amarillo = Dato Modificado Hoy
                </span>
                <button
                  onClick={downloadHvoReportPng}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                  title="Descargar imagen PNG de HVO Alfajarín y Valdemoro con precios Sin IVA y Con IVA"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Descargar PNG Reporte HVO (Alfajarín y Valdemoro)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* HVO General */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">HVO Poste General</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">100% Bio</span>
                </div>

                <div className="space-y-2">
                  <div
                    onClick={() => {
                      if (!isFormulaMode) return;
                      setActiveModalCell({
                        cellKey: 'POSTE_HVO_GENERAL_BASE',
                        cellTitle: 'HVO General — Precio Compra Base Sin IVA (€)',
                        defaultValue: parseNum(hvoGeneralBase),
                        currentFormula: resolvedPostesFormulas['POSTE_HVO_GENERAL_BASE']?.rawFormula,
                        columnLabel: 'HVO General Base Sin IVA',
                      });
                    }}
                    className={`transition-all rounded-xl p-1 ${
                      isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/40' : ''
                    }`}
                    title={isFormulaMode ? 'Haz clic para formular Precio Compra Base HVO' : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <label className="text-[11px] text-slate-400 block font-medium">Precio Compra Base Sin IVA (€):</label>
                        {isHvoGenBaseMod && !resolvedPostesFormulas['POSTE_HVO_GENERAL_BASE'] && (
                          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            HOY
                          </span>
                        )}
                      </div>
                      {resolvedPostesFormulas['POSTE_HVO_GENERAL_BASE'] && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalCell({
                              cellKey: 'POSTE_HVO_GENERAL_BASE',
                              cellTitle: 'HVO General — Precio Compra Base Sin IVA (€)',
                              defaultValue: parseNum(hvoGeneralBase),
                              currentFormula: resolvedPostesFormulas['POSTE_HVO_GENERAL_BASE']?.rawFormula,
                              columnLabel: 'HVO General Base Sin IVA',
                            });
                          }}
                          className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm cursor-pointer"
                          title={`Fórmula: ${resolvedPostesFormulas['POSTE_HVO_GENERAL_BASE'].rawFormula}`}
                        >
                          fx
                        </span>
                      )}
                    </div>
                    {isFormulaMode ? (
                      <div className={`w-full rounded-xl px-3 py-1.5 font-mono font-bold text-xs flex items-center justify-between ${
                        resolvedPostesFormulas['POSTE_HVO_GENERAL_BASE']
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-900 border border-slate-700 text-white'
                      }`}>
                        <span>{formatNum(hvoGenBaseVal, 3)}</span>
                        <span className="text-[10px] text-amber-500 font-sans">Formular</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={resolvedPostesFormulas['POSTE_HVO_GENERAL_BASE'] ? formatNum(hvoGenBaseVal, 3) : hvoGeneralBase}
                        onChange={(e) => {
                          const val = e.target.value.replace('.', ',');
                          setHvoGeneralBase(val);
                          const updatedMods = new Set(modifiedKeys).add('hvo_gen_base').add('hvo_gen_sin_iva').add('hvo_gen_con_iva');
                          setModifiedKeys(updatedMods);
                          setIsSaved(false);
                          persistPostesData(postes, val, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods);
                        }}
                        className={`w-full rounded-xl px-3 py-1.5 font-mono font-bold text-xs focus:outline-none transition-all ${
                          resolvedPostesFormulas['POSTE_HVO_GENERAL_BASE']
                            ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                            : isHvoGenBaseMod
                            ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                            : 'bg-slate-900 border border-slate-700 text-white focus:border-amber-400'
                        }`}
                      />
                    )}
                  </div>

                  <div
                    onClick={() => {
                      if (!isFormulaMode) return;
                      setActiveModalCell({
                        cellKey: 'POSTE_HVO_GENERAL_ADD',
                        cellTitle: 'HVO General — Monto a Sumar (€)',
                        defaultValue: parseNum(hvoGeneralAddition),
                        currentFormula: resolvedPostesFormulas['POSTE_HVO_GENERAL_ADD']?.rawFormula,
                        columnLabel: 'HVO General Monto a Sumar',
                      });
                    }}
                    className={`transition-all rounded-xl p-1 ${
                      isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/40' : ''
                    }`}
                    title={isFormulaMode ? 'Haz clic para formular Monto a Sumar HVO' : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <label className="text-[11px] text-amber-300 block font-medium">Monto a Sumar al HVO General (€):</label>
                        {isHvoGenAddMod && !resolvedPostesFormulas['POSTE_HVO_GENERAL_ADD'] && (
                          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            HOY
                          </span>
                        )}
                      </div>
                      {resolvedPostesFormulas['POSTE_HVO_GENERAL_ADD'] && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalCell({
                              cellKey: 'POSTE_HVO_GENERAL_ADD',
                              cellTitle: 'HVO General — Monto a Sumar (€)',
                              defaultValue: parseNum(hvoGeneralAddition),
                              currentFormula: resolvedPostesFormulas['POSTE_HVO_GENERAL_ADD']?.rawFormula,
                              columnLabel: 'HVO General Monto a Sumar',
                            });
                          }}
                          className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm cursor-pointer"
                          title={`Fórmula: ${resolvedPostesFormulas['POSTE_HVO_GENERAL_ADD'].rawFormula}`}
                        >
                          fx
                        </span>
                      )}
                    </div>
                    {isFormulaMode ? (
                      <div className={`w-full rounded-xl px-3 py-1.5 font-mono font-bold text-xs flex items-center justify-between ${
                        resolvedPostesFormulas['POSTE_HVO_GENERAL_ADD']
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-900 border border-amber-500/40 text-amber-300'
                      }`}>
                        <span>{formatNum(hvoGenAddVal, 3)}</span>
                        <span className="text-[10px] text-amber-500 font-sans">Formular</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={resolvedPostesFormulas['POSTE_HVO_GENERAL_ADD'] ? formatNum(hvoGenAddVal, 3) : hvoGeneralAddition}
                        onChange={(e) => {
                          const val = e.target.value.replace('.', ',');
                          setHvoGeneralAddition(val);
                          const updatedMods = new Set(modifiedKeys).add('hvo_gen_add').add('hvo_gen_sin_iva').add('hvo_gen_con_iva');
                          setModifiedKeys(updatedMods);
                          setIsSaved(false);
                          persistPostesData(postes, hvoGeneralBase, val, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods);
                        }}
                        className={`w-full rounded-xl px-3 py-1.5 font-mono font-bold text-xs focus:outline-none transition-all ${
                          resolvedPostesFormulas['POSTE_HVO_GENERAL_ADD']
                            ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                            : isHvoGenAddMod
                            ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                            : 'bg-slate-900 border border-amber-500/40 text-amber-300 focus:border-amber-400'
                        }`}
                      />
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1 font-mono text-xs">
                  <div
                    onClick={() => {
                      if (!isFormulaMode) return;
                      setActiveModalCell({
                        cellKey: 'POSTE_HVO_GENERAL_SIN_IVA',
                        cellTitle: 'HVO General — Precio Final Sin IVA (€/L)',
                        defaultValue: computedHvoGeneralSinIva,
                        currentFormula: resolvedPostesFormulas['POSTE_HVO_GENERAL_SIN_IVA']?.rawFormula,
                        columnLabel: 'HVO General Final Sin IVA',
                      });
                    }}
                    className={`flex justify-between items-center py-1 px-1.5 rounded-lg transition-all ${
                      isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                    } ${isHvoGenTotalMod ? 'bg-amber-400/10' : ''}`}
                  >
                    <span className="text-slate-400 flex items-center space-x-1">
                      {resolvedPostesFormulas['POSTE_HVO_GENERAL_SIN_IVA'] && (
                        <span className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm mr-1">fx</span>
                      )}
                      <span>Precio Final Sin IVA:</span>
                    </span>
                    <span className={`font-bold ${resolvedPostesFormulas['POSTE_HVO_GENERAL_SIN_IVA'] || isHvoGenTotalMod ? 'text-amber-300 font-black' : 'text-white'}`}>
                      {formatNum(computedHvoGeneralSinIva, 3)} €/L
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      if (!isFormulaMode) return;
                      setActiveModalCell({
                        cellKey: 'POSTE_HVO_GENERAL_CON_IVA',
                        cellTitle: 'HVO General — Precio Con IVA (21%) (€/L)',
                        defaultValue: computedHvoGeneralConIva,
                        currentFormula: resolvedPostesFormulas['POSTE_HVO_GENERAL_CON_IVA']?.rawFormula,
                        columnLabel: 'HVO General Con IVA (21%)',
                      });
                    }}
                    className={`flex justify-between items-center py-1 px-1.5 rounded-lg transition-all ${
                      isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                    } ${isHvoGenTotalMod ? 'bg-amber-400/10' : ''}`}
                  >
                    <span className="text-slate-400 flex items-center space-x-1">
                      {resolvedPostesFormulas['POSTE_HVO_GENERAL_CON_IVA'] && (
                        <span className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm mr-1">fx</span>
                      )}
                      <span>Precio Con IVA (21%):</span>
                    </span>
                    <span className={`font-bold ${resolvedPostesFormulas['POSTE_HVO_GENERAL_CON_IVA'] || isHvoGenTotalMod ? 'text-amber-300 font-black' : 'text-emerald-400'}`}>
                      {formatNum(computedHvoGeneralConIva, 3)} €/L
                    </span>
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
                  <div
                    onClick={() => {
                      if (!isFormulaMode) return;
                      setActiveModalCell({
                        cellKey: 'POSTE_HVO_ALFAJARIN_SIN_IVA',
                        cellTitle: 'HVO Alfajarín — Precio Sin IVA (€/L)',
                        defaultValue: parseNum(hvoAlfajarinSinIva),
                        currentFormula: resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA']?.rawFormula,
                        columnLabel: 'HVO Alfajarín Sin IVA',
                      });
                    }}
                    className={`transition-all rounded-xl p-1 ${
                      isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/40' : ''
                    }`}
                    title={isFormulaMode ? 'Haz clic para formular Precio Sin IVA HVO Alfajarín' : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <label className="text-[11px] text-slate-400 block font-medium">Precio Sin IVA (€/L):</label>
                        {isHvoAlfaMod && !resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA'] && (
                          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            HOY
                          </span>
                        )}
                      </div>
                      {resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA'] && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalCell({
                              cellKey: 'POSTE_HVO_ALFAJARIN_SIN_IVA',
                              cellTitle: 'HVO Alfajarín — Precio Sin IVA (€/L)',
                              defaultValue: parseNum(hvoAlfajarinSinIva),
                              currentFormula: resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA']?.rawFormula,
                              columnLabel: 'HVO Alfajarín Sin IVA',
                            });
                          }}
                          className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm cursor-pointer"
                          title={`Fórmula: ${resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA'].rawFormula}`}
                        >
                          fx
                        </span>
                      )}
                    </div>
                    {isFormulaMode ? (
                      <div className={`w-full rounded-xl px-3 py-1.5 font-mono font-bold text-xs flex items-center justify-between ${
                        resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA']
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-900 border border-slate-700 text-white'
                      }`}>
                        <span>{formatNum(computedHvoAlfajarinSinIva, 3)}</span>
                        <span className="text-[10px] text-amber-500 font-sans">Formular</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA'] ? formatNum(computedHvoAlfajarinSinIva, 3) : hvoAlfajarinSinIva}
                        onChange={(e) => {
                          const val = e.target.value.replace('.', ',');
                          setHvoAlfajarinSinIva(val);
                          const updatedMods = new Set(modifiedKeys).add('hvo_alfajarin').add('hvo_alfajarin_con_iva');
                          setModifiedKeys(updatedMods);
                          setIsSaved(false);
                          persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, val, hvoValdemoroAddition, updatedMods);
                        }}
                        className={`w-full rounded-xl px-3 py-1.5 font-mono font-bold text-xs focus:outline-none transition-all ${
                          resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA']
                            ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                            : isHvoAlfaMod
                            ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                            : 'bg-slate-900 border border-slate-700 text-white focus:border-amber-400'
                        }`}
                      />
                    )}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-800/80 space-y-1 font-mono text-xs">
                  <div
                    onClick={() => {
                      if (!isFormulaMode) return;
                      setActiveModalCell({
                        cellKey: 'POSTE_HVO_ALFAJARIN_SIN_IVA',
                        cellTitle: 'HVO Alfajarín — Precio Final Sin IVA (€/L)',
                        defaultValue: computedHvoAlfajarinSinIva,
                        currentFormula: resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA']?.rawFormula,
                        columnLabel: 'HVO Alfajarín Final Sin IVA',
                      });
                    }}
                    className={`flex justify-between items-center py-1 px-1.5 rounded-lg transition-all ${
                      isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                    } ${isHvoAlfaMod ? 'bg-amber-400/10' : ''}`}
                  >
                    <span className="text-slate-400 flex items-center space-x-1">
                      {resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA'] && (
                        <span className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm mr-1">fx</span>
                      )}
                      <span>Precio Final Sin IVA:</span>
                    </span>
                    <span className={`font-bold ${resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_SIN_IVA'] || isHvoAlfaMod ? 'text-amber-300 font-black' : 'text-white'}`}>
                      {formatNum(computedHvoAlfajarinSinIva, 3)} €/L
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      if (!isFormulaMode) return;
                      setActiveModalCell({
                        cellKey: 'POSTE_HVO_ALFAJARIN_CON_IVA',
                        cellTitle: 'HVO Alfajarín — Precio Con IVA (21%) (€/L)',
                        defaultValue: computedHvoAlfajarinConIva,
                        currentFormula: resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_CON_IVA']?.rawFormula,
                        columnLabel: 'HVO Alfajarín Con IVA (21%)',
                      });
                    }}
                    className={`flex justify-between items-center py-1 px-1.5 rounded-lg transition-all ${
                      isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                    } ${isHvoAlfaMod ? 'bg-amber-400/10' : ''}`}
                  >
                    <span className="text-slate-400 flex items-center space-x-1">
                      {resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_CON_IVA'] && (
                        <span className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm mr-1">fx</span>
                      )}
                      <span>Precio Con IVA (21%):</span>
                    </span>
                    <span className={`font-bold ${resolvedPostesFormulas['POSTE_HVO_ALFAJARIN_CON_IVA'] || isHvoAlfaMod ? 'text-amber-300 font-black' : 'text-emerald-400'}`}>
                      {formatNum(computedHvoAlfajarinConIva, 3)} €/L
                    </span>
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
                  <div className="flex justify-between text-xs font-mono items-center">
                    <span className="text-slate-400">GOA Poste Valdemoro:</span>
                    <div className="flex items-center space-x-1">
                      <span className={`font-bold ${isValdemoroGoaMod ? 'text-amber-300 font-black' : 'text-amber-300'}`}>{formatNum(goaValdemoroPrice, 3)} €/L</span>
                      {isValdemoroGoaMod && (
                        <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded shadow">
                          MOD
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      if (!isFormulaMode) return;
                      setActiveModalCell({
                        cellKey: 'POSTE_HVO_VALDEMORO_ADD',
                        cellTitle: 'HVO Valdemoro — Monto a Sumar al GOA Valdemoro (€)',
                        defaultValue: parseNum(hvoValdemoroAddition),
                        currentFormula: resolvedPostesFormulas['POSTE_HVO_VALDEMORO_ADD']?.rawFormula,
                        columnLabel: 'HVO Valdemoro Monto a Sumar',
                      });
                    }}
                    className={`transition-all rounded-xl p-1 ${
                      isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/40' : ''
                    }`}
                    title={isFormulaMode ? 'Haz clic para formular Monto a Sumar Valdemoro' : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <label className="text-[11px] text-emerald-300 block font-medium">Monto a Sumar al GOA Valdemoro (€):</label>
                        {isHvoValAddMod && !resolvedPostesFormulas['POSTE_HVO_VALDEMORO_ADD'] && (
                          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            HOY
                          </span>
                        )}
                      </div>
                      {resolvedPostesFormulas['POSTE_HVO_VALDEMORO_ADD'] && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalCell({
                              cellKey: 'POSTE_HVO_VALDEMORO_ADD',
                              cellTitle: 'HVO Valdemoro — Monto a Sumar al GOA Valdemoro (€)',
                              defaultValue: parseNum(hvoValdemoroAddition),
                              currentFormula: resolvedPostesFormulas['POSTE_HVO_VALDEMORO_ADD']?.rawFormula,
                              columnLabel: 'HVO Valdemoro Monto a Sumar',
                            });
                          }}
                          className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm cursor-pointer"
                          title={`Fórmula: ${resolvedPostesFormulas['POSTE_HVO_VALDEMORO_ADD'].rawFormula}`}
                        >
                          fx
                        </span>
                      )}
                    </div>
                    {isFormulaMode ? (
                      <div className={`w-full rounded-xl px-3 py-1.5 font-mono font-bold text-xs flex items-center justify-between ${
                        resolvedPostesFormulas['POSTE_HVO_VALDEMORO_ADD']
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-900 border border-emerald-500/40 text-emerald-300'
                      }`}>
                        <span>{formatNum(hvoValAddVal, 3)}</span>
                        <span className="text-[10px] text-amber-500 font-sans">Formular</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={resolvedPostesFormulas['POSTE_HVO_VALDEMORO_ADD'] ? formatNum(hvoValAddVal, 3) : hvoValdemoroAddition}
                        onChange={(e) => {
                          const val = e.target.value.replace('.', ',');
                          setHvoValdemoroAddition(val);
                          const updatedMods = new Set(modifiedKeys).add('hvo_valdemoro_add').add('hvo_valdemoro_con_iva');
                          setModifiedKeys(updatedMods);
                          setIsSaved(false);
                          persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, val, updatedMods);
                        }}
                        className={`w-full rounded-xl px-3 py-1.5 font-mono font-bold text-xs focus:outline-none transition-all ${
                          resolvedPostesFormulas['POSTE_HVO_VALDEMORO_ADD']
                            ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                            : isHvoValAddMod
                            ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                            : 'bg-slate-900 border border-emerald-500/40 text-emerald-300 focus:border-emerald-400'
                        }`}
                      />
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1 font-mono text-xs">
                  <div
                    onClick={() => {
                      if (!isFormulaMode) return;
                      setActiveModalCell({
                        cellKey: 'POSTE_HVO_VALDEMORO_SIN_IVA',
                        cellTitle: 'HVO Valdemoro — Precio Final Sin IVA (€/L)',
                        defaultValue: computedHvoValdemoroSinIva,
                        currentFormula: resolvedPostesFormulas['POSTE_HVO_VALDEMORO_SIN_IVA']?.rawFormula,
                        columnLabel: 'HVO Valdemoro Final Sin IVA',
                      });
                    }}
                    className={`flex justify-between items-center py-1 px-1.5 rounded-lg transition-all ${
                      isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                    } ${isHvoValTotalMod ? 'bg-amber-400/10' : ''}`}
                  >
                    <span className="text-slate-400 flex items-center space-x-1">
                      {resolvedPostesFormulas['POSTE_HVO_VALDEMORO_SIN_IVA'] && (
                        <span className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm mr-1">fx</span>
                      )}
                      <span>Precio Final Sin IVA:</span>
                    </span>
                    <span className={`font-bold ${resolvedPostesFormulas['POSTE_HVO_VALDEMORO_SIN_IVA'] || isHvoValTotalMod ? 'text-amber-300 font-black' : 'text-white'}`}>
                      {formatNum(computedHvoValdemoroSinIva, 3)} €/L
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      if (!isFormulaMode) return;
                      setActiveModalCell({
                        cellKey: 'POSTE_HVO_VALDEMORO_CON_IVA',
                        cellTitle: 'HVO Valdemoro — Precio Con IVA (21%) (€/L)',
                        defaultValue: computedHvoValdemoroConIva,
                        currentFormula: resolvedPostesFormulas['POSTE_HVO_VALDEMORO_CON_IVA']?.rawFormula,
                        columnLabel: 'HVO Valdemoro Con IVA (21%)',
                      });
                    }}
                    className={`flex justify-between items-center py-1 px-1.5 rounded-lg transition-all ${
                      isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                    } ${isHvoValTotalMod ? 'bg-amber-400/10' : ''}`}
                  >
                    <span className="text-slate-400 flex items-center space-x-1">
                      {resolvedPostesFormulas['POSTE_HVO_VALDEMORO_CON_IVA'] && (
                        <span className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm mr-1">fx</span>
                      )}
                      <span>Precio Con IVA (21%):</span>
                    </span>
                    <span className={`font-bold ${resolvedPostesFormulas['POSTE_HVO_VALDEMORO_CON_IVA'] || isHvoValTotalMod ? 'text-amber-300 font-black' : 'text-emerald-400'}`}>
                      {formatNum(computedHvoValdemoroConIva, 3)} €/L
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
            <span className="text-xs text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full">
              Amarillo = Dato Modificado Hoy
            </span>

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
                const customCompra = resolvedPostesFormulas[`POSTE_GASB_${stName}_COMPRA`];
                const customTransfer = resolvedPostesFormulas[`POSTE_GASB_${stName}_TRANSFER`];
                const customTransCon = resolvedPostesFormulas[`POSTE_GASB_${stName}_TRANSFER_CON_IVA`];
                const customPoste = resolvedPostesFormulas[`POSTE_GASB_${stName}_POSTE`];

                const compraNum = customCompra ? customCompra.evaluatedValue : parseNum(item.compra);
                const isMod = modifiedKeys.has(`gasb_${stName}`) || modifiedKeys.has(`gasb_compra_${stName}`);

                // Fórmulas oficiales Gasóleo B:
                // 1. Transfrired = Compra Sin IVA + 0.017
                const autoTransferNum = Number((compraNum + 0.017).toFixed(3));
                const isTransferMod = modifiedKeys.has(`gasb_transfer_${stName}`) || isMod;
                const transferNum = customTransfer ? customTransfer.evaluatedValue : (isTransferMod && item.transfer ? parseNum(item.transfer) : autoTransferNum);
                const transferDisplay = customTransfer ? formatNum(customTransfer.evaluatedValue, 3) : (isTransferMod && item.transfer ? item.transfer : formatNum(autoTransferNum, 3));

                // 2. Transfrired Con IVA = Transfrired * 1.21
                const transfriredConIva = customTransCon ? customTransCon.evaluatedValue : Number((transferNum * 1.21).toFixed(3));

                // 3. Precio Poste Gasóleo B = (Compra Sin IVA + 0.035) * 1.21
                const autoPosteNum = Number(((compraNum + 0.035) * 1.21).toFixed(3));
                const isPosteMod = modifiedKeys.has(`gasb_poste_${stName}`) || isMod;
                const posteNum = customPoste ? customPoste.evaluatedValue : (isPosteMod && item.poste ? parseNum(item.poste) : autoPosteNum);
                const posteDisplay = customPoste ? formatNum(customPoste.evaluatedValue, 3) : (isPosteMod && item.poste ? item.poste : formatNum(autoPosteNum, 3));

                return (
                  <tr key={stName} className="hover:bg-slate-800/40 transition-colors">
                    {/* 1. Estación */}
                    <td className="py-3 px-4 font-bold text-white">{stName}</td>
                    
                    {/* 2. Precio Compra Sin IVA */}
                    <td
                      onClick={() => {
                        if (!isFormulaMode) return;
                        setActiveModalCell({
                          cellKey: `POSTE_GASB_${stName}_COMPRA`,
                          cellTitle: `${stName} — GOB Compra Sin IVA (€)`,
                          defaultValue: compraNum,
                          currentFormula: customCompra?.rawFormula,
                          columnLabel: `Gasóleo B Compra Sin IVA (€) - ${stName}`,
                          onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('gasbCompra', f, stName),
                        });
                      }}
                      className={`py-3 px-4 transition-all ${
                        isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10' : ''
                      } ${isMod ? 'bg-amber-400/20' : ''}`}
                    >
                      <div className="relative inline-flex items-center">
                        {isFormulaMode ? (
                          <div
                            className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all text-center flex items-center justify-between ${
                              customCompra
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                                : 'bg-slate-950 border border-slate-700 text-slate-200'
                            }`}
                          >
                            {customCompra && (
                              <span className="mr-1 text-[9px] font-black bg-slate-950 text-amber-400 px-1 rounded">fx</span>
                            )}
                            <span className="flex-1 text-right">{formatNum(compraNum, 3)}</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={customCompra ? formatNum(compraNum, 3) : item.compra}
                            onChange={(e) => {
                              const val = e.target.value.replace('.', ',');
                              const valNum = parseNum(val);
                              const nextTransfer = modifiedKeys.has(`gasb_transfer_${stName}`)
                                ? item.transfer
                                : formatNum(Number((valNum + 0.017).toFixed(3)), 3);
                              const nextPoste = modifiedKeys.has(`gasb_poste_${stName}`)
                                ? item.poste
                                : formatNum(Number(((valNum + 0.035) * 1.21).toFixed(3)), 3);
                              const updated = {
                                ...gasoleoBRows,
                                [stName]: {
                                  ...gasoleoBRows[stName],
                                  compra: val,
                                  transfer: nextTransfer,
                                  poste: nextPoste,
                                },
                              };
                              setGasoleoBRows(updated);
                              const updatedMods = new Set(modifiedKeys).add(`gasb_${stName}`).add(`gasb_compra_${stName}`);
                              setModifiedKeys(updatedMods);
                              setIsSaved(false);
                              persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, updated);
                            }}
                            className={`w-28 rounded px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                              customCompra
                                ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                                : isMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                                : 'bg-slate-950 border border-slate-700 text-slate-200 focus:border-amber-400'
                            }`}
                          />
                        )}
                        {customCompra && !isFormulaMode && (
                          <span
                            onClick={() => {
                              setActiveModalCell({
                                cellKey: `POSTE_GASB_${stName}_COMPRA`,
                                cellTitle: `${stName} — GOB Compra Sin IVA (€)`,
                                defaultValue: compraNum,
                                currentFormula: customCompra?.rawFormula,
                                columnLabel: `Gasóleo B Compra Sin IVA (€) - ${stName}`,
                                onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('gasbCompra', f, stName),
                              });
                            }}
                            className="ml-1.5 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                            title={`Fórmula: ${customCompra.rawFormula}`}
                          >
                            fx
                          </span>
                        )}
                        {isMod && !customCompra && (
                          <span className="ml-1.5 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            HOY
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Precio Transfrired (Compra Sin IVA + 0.017) */}
                    <td
                      onClick={() => {
                        if (!isFormulaMode) return;
                        setActiveModalCell({
                          cellKey: `POSTE_GASB_${stName}_TRANSFER`,
                          cellTitle: `${stName} — GOB Transfrired (€)`,
                          defaultValue: autoTransferNum,
                          currentFormula: customTransfer?.rawFormula,
                          columnLabel: `Gasóleo B Transfrired (€) - ${stName}`,
                          onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('gasbTransfer', f, stName),
                        });
                      }}
                      className={`py-3 px-4 transition-all ${
                        isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10' : ''
                      } ${isTransferMod ? 'bg-amber-400/20' : ''}`}
                    >
                      <div className="relative inline-flex items-center">
                        {isFormulaMode ? (
                          <div
                            className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all text-center flex items-center justify-between ${
                              customTransfer
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                                : 'bg-slate-950 border border-slate-700 text-blue-300'
                            }`}
                          >
                            {customTransfer && (
                              <span className="mr-1 text-[9px] font-black bg-slate-950 text-amber-400 px-1 rounded">fx</span>
                            )}
                            <span className="flex-1 text-right">{transferDisplay}</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={transferDisplay}
                            onChange={(e) => {
                              const val = e.target.value.replace('.', ',');
                              const updated = {
                                ...gasoleoBRows,
                                [stName]: { ...gasoleoBRows[stName], transfer: val },
                              };
                              setGasoleoBRows(updated);
                              const updatedMods = new Set(modifiedKeys).add(`gasb_transfer_${stName}`);
                              setModifiedKeys(updatedMods);
                              setIsSaved(false);
                              persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, updated);
                            }}
                            className={`w-28 rounded px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                              customTransfer
                                ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                                : isTransferMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                                : 'bg-slate-950 border border-slate-700 text-blue-300 focus:border-blue-400'
                            }`}
                          />
                        )}
                        {customTransfer && !isFormulaMode && (
                          <span
                            onClick={() => {
                              setActiveModalCell({
                                cellKey: `POSTE_GASB_${stName}_TRANSFER`,
                                cellTitle: `${stName} — GOB Transfrired (€)`,
                                defaultValue: autoTransferNum,
                                currentFormula: customTransfer?.rawFormula,
                                columnLabel: `Gasóleo B Transfrired (€) - ${stName}`,
                                onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('gasbTransfer', f, stName),
                              });
                            }}
                            className="ml-1.5 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                            title={`Fórmula: ${customTransfer.rawFormula}`}
                          >
                            fx
                          </span>
                        )}
                        {isTransferMod && !customTransfer && (
                          <span className="ml-1.5 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                            HOY
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Transfrired Con IVA (Transfrired * 1.21) */}
                    <td
                      onClick={() => {
                        if (!isFormulaMode) return;
                        setActiveModalCell({
                          cellKey: `POSTE_GASB_${stName}_TRANSFER_CON_IVA`,
                          cellTitle: `${stName} — GOB Transfrired Con IVA (€)`,
                          defaultValue: Number((transferNum * 1.21).toFixed(3)),
                          currentFormula: customTransCon?.rawFormula,
                          columnLabel: `Gasóleo B Transfrired Con IVA (€) - ${stName}`,
                          onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('gasbTransferConIva', f, stName),
                        });
                      }}
                      className={`py-3 px-4 font-mono font-bold text-sm transition-all ${
                        isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30 rounded-lg' : ''
                      } ${customTransCon || isTransferMod ? 'text-amber-300 font-black bg-amber-400/10' : 'text-emerald-400'}`}
                    >
                      <div className="flex items-center space-x-1.5">
                        {customTransCon && (
                          <span className="text-[9px] font-mono font-black text-slate-950 bg-amber-400 px-1 rounded shadow-sm">fx</span>
                        )}
                        <span>{formatNum(transfriredConIva, 3)} €</span>
                        {isTransferMod && !customTransCon && (
                          <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded shadow">
                            MOD
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. Precio Poste Gasóleo B: (Compra Sin IVA + 0.035) * 1.21 */}
                    <td
                      onClick={() => {
                        if (!isFormulaMode) return;
                        setActiveModalCell({
                          cellKey: `POSTE_GASB_${stName}_POSTE`,
                          cellTitle: `${stName} — GOB Precio Poste (€)`,
                          defaultValue: autoPosteNum,
                          currentFormula: customPoste?.rawFormula,
                          columnLabel: `Gasóleo B Poste (€) - ${stName}`,
                          onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('gasbPoste', f, stName),
                        });
                      }}
                      className={`py-3 px-4 bg-slate-900/50 transition-all ${
                        isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10' : ''
                      } ${isPosteMod ? 'bg-amber-400/20' : ''}`}
                    >
                      <div className="relative inline-flex items-center">
                        {isFormulaMode ? (
                          <div
                            className={`w-28 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all text-center flex items-center justify-between ${
                              customPoste
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                                : 'bg-slate-950 border border-amber-500/40 text-amber-300'
                            }`}
                          >
                            {customPoste && (
                              <span className="mr-1 text-[9px] font-black bg-slate-950 text-amber-400 px-1 rounded">fx</span>
                            )}
                            <span className="flex-1 text-right">{posteDisplay}</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={posteDisplay}
                            onChange={(e) => {
                              const val = e.target.value.replace('.', ',');
                              const updated = {
                                ...gasoleoBRows,
                                [stName]: { ...gasoleoBRows[stName], poste: val },
                              };
                              setGasoleoBRows(updated);
                              const updatedMods = new Set(modifiedKeys).add(`gasb_poste_${stName}`);
                              setModifiedKeys(updatedMods);
                              setIsSaved(false);
                              persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, updated);
                            }}
                            className={`w-28 rounded px-2 py-1 text-xs font-mono font-black transition-all focus:outline-none ${
                              customPoste
                                ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                                : isPosteMod
                                ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                                : 'bg-slate-950 border border-amber-500/40 text-amber-300 focus:border-amber-400'
                            }`}
                          />
                        )}
                        {customPoste && !isFormulaMode && (
                          <span
                            onClick={() => {
                              setActiveModalCell({
                                cellKey: `POSTE_GASB_${stName}_POSTE`,
                                cellTitle: `${stName} — GOB Precio Poste (€)`,
                                defaultValue: autoPosteNum,
                                currentFormula: customPoste?.rawFormula,
                                columnLabel: `Gasóleo B Poste (€) - ${stName}`,
                                onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('gasbPoste', f, stName),
                              });
                            }}
                            className="ml-1.5 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                            title={`Fórmula: ${customPoste.rawFormula}`}
                          >
                            fx
                          </span>
                        )}
                        {isPosteMod && !customPoste && (
                          <span className="ml-1.5 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
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

      {/* 4. Sección AdBlue */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Droplet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AdBlue (10 Estaciones Habilitadas)</h3>
              <p className="text-xs text-slate-400">Precios de adquisición, cálculo con IVA y precios en surtidor/poste</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-amber-400 text-slate-950 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-slate-950"></span>
              Amarillo = Dato Modificado Hoy
            </span>
            <span className="text-xs text-slate-400 font-mono">10 Estaciones Clave</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(adblueRows).map(([stName, data]) => {
            const customCompra = resolvedPostesFormulas[`POSTE_ADBLUE_${stName}_COMPRA`];
            const customConIva = resolvedPostesFormulas[`POSTE_ADBLUE_${stName}_CON_IVA`];
            const customPoste = resolvedPostesFormulas[`POSTE_ADBLUE_${stName}_POSTE`];

            const compraNum = customCompra ? customCompra.evaluatedValue : parseNum(data.compra);
            const conIva = customConIva ? customConIva.evaluatedValue : Number((compraNum * 1.21).toFixed(4));
            const compraDisplay = customCompra ? formatNum(customCompra.evaluatedValue, 3) : data.compra;
            const posteDisplay = customPoste ? formatNum(customPoste.evaluatedValue, 3) : data.poste;
            const isCompraMod = modifiedKeys.has(`adblue_${stName}`) || modifiedKeys.has(`adblue_compra_${stName}`);
            const isPosteMod = modifiedKeys.has(`adblue_poste_${stName}`);

            return (
              <div key={stName} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs truncate">{stName}</span>
                  {(isCompraMod || isPosteMod) && (
                    <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded shadow">
                      HOY
                    </span>
                  )}
                </div>
                
                {/* Compra Sin IVA */}
                <div
                  onClick={() => {
                    if (!isFormulaMode) return;
                    setActiveModalCell({
                      cellKey: `POSTE_ADBLUE_${stName}_COMPRA`,
                      cellTitle: `${stName} — AdBlue Compra Sin IVA (€)`,
                      defaultValue: parseNum(data.compra),
                      currentFormula: customCompra?.rawFormula,
                      columnLabel: 'AdBlue Compra Sin IVA (€)',
                      onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('adblueCompra', f, stName),
                    });
                  }}
                  className={isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 p-1 rounded-lg ring-1 ring-amber-400/30' : ''}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Compra Sin IVA (€):</span>
                      {isCompraMod && !customCompra && (
                        <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded shadow">
                          HOY
                        </span>
                      )}
                    </div>
                    {customCompra && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalCell({
                            cellKey: `POSTE_ADBLUE_${stName}_COMPRA`,
                            cellTitle: `${stName} — AdBlue Compra Sin IVA (€)`,
                            defaultValue: parseNum(data.compra),
                            currentFormula: customCompra?.rawFormula,
                            columnLabel: 'AdBlue Compra Sin IVA (€)',
                            onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('adblueCompra', f, stName),
                          });
                        }}
                        className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                        title={`Fórmula: ${customCompra.rawFormula}`}
                      >
                        fx
                      </span>
                    )}
                  </div>
                  {isFormulaMode ? (
                    <div
                      className={`w-full rounded px-2 py-1 text-xs font-mono font-bold flex items-center justify-between ${
                        customCompra
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                          : 'bg-slate-900 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {customCompra && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 rounded mr-1">fx</span>}
                      <span className="flex-1 text-right">{compraDisplay}</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={compraDisplay}
                      onChange={(e) => {
                        const val = e.target.value.replace('.', ',');
                        const updatedAdblue = {
                          ...adblueRows,
                          [stName]: { ...adblueRows[stName], compra: val },
                        };
                        setAdblueRows(updatedAdblue);
                        const updatedMods = new Set(modifiedKeys).add(`adblue_${stName}`).add(`adblue_compra_${stName}`);
                        setModifiedKeys(updatedMods);
                        setIsSaved(false);
                        persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, gasoleoBRows, updatedAdblue);
                      }}
                      className={`w-full rounded px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                        customCompra
                          ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                          : isCompraMod
                          ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                          : 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-400'
                      }`}
                    />
                  )}
                </div>

                {/* Con IVA 21% */}
                <div
                  onClick={() => {
                    if (!isFormulaMode) return;
                    setActiveModalCell({
                      cellKey: `POSTE_ADBLUE_${stName}_CON_IVA`,
                      cellTitle: `${stName} — AdBlue Con IVA 21% (€)`,
                      defaultValue: Number((parseNum(data.compra) * 1.21).toFixed(4)),
                      currentFormula: customConIva?.rawFormula,
                      columnLabel: 'AdBlue Con IVA (€)',
                      onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('adblueConIva', f, stName),
                    });
                  }}
                  className={`flex justify-between items-center text-[11px] font-mono p-1 rounded-lg transition-all ${
                    isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                  } ${isCompraMod ? 'bg-amber-400/10' : ''}`}
                >
                  <span className="text-slate-400">Con IVA 21%:</span>
                  <div className="flex items-center space-x-1">
                    {customConIva && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalCell({
                            cellKey: `POSTE_ADBLUE_${stName}_CON_IVA`,
                            cellTitle: `${stName} — AdBlue Con IVA 21% (€)`,
                            defaultValue: Number((parseNum(data.compra) * 1.21).toFixed(4)),
                            currentFormula: customConIva?.rawFormula,
                            columnLabel: 'AdBlue Con IVA (€)',
                            onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('adblueConIva', f, stName),
                          });
                        }}
                        className="text-[9px] bg-amber-400 text-slate-950 font-black px-1 rounded shadow cursor-pointer mr-1"
                        title={`Fórmula: ${customConIva.rawFormula}`}
                      >
                        fx
                      </span>
                    )}
                    <span className={customConIva || isCompraMod ? 'text-amber-300 font-black' : 'text-emerald-400 font-bold'}>
                      {formatNum(conIva, 3)} €
                    </span>
                    {isCompraMod && !customConIva && (
                      <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded shadow">
                        MOD
                      </span>
                    )}
                  </div>
                </div>

                {/* Poste / Venta */}
                <div
                  onClick={() => {
                    if (!isFormulaMode) return;
                    setActiveModalCell({
                      cellKey: `POSTE_ADBLUE_${stName}_POSTE`,
                      cellTitle: `${stName} — AdBlue Poste / Venta (€)`,
                      defaultValue: parseNum(data.poste),
                      currentFormula: customPoste?.rawFormula,
                      columnLabel: 'AdBlue Poste / Venta (€)',
                      onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('adbluePoste', f, stName),
                    });
                  }}
                  className={`pt-2 border-t border-slate-800 ${
                    isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 p-1 rounded-lg ring-1 ring-amber-400/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Poste / Venta (€):</span>
                      {isPosteMod && !customPoste && (
                        <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded shadow">
                          HOY
                        </span>
                      )}
                    </div>
                    {customPoste && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalCell({
                            cellKey: `POSTE_ADBLUE_${stName}_POSTE`,
                            cellTitle: `${stName} — AdBlue Poste / Venta (€)`,
                            defaultValue: parseNum(data.poste),
                            currentFormula: customPoste?.rawFormula,
                            columnLabel: 'AdBlue Poste / Venta (€)',
                            onApplyToColumn: (f) => handleApplyFormulaToPostesColumn('adbluePoste', f, stName),
                          });
                        }}
                        className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                        title={`Fórmula: ${customPoste.rawFormula}`}
                      >
                        fx
                      </span>
                    )}
                  </div>
                  {isFormulaMode ? (
                    <div
                      className={`w-full rounded px-2 py-1 text-xs font-mono font-bold flex items-center justify-between ${
                        customPoste
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                          : 'bg-slate-900 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {customPoste && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 rounded mr-1">fx</span>}
                      <span className="flex-1 text-right">{posteDisplay}</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={posteDisplay}
                      onChange={(e) => {
                        const val = e.target.value.replace('.', ',');
                        const updatedAdblue = {
                          ...adblueRows,
                          [stName]: { ...adblueRows[stName], poste: val },
                        };
                        setAdblueRows(updatedAdblue);
                        const updatedMods = new Set(modifiedKeys).add(`adblue_poste_${stName}`);
                        setModifiedKeys(updatedMods);
                        setIsSaved(false);
                        persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, gasoleoBRows, updatedAdblue);
                      }}
                      className={`w-full rounded px-2 py-1 text-xs font-mono font-bold transition-all focus:outline-none ${
                        customPoste
                          ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                          : isPosteMod
                          ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                          : 'bg-slate-900 border border-slate-700 text-cyan-300 focus:border-amber-400'
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Sección Gases */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Fuel className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Gases y Energías Alternativas (GLP, GNC, GNL)</h3>
              <p className="text-xs text-slate-400">Precios sin IVA y cálculo con IVA para combustibles a gas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-amber-400 text-slate-950 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-slate-950"></span>
              Amarillo = Dato Modificado Hoy
            </span>
            <span className="text-xs text-teal-400 font-mono font-bold bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
              Módulo Gases
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.entries(gasesRows).map(([gasName, data]) => {
            let shortName = 'GLP';
            if (gasName.includes('GNC')) shortName = 'GNC';
            else if (gasName.includes('GNL')) shortName = 'GNL';

            const customSinIva = resolvedPostesFormulas[`POSTE_GASES_${shortName}_SIN_IVA`];
            const customConIva = resolvedPostesFormulas[`POSTE_GASES_${shortName}_CON_IVA`];
            const customPoste = resolvedPostesFormulas[`POSTE_GASES_${shortName}_POSTE`];

            const sinIvaNum = customSinIva ? customSinIva.evaluatedValue : parseNum(data.sinIva);
            const conIva = customConIva ? customConIva.evaluatedValue : Number((sinIvaNum * 1.21).toFixed(4));
            const sinIvaDisplay = customSinIva ? formatNum(customSinIva.evaluatedValue, 3) : data.sinIva;
            const posteDisplay = customPoste ? formatNum(customPoste.evaluatedValue, 3) : data.poste;
            const isSinIvaMod = modifiedKeys.has(`gas_${gasName}`) || modifiedKeys.has(`gas_sinIva_${gasName}`) || modifiedKeys.has(`gas_${shortName}`);
            const isPosteMod = modifiedKeys.has(`gas_poste_${gasName}`) || modifiedKeys.has(`gas_poste_${shortName}`);

            return (
              <div key={gasName} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{gasName}</span>
                  {(isSinIvaMod || isPosteMod) && (
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded shadow">
                      HOY
                    </span>
                  )}
                </div>

                {/* Precio Adquisición Sin IVA */}
                <div
                  onClick={() => {
                    if (!isFormulaMode) return;
                    setActiveModalCell({
                      cellKey: `POSTE_GASES_${shortName}_SIN_IVA`,
                      cellTitle: `${gasName} — Sin IVA (€)`,
                      defaultValue: parseNum(data.sinIva),
                      currentFormula: customSinIva?.rawFormula,
                      columnLabel: `${gasName} Sin IVA (€)`,
                    });
                  }}
                  className={`space-y-1 ${isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 p-1.5 rounded-xl ring-1 ring-amber-400/30' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-400 block">Precio Adquisición Sin IVA (€):</label>
                      {isSinIvaMod && !customSinIva && (
                        <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded shadow">
                          HOY
                        </span>
                      )}
                    </div>
                    {customSinIva && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalCell({
                            cellKey: `POSTE_GASES_${shortName}_SIN_IVA`,
                            cellTitle: `${gasName} — Sin IVA (€)`,
                            defaultValue: parseNum(data.sinIva),
                            currentFormula: customSinIva?.rawFormula,
                            columnLabel: `${gasName} Sin IVA (€)`,
                          });
                        }}
                        className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                        title={`Fórmula: ${customSinIva.rawFormula}`}
                      >
                        fx
                      </span>
                    )}
                  </div>
                  {isFormulaMode ? (
                    <div
                      className={`w-full rounded-xl px-3 py-2 font-mono font-bold text-sm flex items-center justify-between ${
                        customSinIva
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                          : 'bg-slate-900 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {customSinIva && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 rounded mr-1">fx</span>}
                      <span className="flex-1 text-right">{sinIvaDisplay}</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={sinIvaDisplay}
                      onChange={(e) => {
                        const val = e.target.value.replace('.', ',');
                        const updatedGases = {
                          ...gasesRows,
                          [gasName]: { ...gasesRows[gasName], sinIva: val },
                        };
                        setGasesRows(updatedGases);
                        const updatedMods = new Set(modifiedKeys).add(`gas_${gasName}`).add(`gas_sinIva_${gasName}`);
                        setModifiedKeys(updatedMods);
                        setIsSaved(false);
                        persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, gasoleoBRows, adblueRows, updatedGases);
                      }}
                      className={`w-full rounded-xl px-3 py-2 font-mono font-bold text-sm focus:outline-none transition-all ${
                        customSinIva
                          ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                          : isSinIvaMod
                          ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                          : 'bg-slate-900 border border-slate-700 text-white focus:border-amber-400'
                      }`}
                    />
                  )}
                </div>

                {/* Precio Con IVA */}
                <div
                  onClick={() => {
                    if (!isFormulaMode) return;
                    setActiveModalCell({
                      cellKey: `POSTE_GASES_${shortName}_CON_IVA`,
                      cellTitle: `${gasName} — Con IVA 21% (€)`,
                      defaultValue: Number((parseNum(data.sinIva) * 1.21).toFixed(4)),
                      currentFormula: customConIva?.rawFormula,
                      columnLabel: `${gasName} Con IVA (€)`,
                    });
                  }}
                  className={`pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono p-1 rounded-xl transition-all ${
                    isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                  } ${isSinIvaMod ? 'bg-amber-400/10' : ''}`}
                >
                  <span className="text-slate-400">Precio Con IVA (21%):</span>
                  <div className="flex items-center space-x-1.5">
                    {customConIva && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalCell({
                            cellKey: `POSTE_GASES_${shortName}_CON_IVA`,
                            cellTitle: `${gasName} — Con IVA 21% (€)`,
                            defaultValue: Number((parseNum(data.sinIva) * 1.21).toFixed(4)),
                            currentFormula: customConIva?.rawFormula,
                            columnLabel: `${gasName} Con IVA (€)`,
                          });
                        }}
                        className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                        title={`Fórmula: ${customConIva.rawFormula}`}
                      >
                        fx
                      </span>
                    )}
                    <span className={customConIva || isSinIvaMod ? 'text-amber-300 font-black text-sm' : 'font-bold text-emerald-400 text-sm'}>
                      {formatNum(conIva, 3)} €
                    </span>
                    {isSinIvaMod && !customConIva && (
                      <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded shadow">
                        MOD
                      </span>
                    )}
                  </div>
                </div>

                {/* Precio Poste / Surtidor */}
                <div
                  onClick={() => {
                    if (!isFormulaMode) return;
                    setActiveModalCell({
                      cellKey: `POSTE_GASES_${shortName}_POSTE`,
                      cellTitle: `${gasName} — Poste / Surtidor (€)`,
                      defaultValue: parseNum(data.poste),
                      currentFormula: customPoste?.rawFormula,
                      columnLabel: `${gasName} Poste (€)`,
                    });
                  }}
                  className={`space-y-1 pt-1 ${isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 p-1.5 rounded-xl ring-1 ring-amber-400/30' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-400 block">Precio Poste / Surtidor (€):</label>
                      {isPosteMod && !customPoste && (
                        <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded shadow">
                          HOY
                        </span>
                      )}
                    </div>
                    {customPoste && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalCell({
                            cellKey: `POSTE_GASES_${shortName}_POSTE`,
                            cellTitle: `${gasName} — Poste / Surtidor (€)`,
                            defaultValue: parseNum(data.poste),
                            currentFormula: customPoste?.rawFormula,
                            columnLabel: `${gasName} Poste (€)`,
                          });
                        }}
                        className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                        title={`Fórmula: ${customPoste.rawFormula}`}
                      >
                        fx
                      </span>
                    )}
                  </div>
                  {isFormulaMode ? (
                    <div
                      className={`w-full rounded-xl px-3 py-2 font-mono font-bold text-sm flex items-center justify-between ${
                        customPoste
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                          : 'bg-slate-900 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {customPoste && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 rounded mr-1">fx</span>}
                      <span className="flex-1 text-right">{posteDisplay}</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={posteDisplay}
                      onChange={(e) => {
                        const val = e.target.value.replace('.', ',');
                        const updatedGases = {
                          ...gasesRows,
                          [gasName]: { ...gasesRows[gasName], poste: val },
                        };
                        setGasesRows(updatedGases);
                        const updatedMods = new Set(modifiedKeys).add(`gas_poste_${gasName}`);
                        setModifiedKeys(updatedMods);
                        setIsSaved(false);
                        persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, gasoleoBRows, adblueRows, updatedGases);
                      }}
                      className={`w-full rounded-xl px-3 py-2 font-mono font-bold text-sm transition-all focus:outline-none ${
                        customPoste
                          ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                          : isPosteMod
                          ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                          : 'bg-slate-900 border border-slate-700 text-teal-300 focus:border-amber-400'
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Sección Gasolina Bronco */}
      {(() => {
        const customBroncoCompra = resolvedPostesFormulas['POSTE_BRONCO_COMPRA'];
        const customBroncoSinIva = resolvedPostesFormulas['POSTE_BRONCO_SIN_IVA'];
        const customBroncoConIva = resolvedPostesFormulas['POSTE_BRONCO_CON_IVA'];
        const customBroncoBeneficio = resolvedPostesFormulas['POSTE_BRONCO_BENEFICIO'];

        const compraDisplay = customBroncoCompra ? formatNum(customBroncoCompra.evaluatedValue, 3) : broncoRow.compra;
        const sinIvaDisplay = customBroncoSinIva ? formatNum(customBroncoSinIva.evaluatedValue, 3) : broncoRow.sinIva;
        const conIvaDisplay = customBroncoConIva ? formatNum(customBroncoConIva.evaluatedValue, 3) : broncoRow.conIva;
        const beneficioDisplay = customBroncoBeneficio ? formatNum(customBroncoBeneficio.evaluatedValue, 3) : broncoRow.beneficio;

        const isCompraMod = modifiedKeys.has('bronco_compra') || modifiedKeys.has('cuadro_bronco_compra');
        const isSinIvaMod = modifiedKeys.has('bronco_sinIva') || modifiedKeys.has('cuadro_bronco_sinIva');
        const isConIvaMod = modifiedKeys.has('bronco_conIva') || modifiedKeys.has('cuadro_bronco_conIva');
        const isBeneficioMod = modifiedKeys.has('bronco_beneficio') || modifiedKeys.has('cuadro_bronco_beneficio');

        return (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Gasolina Bronco</h3>
                  <p className="text-xs text-slate-400">Precios de adquisición, venta con/sin IVA y margen de beneficio</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-amber-400 text-slate-950 shadow-sm animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-slate-950"></span>
                  Amarillo = Dato Modificado Hoy
                </span>
                <button
                  onClick={downloadGasolinaBroncoPng}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 self-start sm:self-auto"
                  title="Descargar imagen PNG de Gasolina Bronco"
                >
                  <Download className="h-4 w-4" />
                  <span>Descargar PNG Gasolina Bronco</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Compra Sin IVA */}
              <div
                onClick={() => {
                  if (!isFormulaMode) return;
                  setActiveModalCell({
                    cellKey: 'POSTE_BRONCO_COMPRA',
                    cellTitle: 'Gasolina Bronco — Compra Sin IVA (€)',
                    defaultValue: parseNum(broncoRow.compra),
                    currentFormula: customBroncoCompra?.rawFormula,
                    columnLabel: 'Bronco Compra Sin IVA (€)',
                  });
                }}
                className={`bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 ${
                  isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Compra Sin IVA (€):</span>
                    {isCompraMod && !customBroncoCompra && (
                      <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded shadow">
                        HOY
                      </span>
                    )}
                  </div>
                  {customBroncoCompra && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalCell({
                          cellKey: 'POSTE_BRONCO_COMPRA',
                          cellTitle: 'Gasolina Bronco — Compra Sin IVA (€)',
                          defaultValue: parseNum(broncoRow.compra),
                          currentFormula: customBroncoCompra?.rawFormula,
                          columnLabel: 'Bronco Compra Sin IVA (€)',
                        });
                      }}
                      className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                      title={`Fórmula: ${customBroncoCompra.rawFormula}`}
                    >
                      fx
                    </span>
                  )}
                </div>
                {isFormulaMode ? (
                  <div
                    className={`w-full rounded px-2.5 py-1.5 text-xs font-mono font-bold flex items-center justify-between ${
                      customBroncoCompra
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                        : 'bg-slate-900 border border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {customBroncoCompra && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 rounded mr-1">fx</span>}
                    <span className="flex-1 text-right">{compraDisplay}</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={compraDisplay}
                    onChange={(e) => {
                      const val = e.target.value.replace('.', ',');
                      const cNum = parseNum(val);
                      const sNum = parseNum(broncoRow.sinIva);
                      const newBen = Number((sNum - cNum).toFixed(3));
                      const updatedBronco = {
                        ...broncoRow,
                        compra: val,
                        beneficio: formatNum(newBen, 3),
                      };
                      setBroncoRow(updatedBronco);
                      const updatedMods = new Set(modifiedKeys).add('bronco_compra').add('bronco_beneficio');
                      setModifiedKeys(updatedMods);
                      setIsSaved(false);
                      persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, gasoleoBRows, adblueRows, gasesRows, updatedBronco);
                    }}
                    className={`w-full rounded px-2.5 py-1.5 text-xs font-mono font-bold transition-all focus:outline-none ${
                      customBroncoCompra
                        ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                        : isCompraMod
                        ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                        : 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-400'
                    }`}
                  />
                )}
              </div>

              {/* Venta Sin IVA */}
              <div
                onClick={() => {
                  if (!isFormulaMode) return;
                  setActiveModalCell({
                    cellKey: 'POSTE_BRONCO_SIN_IVA',
                    cellTitle: 'Gasolina Bronco — Venta Sin IVA (€)',
                    defaultValue: parseNum(broncoRow.sinIva),
                    currentFormula: customBroncoSinIva?.rawFormula,
                    columnLabel: 'Bronco Venta Sin IVA (€)',
                  });
                }}
                className={`bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 ${
                  isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Venta Sin IVA (€):</span>
                    {isSinIvaMod && !customBroncoSinIva && (
                      <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded shadow">
                        HOY
                      </span>
                    )}
                  </div>
                  {customBroncoSinIva && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalCell({
                          cellKey: 'POSTE_BRONCO_SIN_IVA',
                          cellTitle: 'Gasolina Bronco — Venta Sin IVA (€)',
                          defaultValue: parseNum(broncoRow.sinIva),
                          currentFormula: customBroncoSinIva?.rawFormula,
                          columnLabel: 'Bronco Venta Sin IVA (€)',
                        });
                      }}
                      className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                      title={`Fórmula: ${customBroncoSinIva.rawFormula}`}
                    >
                      fx
                    </span>
                  )}
                </div>
                {isFormulaMode ? (
                  <div
                    className={`w-full rounded px-2.5 py-1.5 text-xs font-mono font-bold flex items-center justify-between ${
                      customBroncoSinIva
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                        : 'bg-slate-900 border border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {customBroncoSinIva && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 rounded mr-1">fx</span>}
                    <span className="flex-1 text-right">{sinIvaDisplay}</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sinIvaDisplay}
                    onChange={(e) => {
                      const val = e.target.value.replace('.', ',');
                      const sNum = parseNum(val);
                      const cNum = parseNum(broncoRow.compra);
                      const newConIva = Number((sNum * 1.21).toFixed(3));
                      const newBen = Number((sNum - cNum).toFixed(3));
                      const updatedBronco = {
                        ...broncoRow,
                        sinIva: val,
                        conIva: formatNum(newConIva, 3),
                        beneficio: formatNum(newBen, 3),
                      };
                      setBroncoRow(updatedBronco);
                      const updatedMods = new Set(modifiedKeys).add('bronco_sinIva').add('bronco_conIva').add('bronco_beneficio');
                      setModifiedKeys(updatedMods);
                      setIsSaved(false);
                      persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, gasoleoBRows, adblueRows, gasesRows, updatedBronco);
                    }}
                    className={`w-full rounded px-2.5 py-1.5 text-xs font-mono font-bold transition-all focus:outline-none ${
                      customBroncoSinIva
                        ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                        : isSinIvaMod
                        ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                        : 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-400'
                    }`}
                  />
                )}
              </div>

              {/* Venta Con IVA (21%) */}
              <div
                onClick={() => {
                  if (!isFormulaMode) return;
                  setActiveModalCell({
                    cellKey: 'POSTE_BRONCO_CON_IVA',
                    cellTitle: 'Gasolina Bronco — Con IVA 21% (€)',
                    defaultValue: parseNum(broncoRow.conIva),
                    currentFormula: customBroncoConIva?.rawFormula,
                    columnLabel: 'Bronco Con IVA (€)',
                  });
                }}
                className={`bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 ${
                  isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Con IVA (21%):</span>
                    {isConIvaMod && !customBroncoConIva && (
                      <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded shadow">
                        HOY
                      </span>
                    )}
                  </div>
                  {customBroncoConIva && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalCell({
                          cellKey: 'POSTE_BRONCO_CON_IVA',
                          cellTitle: 'Gasolina Bronco — Con IVA 21% (€)',
                          defaultValue: parseNum(broncoRow.conIva),
                          currentFormula: customBroncoConIva?.rawFormula,
                          columnLabel: 'Bronco Con IVA (€)',
                        });
                      }}
                      className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                      title={`Fórmula: ${customBroncoConIva.rawFormula}`}
                    >
                      fx
                    </span>
                  )}
                </div>
                {isFormulaMode ? (
                  <div
                    className={`w-full rounded px-2.5 py-1.5 text-xs font-mono font-bold flex items-center justify-between ${
                      customBroncoConIva
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                        : 'bg-slate-900 border border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {customBroncoConIva && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 rounded mr-1">fx</span>}
                    <span className="flex-1 text-right">{conIvaDisplay}</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={conIvaDisplay}
                    onChange={(e) => {
                      const val = e.target.value.replace('.', ',');
                      const conNum = parseNum(val);
                      const cNum = parseNum(broncoRow.compra);
                      const newSinIva = Number((conNum / 1.21).toFixed(3));
                      const newBen = Number((newSinIva - cNum).toFixed(3));
                      const updatedBronco = {
                        ...broncoRow,
                        conIva: val,
                        sinIva: formatNum(newSinIva, 3),
                        beneficio: formatNum(newBen, 3),
                      };
                      setBroncoRow(updatedBronco);
                      const updatedMods = new Set(modifiedKeys).add('bronco_conIva').add('bronco_sinIva').add('bronco_beneficio');
                      setModifiedKeys(updatedMods);
                      setIsSaved(false);
                      persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, gasoleoBRows, adblueRows, gasesRows, updatedBronco);
                    }}
                    className={`w-full rounded px-2.5 py-1.5 text-xs font-mono font-bold transition-all focus:outline-none ${
                      customBroncoConIva
                        ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                        : isConIvaMod
                        ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                        : 'bg-slate-900 border border-slate-700 text-emerald-400 focus:border-amber-400'
                    }`}
                  />
                )}
              </div>

              {/* Beneficio / Margen */}
              <div
                onClick={() => {
                  if (!isFormulaMode) return;
                  setActiveModalCell({
                    cellKey: 'POSTE_BRONCO_BENEFICIO',
                    cellTitle: 'Gasolina Bronco — Beneficio / Margen (€)',
                    defaultValue: parseNum(broncoRow.beneficio),
                    currentFormula: customBroncoBeneficio?.rawFormula,
                    columnLabel: 'Bronco Margen (€)',
                  });
                }}
                className={`bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 ${
                  isFormulaMode ? 'cursor-pointer hover:bg-amber-500/10 ring-1 ring-amber-400/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Beneficio / Margen (€):</span>
                    {isBeneficioMod && !customBroncoBeneficio && (
                      <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded shadow">
                        HOY
                      </span>
                    )}
                  </div>
                  {customBroncoBeneficio && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalCell({
                          cellKey: 'POSTE_BRONCO_BENEFICIO',
                          cellTitle: 'Gasolina Bronco — Beneficio / Margen (€)',
                          defaultValue: parseNum(broncoRow.beneficio),
                          currentFormula: customBroncoBeneficio?.rawFormula,
                          columnLabel: 'Bronco Margen (€)',
                        });
                      }}
                      className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                      title={`Fórmula: ${customBroncoBeneficio.rawFormula}`}
                    >
                      fx
                    </span>
                  )}
                </div>
                {isFormulaMode ? (
                  <div
                    className={`w-full rounded px-2.5 py-1.5 text-xs font-mono font-bold flex items-center justify-between ${
                      customBroncoBeneficio
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                        : 'bg-slate-900 border border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {customBroncoBeneficio && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 rounded mr-1">fx</span>}
                    <span className="flex-1 text-right">{beneficioDisplay}</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={beneficioDisplay}
                    onChange={(e) => {
                      const val = e.target.value.replace('.', ',');
                      const bNum = parseNum(val);
                      const cNum = parseNum(broncoRow.compra);
                      const newSinIva = Number((cNum + bNum).toFixed(3));
                      const newConIva = Number((newSinIva * 1.21).toFixed(3));
                      const updatedBronco = {
                        ...broncoRow,
                        beneficio: val,
                        sinIva: formatNum(newSinIva, 3),
                        conIva: formatNum(newConIva, 3),
                      };
                      setBroncoRow(updatedBronco);
                      const updatedMods = new Set(modifiedKeys).add('bronco_beneficio').add('bronco_sinIva').add('bronco_conIva');
                      setModifiedKeys(updatedMods);
                      setIsSaved(false);
                      persistPostesData(postes, hvoGeneralBase, hvoGeneralAddition, hvoAlfajarinSinIva, hvoValdemoroAddition, updatedMods, gasoleoBRows, adblueRows, gasesRows, updatedBronco);
                    }}
                    className={`w-full rounded px-2.5 py-1.5 text-xs font-mono font-bold transition-all focus:outline-none ${
                      customBroncoBeneficio
                        ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 font-black'
                        : isBeneficioMod
                        ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/30 font-black'
                        : 'bg-slate-900 border border-slate-700 text-amber-400 focus:border-amber-400'
                    }`}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })()}


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
          selectedDate={validFromDate}
          onSave={(formulaStr, evaluatedVal) => {
            handleSaveFormula(activeModalCell.cellKey, formulaStr, evaluatedVal);
          }}
          onRemove={() => {
            handleRemoveFormula(activeModalCell.cellKey);
          }}
          onApplyToColumn={activeModalCell.onApplyToColumn}
        />
      )}

      {imageToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5">
          <Check className="h-5 w-5" />
          <span>{imageToast}</span>
        </div>
      )}
    </div>
  );
}
