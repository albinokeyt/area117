'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Plus, Sliders, Check, RotateCcw, Trash2, ArrowRight,
  FileSpreadsheet, Fuel, Layers, Star, Table, MousePointerClick,
  AlertCircle, Sparkles, CheckCircle2, ChevronRight, Info, Search,
  Calendar, CreditCard, Hash, Percent, Edit3
} from 'lucide-react';
import {
  IMPORT_STATIONS_56,
  EfiExportRowOverride,
  EfiExportAddedRow,
  resolveSabanaStationName
} from '@/lib/excelExportService';
import { getImportStations } from '@/lib/stationsService';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, OFFICIAL_SUGGESTED_SALE_PRICES } from '@/lib/dataSeed';
import { SabanaTariffDef } from './SabanaTariffManagerModal';

interface EfiExportModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  previewRows: (string | number | null)[][];
  onSaveOverride: (
    key: string,
    override: EfiExportRowOverride,
    scope?: 'ROW' | 'TARIFF' | 'STATION',
    targetTariff?: string,
    targetStation?: string
  ) => void;
  onAddRow: (newRow: EfiExportAddedRow) => void;
  onAddTariffBlock: (
    tariffName: string,
    codeA: number,
    prod: number,
    pago: string,
    markup: number,
    sourceType?: string
  ) => void;
  onDeleteRow: (rowKey: string) => void;
  onDeleteTariffBlock: (tariffName: string) => void;
  onResetAll: () => void;
  comprasPurchases?: Record<string, { sale?: string; buy?: string; min?: string; avg?: string }>;
  specialRates?: any[];
  postesData?: any;
  sabanaFormulas?: Record<string, any>;
  initialSelectedRow?: {
    rowKey: string;
    codeA: number;
    stationId: number;
    prod: number;
    initialDate: string;
    finalDate: string;
    pvp: number;
    stationName: string;
    pago: string;
    tarifa: string;
  } | null;
}

export interface EfiSourceOption {
  id: string;
  window: string;
  label: string;
  description: string;
  tariffName?: string;
  markup?: number;
  isCustom?: boolean;
}

export const PRESET_EFI_SOURCES = [
  {
    id: 'DEFAULT',
    window: 'Sábana de Precios',
    label: 'Cálculo Predeterminado de Sábana de Precios',
    description: 'Toma el precio exacto calculado con IVA desde la ventana Sábana de Precios',
  },
  {
    id: 'SABANA_T12',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 12 (Con IVA)',
    description: 'Copia el precio final Con IVA de Tarifa 12',
  },
  {
    id: 'SABANA_T18',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 18 (Con IVA)',
    description: 'Copia el precio final Con IVA de Tarifa 18',
  },
  {
    id: 'SABANA_T24',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 24 (Con IVA)',
    description: 'Copia el precio final Con IVA de Tarifa 24',
  },
  {
    id: 'SABANA_T36',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 36 (Con IVA)',
    description: 'Copia el precio final Con IVA de Tarifa 36',
  },
  {
    id: 'SABANA_T40',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 40 (Con IVA)',
    description: 'Copia el precio final Con IVA de Tarifa 40',
  },
  {
    id: 'SABANA_T42',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 42 (Con IVA)',
    description: 'Copia el precio final Con IVA de Tarifa 42',
  },
  {
    id: 'SABANA_T47',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 47 (Con IVA)',
    description: 'Copia el precio final Con IVA de Tarifa 47',
  },
  {
    id: 'SABANA_T50',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 50 (Con IVA)',
    description: 'Copia el precio final Con IVA de Tarifa 50',
  },
  {
    id: 'SABANA_T60',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 60 (Con IVA)',
    description: 'Copia el precio final Con IVA de Tarifa 60',
  },
  {
    id: 'SABANA_JAVI',
    window: 'Sábana de Precios',
    label: 'Sábana — Especial Javi (Con IVA)',
    description: 'Copia el precio Con IVA de Especial Javi',
  },
  {
    id: 'SABANA_CARRERAS',
    window: 'Sábana de Precios',
    label: 'Sábana — Especial Carreras (Con IVA)',
    description: 'Copia el precio Con IVA de Especial Carreras',
  },
  {
    id: 'SABANA_TRANSFRIRED',
    window: 'Sábana de Precios',
    label: 'Sábana — Especial Transfrired (Con IVA)',
    description: 'Copia el precio Con IVA de Especial Transfrired',
  },
  {
    id: 'SABANA_C0',
    window: 'Sábana de Precios',
    label: 'Sábana — Especial General C-0 (Con IVA)',
    description: 'Copia el precio Con IVA de Especial General C-0',
  },
  {
    id: 'SABANA_ROR',
    window: 'Sábana de Precios',
    label: 'Sábana — Especial ROR (Con IVA)',
    description: 'Copia el precio Con IVA de Especial ROR',
  },
  {
    id: 'SABANA_ESTEBAN',
    window: 'Sábana de Precios',
    label: 'Sábana — Especial Esteban (Con IVA)',
    description: 'Copia el precio Con IVA de Especial Esteban',
  },
  {
    id: 'SABANA_ECOTRANS',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa ECOTRANS (Con IVA)',
    description: 'Copia el precio Con IVA de Tarifa ECOTRANS',
  },
  {
    id: 'SABANA_T30',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 30 (Con IVA)',
    description: 'Copia el precio Con IVA de Tarifa 30',
  },
  {
    id: 'SABANA_T27',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 27 Sur (Con IVA)',
    description: 'Copia el precio Con IVA de Tarifa 27 Sur',
  },
  {
    id: 'SABANA_T15',
    window: 'Sábana de Precios',
    label: 'Sábana — Tarifa 15 Sur (Con IVA)',
    description: 'Copia el precio Con IVA de Tarifa 15 Sur',
  },
  {
    id: 'COMPRAS_VENTA_SUGERIDO',
    window: 'Compras',
    label: 'Compras — P. Venta Sugerido GOA (Con IVA * 1.21)',
    description: 'Precio oficial sugerido de Compras para la estación convertido Con IVA',
  },
  {
    id: 'COMPRAS_BRONCO',
    window: 'Compras',
    label: 'Compras — Gasolina Bronco Con IVA',
    description: 'Precio de venta Con IVA del producto Gasolina Bronco',
  },
  {
    id: 'COMPRAS_PRECIO_COMPRA',
    window: 'Compras',
    label: 'Compras — P. Compra Hoy / Medio (Con IVA * 1.21)',
    description: 'Precio de coste/compra promedio en terminales convertido Con IVA',
  },
  {
    id: 'ESPECIAL_REF',
    window: 'Tarifas Especiales',
    label: 'Tarifas Especiales — Precio Referencia (B50:F82) Con IVA',
    description: 'Precio de referencia (celdas anaranjadas) convertido Con IVA',
  },
  {
    id: 'ESPECIAL_ACTUAL',
    window: 'Tarifas Especiales',
    label: 'Tarifas Especiales — Precio Actual Especial Con IVA',
    description: 'Precio actual especial negociado convertido Con IVA',
  },
  {
    id: 'POSTES_GOA',
    window: 'Postes',
    label: 'Postes — Precio Poste Gasóleo A (PVP Con IVA)',
    description: 'PVP de cartelera física para Gasóleo A',
  },
  {
    id: 'POSTES_GAS95',
    window: 'Postes',
    label: 'Postes — Precio Poste Gasolina 95 (PVP Con IVA)',
    description: 'PVP de cartelera física para Gasolina 95',
  },
  {
    id: 'POSTES_GOB',
    window: 'Postes',
    label: 'Postes — Precio Poste Gasóleo B (PVP Con IVA)',
    description: 'Precio transfer de cartelera para Gasóleo B Agrícola',
  },
  {
    id: 'MANUAL',
    window: 'Manual',
    label: 'Precio Fijo / Manual',
    description: 'Fijar un precio numérico manual específico',
  },
];

export function EfiExportModifierModal({
  isOpen,
  onClose,
  selectedDate,
  previewRows,
  onSaveOverride,
  onAddRow,
  onAddTariffBlock,
  onDeleteRow,
  onDeleteTariffBlock,
  onResetAll,
  comprasPurchases = {},
  specialRates = [],
  postesData = {},
  sabanaFormulas = {},
  initialSelectedRow = null,
}: EfiExportModifierModalProps) {
  const [activeTab, setActiveTab] = useState<'modify' | 'add' | 'delete' | 'picker'>('modify');

  // Reactivity tracker for changes in Sábana de Precios or EFI Export
  const [sabanaVersion, setSabanaVersion] = useState(0);

  useEffect(() => {
    const handleSabanaUpdate = () => {
      setSabanaVersion((v) => v + 1);
    };
    window.addEventListener('efi_sabana_updated', handleSabanaUpdate);
    window.addEventListener('efi_export_updated', handleSabanaUpdate);
    window.addEventListener('storage', handleSabanaUpdate);
    return () => {
      window.removeEventListener('efi_sabana_updated', handleSabanaUpdate);
      window.removeEventListener('efi_export_updated', handleSabanaUpdate);
      window.removeEventListener('storage', handleSabanaUpdate);
    };
  }, []);

  // Dynamic custom tariffs & modifications loaded directly from Sábana storage
  const sabanaTariffsData = useMemo(() => {
    if (typeof window === 'undefined') return { cStd: [], cSpec: [], modConfig: {} };
    try {
      const cStdRaw = localStorage.getItem('efi_sabana_custom_standard_tariffs_v1');
      const cSpecRaw = localStorage.getItem('efi_sabana_custom_special_tariffs_v1');
      const modRaw = localStorage.getItem('efi_sabana_modified_tariffs_config_v1');
      const cStd: SabanaTariffDef[] = cStdRaw ? JSON.parse(cStdRaw) : [];
      const cSpec: SabanaTariffDef[] = cSpecRaw ? JSON.parse(cSpecRaw) : [];
      const modConfig: Record<string, any> = modRaw ? JSON.parse(modRaw) : {};
      return { cStd, cSpec, modConfig };
    } catch (e) {
      return { cStd: [], cSpec: [], modConfig: {} };
    }
  }, [sabanaVersion, isOpen]);

  // Dynamic list of ALL sources for the "Origen de Datos Base" dropdown
  const allAvailableSources = useMemo<EfiSourceOption[]>(() => {
    const list: EfiSourceOption[] = [];

    // 1. Predeterminado de Sábana
    list.push({
      id: 'DEFAULT',
      window: 'Sábana de Precios',
      label: 'Cálculo Predeterminado de Sábana de Precios',
      description: 'Toma el precio exacto calculado con IVA desde la ventana Sábana de Precios para la tarifa seleccionada',
    });

    // 2. Tarifas Estándar Base de Sábana
    const baseStandards = [
      { id: '12', name: 'Tarifa 12', defaultMarkup: 0.012 },
      { id: '18', name: 'Tarifa 18', defaultMarkup: 0.018 },
      { id: '24', name: 'Tarifa 24', defaultMarkup: 0.024 },
      { id: '36', name: 'Tarifa 36', defaultMarkup: 0.036 },
      { id: '40', name: 'Tarifa 40', defaultMarkup: 0.040 },
      { id: '42', name: 'Tarifa 42', defaultMarkup: 0.042 },
      { id: '47', name: 'Tarifa 47', defaultMarkup: 0.047 },
      { id: '50', name: 'Tarifa 50', defaultMarkup: 0.060 },
      { id: '60', name: 'Tarifa 60', defaultMarkup: 0.080 },
    ];

    baseStandards.forEach((t) => {
      const mod = sabanaTariffsData.modConfig[t.id] || sabanaTariffsData.modConfig[t.name];
      const displayName = mod?.name || t.name;
      const effectiveMarkup = mod?.markup !== undefined ? mod.markup : t.defaultMarkup;
      list.push({
        id: `SABANA_T${t.id}`,
        window: 'Sábana de Precios',
        label: `Sábana — ${displayName} (Con IVA)`,
        description: `Copia el precio final Con IVA de ${displayName} de la Sábana de Precios (Margen: +${effectiveMarkup.toFixed(3)} €)`,
        tariffName: displayName,
        markup: effectiveMarkup,
      });
    });

    // 3. Tarifas Estándar Creadas por el Usuario en Sábana
    sabanaTariffsData.cStd.forEach((c) => {
      const mod = sabanaTariffsData.modConfig[c.id] || sabanaTariffsData.modConfig[c.name];
      const rawName = mod?.name || c.name;
      const displayName = rawName.toUpperCase().startsWith('TARIFA') ? rawName : `Tarifa ${rawName}`;
      const sid = `SABANA_CUSTOM_STD_${(c.id || c.name).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
      const effectiveMarkup = mod?.markup !== undefined ? mod.markup : (c.markup ?? 0.024);
      list.push({
        id: sid,
        window: 'Sábana de Precios',
        label: `Sábana — ${displayName} (Con IVA) [Personalizada]`,
        description: `Copia el precio final Con IVA de ${displayName} de la Sábana de Precios (Margen: +${effectiveMarkup.toFixed(3)} €)`,
        tariffName: displayName,
        markup: effectiveMarkup,
        isCustom: true,
      });
    });

    // 4. Bloques y Tarifas Especiales Base de Sábana
    const baseSpecials = [
      { id: 'SABANA_JAVI', name: 'Especial Javi', label: 'Sábana — Especial Javi (Con IVA)', desc: 'Copia el precio Con IVA de Especial Javi', markup: 0.024 },
      { id: 'SABANA_CARRERAS', name: 'Especial Carreras', label: 'Sábana — Especial Carreras (Con IVA)', desc: 'Copia el precio Con IVA de Especial Carreras', markup: 0.024 },
      { id: 'SABANA_TRANSFRIRED', name: 'Especial Transfrired', label: 'Sábana — Especial Transfrired (Con IVA)', desc: 'Copia el precio Con IVA de Especial Transfrired', markup: 0.024 },
      { id: 'SABANA_C0', name: 'Especial General C-0', label: 'Sábana — Especial General C-0 (Con IVA)', desc: 'Copia el precio Con IVA de Especial General C-0', markup: 0.024 },
      { id: 'SABANA_ROR', name: 'Especial ROR', label: 'Sábana — Especial ROR (Con IVA)', desc: 'Copia el precio Con IVA de Especial ROR', markup: 0.024 },
      { id: 'SABANA_ESTEBAN', name: 'Especial Esteban', label: 'Sábana — Especial Esteban (Con IVA)', desc: 'Copia el precio Con IVA de Especial Esteban', markup: 0.024 },
      { id: 'SABANA_MIKI', name: 'Tarifa 90 Miki', label: 'Sábana — Tarifa 90 Miki / T85 (Con IVA)', desc: 'Copia el precio Con IVA de Tarifa 90 Miki', markup: 0.090 },
      { id: 'SABANA_ECOTRANS', name: 'Tarifa ECOTRANS', label: 'Sábana — Tarifa ECOTRANS (Con IVA)', desc: 'Copia el precio Con IVA de Tarifa ECOTRANS', markup: 0.050 },
      { id: 'SABANA_T30', name: 'Tarifa 30', label: 'Sábana — Tarifa 30 (Con IVA)', desc: 'Copia el precio Con IVA de Tarifa 30', markup: 0.030 },
      { id: 'SABANA_T27', name: 'Tarifa 27 Sur', label: 'Sábana — Tarifa 27 Sur (Con IVA)', desc: 'Copia el precio Con IVA de Tarifa 27 Sur', markup: 0.027 },
      { id: 'SABANA_T15', name: 'Tarifa 15 Sur', label: 'Sábana — Tarifa 15 Sur (Con IVA)', desc: 'Copia el precio Con IVA de Tarifa 15 Sur', markup: 0.015 },
      { id: 'SABANA_T75', name: 'Tarifa 75', label: 'Sábana — Tarifa 75 (Con IVA)', desc: 'Copia el precio Con IVA de Tarifa 75', markup: 0.038 },
    ];

    baseSpecials.forEach((b) => {
      const mod = sabanaTariffsData.modConfig[b.id] || sabanaTariffsData.modConfig[b.name];
      const displayName = mod?.name || b.name;
      const effectiveMarkup = mod?.markup !== undefined ? mod.markup : b.markup;
      list.push({
        id: b.id,
        window: 'Sábana de Precios',
        label: b.label,
        description: b.desc,
        tariffName: displayName,
        markup: effectiveMarkup,
      });
    });

    // 5. Bloques y Tarifas Especiales Creadas por el Usuario en Sábana
    sabanaTariffsData.cSpec.forEach((c) => {
      const mod = sabanaTariffsData.modConfig[c.id] || sabanaTariffsData.modConfig[c.name];
      const rawName = mod?.name || c.name;
      const displayName = rawName.toUpperCase().startsWith('TARIFA') || rawName.toUpperCase().startsWith('ESPECIAL')
        ? rawName
        : `Tarifa Especial ${rawName}`;
      const sid = `SABANA_CUSTOM_SPEC_${(c.id || c.name).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
      const effectiveMarkup = mod?.markup !== undefined ? mod.markup : (c.markup ?? 0.024);
      list.push({
        id: sid,
        window: 'Sábana de Precios',
        label: `Sábana — ${displayName} (Con IVA) [Cuadro Especial]`,
        description: `Copia el precio final Con IVA de ${displayName} de Sábana de Precios (Margen: +${effectiveMarkup.toFixed(3)} €)`,
        tariffName: displayName,
        markup: effectiveMarkup,
        isCustom: true,
      });
    });

    // 6. Otras Tarifas existentes en previewRows (ej. Bronco, Transfrired GOB, Prepagos, Bloques añadidos)
    previewRows.slice(1).forEach((r) => {
      const t = String(r[8] || '').trim();
      if (!t) return;
      const tUpper = t.toUpperCase();
      const alreadyInList = list.some(
        (item) => item.tariffName && (
          item.tariffName.toUpperCase() === tUpper ||
          item.tariffName.toUpperCase().replace(/^TARIFA\s+/, '') === tUpper.replace(/^TARIFA\s+/, '')
        )
      );
      if (!alreadyInList) {
        list.push({
          id: `EFI_${tUpper.replace(/[^a-zA-Z0-9]/g, '_')}`,
          window: 'EFI Export',
          label: `EFI Export — ${t} (Con IVA)`,
          description: `Copia el precio actual de ${t} en la exportación EFI`,
          tariffName: t,
        });
      }
    });

    // 7. Fuentes de Compras
    list.push(
      {
        id: 'COMPRAS_VENTA_SUGERIDO',
        window: 'Compras',
        label: 'Compras — P. Venta Sugerido GOA (Con IVA * 1.21)',
        description: 'Precio oficial sugerido de Compras para la estación convertido Con IVA',
      },
      {
        id: 'COMPRAS_BRONCO',
        window: 'Compras',
        label: 'Compras — Gasolina Bronco Con IVA',
        description: 'Precio de venta Con IVA del producto Gasolina Bronco',
      },
      {
        id: 'COMPRAS_PRECIO_COMPRA',
        window: 'Compras',
        label: 'Compras — P. Compra Hoy / Medio (Con IVA * 1.21)',
        description: 'Precio de coste/compra promedio en terminales convertido Con IVA',
      }
    );

    // 8. Tarifas Especiales
    list.push(
      {
        id: 'ESPECIAL_REF',
        window: 'Tarifas Especiales',
        label: 'Tarifas Especiales — Precio Referencia (B50:F82) Con IVA',
        description: 'Precio de referencia (celdas anaranjadas) convertido Con IVA',
      },
      {
        id: 'ESPECIAL_ACTUAL',
        window: 'Tarifas Especiales',
        label: 'Tarifas Especiales — Precio Actual Especial Con IVA',
        description: 'Precio actual especial negociado convertido Con IVA',
      }
    );

    // 9. Postes
    list.push(
      {
        id: 'POSTES_GOA',
        window: 'Postes',
        label: 'Postes — Precio Poste Gasóleo A (PVP Con IVA)',
        description: 'PVP de cartelera física para Gasóleo A',
      },
      {
        id: 'POSTES_GAS95',
        window: 'Postes',
        label: 'Postes — Precio Poste Gasolina 95 (PVP Con IVA)',
        description: 'PVP de cartelera física para Gasolina 95',
      },
      {
        id: 'POSTES_GOB',
        window: 'Postes',
        label: 'Postes — Precio Poste Gasóleo B (PVP Con IVA)',
        description: 'Precio transfer de cartelera para Gasóleo B Agrícola',
      }
    );

    // 10. Manual
    list.push({
      id: 'MANUAL',
      window: 'Manual',
      label: 'Precio Fijo / Manual',
      description: 'Fijar un precio numérico manual específico',
    });

    return list;
  }, [sabanaTariffsData, previewRows]);

  // List of unique tariffs in previewRows + all custom standard and special tariffs from Sábana
  const availableTariffs = useMemo(() => {
    const setT = new Set<string>();
    previewRows.slice(1).forEach((r) => {
      const t = r[8];
      if (t && typeof t === 'string' && t.trim() !== '') {
        setT.add(t.trim());
      }
    });

    // Also include all custom standard and special tariffs from Sábana
    sabanaTariffsData.cStd.forEach((c) => {
      const raw = c.name.toUpperCase().trim();
      setT.add(raw.startsWith('TARIFA') ? raw : `TARIFA ${raw}`);
    });
    sabanaTariffsData.cSpec.forEach((c) => {
      const raw = c.name.toUpperCase().trim();
      setT.add(raw.startsWith('TARIFA') ? raw : `TARIFA ${raw}`);
    });

    return Array.from(setT);
  }, [previewRows, sabanaTariffsData]);

  // Scope selection: 'ROW' | 'TARIFF' | 'STATION'
  const [modifyScope, setModifyScope] = useState<'ROW' | 'TARIFF' | 'STATION'>('ROW');

  // Selected Row / Target state
  const [selectedTariff, setSelectedTariff] = useState<string>('TARIFA 12');
  const [selectedStationId, setSelectedStationId] = useState<number>(73);
  const [selectedProd, setSelectedProd] = useState<number>(1);

  // Edit fields
  const [editPriceMode, setEditPriceMode] = useState<'DIRECT' | 'SOURCE'>('DIRECT');
  const [manualPriceConIva, setManualPriceConIva] = useState<string>('1.807');
  const [sourceType, setSourceType] = useState<string>('DEFAULT');
  const [markupDiff, setMarkupDiff] = useState<string>('0.000');
  const [initialDate, setInitialDate] = useState<string>('01/08/2025');
  const [finalDate, setFinalDate] = useState<string>('20/08/2025');
  const [pagoType, setPagoType] = useState<string>('MENSUAL');
  const [codeAValue, setCodeAValue] = useState<string>('6');

  // New Row state (Tab Add)
  const [newRowStationId, setNewRowStationId] = useState<number>(73);
  const [newRowTariff, setNewRowTariff] = useState<string>('TARIFA 12');
  const [newRowProd, setNewRowProd] = useState<number>(1);
  const [newRowInitialDate, setNewRowInitialDate] = useState<string>('01/08/2025');
  const [newRowFinalDate, setNewRowFinalDate] = useState<string>('20/08/2025');
  const [newRowPvp, setNewRowPvp] = useState<string>('1.800');
  const [newRowPago, setNewRowPago] = useState<string>('MENSUAL');
  const [newRowCodeA, setNewRowCodeA] = useState<string>('6');

  // New Tariff Block state (Tab Add Block)
  const [addMode, setAddMode] = useState<'ROW' | 'BLOCK'>('ROW');
  const [newBlockName, setNewBlockName] = useState<string>('');
  const [newBlockCodeA, setNewBlockCodeA] = useState<string>('99');
  const [newBlockProd, setNewBlockProd] = useState<number>(1);
  const [newBlockPago, setNewBlockPago] = useState<string>('MENSUAL');
  const [newBlockMarkup, setNewBlockMarkup] = useState<string>('0.024');

  // Delete Tab state
  const [tariffToDelete, setTariffToDelete] = useState<string>('TARIFA 85');

  // Picker search
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSubTab, setPickerSubTab] = useState<'sabana' | 'compras' | 'special' | 'postes'>('sabana');

  // Success Toast
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync with initialSelectedRow if provided
  useEffect(() => {
    if (initialSelectedRow) {
      setModifyScope('ROW');
      setSelectedTariff(initialSelectedRow.tarifa);
      setSelectedStationId(initialSelectedRow.stationId);
      setSelectedProd(initialSelectedRow.prod);
      setManualPriceConIva(initialSelectedRow.pvp.toFixed(3).replace('.', ','));
      setInitialDate(initialSelectedRow.initialDate);
      setFinalDate(initialSelectedRow.finalDate);
      setPagoType(initialSelectedRow.pago);
      setCodeAValue(String(initialSelectedRow.codeA));
    }
  }, [initialSelectedRow]);

  const importStations = useMemo(() => {
    return typeof window !== 'undefined' ? getImportStations() : IMPORT_STATIONS_56;
  }, [isOpen]);

  // Current station name
  const currentStation = useMemo(() => {
    return importStations.find((s) => s.id === selectedStationId) || importStations[0];
  }, [selectedStationId, importStations]);

  // Helper para obtener el precio base de compras de cualquier estación
  const getStationBasePrice = (stName: string): number => {
    const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    let p = comprasPurchases[`${stName}_GOA`]?.sale;
    if (!p) {
      const matchK = Object.keys(comprasPurchases).find((k) => {
        if (!k.endsWith('_GOA')) return false;
        const b = k.replace(/_GOA$/, '').toUpperCase().replace(/^ES\s+/, '').trim();
        return b === cleanTarget || b.includes(cleanTarget) || cleanTarget.includes(b);
      });
      if (matchK) p = comprasPurchases[matchK]?.sale;
    }
    if (p) {
      const num = parseFloat(String(p).replace(',', '.'));
      if (!isNaN(num) && num > 0) return num;
    }
    if (OFFICIAL_SUGGESTED_SALE_PRICES[cleanTarget] !== undefined) {
      return OFFICIAL_SUGGESTED_SALE_PRICES[cleanTarget];
    }
    if (OFFICIAL_SUGGESTED_SALE_PRICES[stName] !== undefined) {
      return OFFICIAL_SUGGESTED_SALE_PRICES[stName];
    }
    return 1.480;
  };

  // Helper to calculate sample source value
  const resolveSourceValue = (type: string, stName: string): number => {
    const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    const sabanaStation = resolveSabanaStationName(stName);

    if (type.startsWith('SABANA_') || type.startsWith('EFI_') || type === 'DEFAULT') {
      const sourceOpt = allAvailableSources.find((s) => s.id === type);
      const targetTariffName = sourceOpt?.tariffName || (type === 'DEFAULT' ? selectedTariff : '');

      // 1. Try finding in previewRows
      if (targetTariffName) {
        const cleanT = targetTariffName.toUpperCase().replace(/^TARIFA\s+/, '').trim();
        const matchedRow = previewRows.find((r) => {
          const rTariff = String(r[8] || '').toUpperCase().trim();
          const rCleanT = rTariff.replace(/^TARIFA\s+/, '').trim();
          const rSt = String(r[6] || '').toUpperCase().trim();
          const rStId = r[1];

          const stationMatches =
            rStId === selectedStationId ||
            rSt === cleanTarget ||
            rSt === sabanaStation.toUpperCase() ||
            rSt.includes(cleanTarget) ||
            cleanTarget.includes(rSt);

          const tariffMatches =
            rTariff === targetTariffName.toUpperCase().trim() ||
            rCleanT === cleanT ||
            rTariff.includes(cleanT) ||
            cleanT.includes(rCleanT);

          return stationMatches && tariffMatches;
        });

        if (matchedRow && typeof matchedRow[5] === 'number' && matchedRow[5] > 0) {
          return matchedRow[5];
        }
      }

      // Also search previewRows with suffix if legacy SABANA_TX
      const tariffSuffix = type.replace(/^SABANA_/, '').toUpperCase();
      const matchedRowBySuffix = previewRows.find((r) => {
        const rTariff = String(r[8] || '').toUpperCase().trim();
        const rSt = String(r[6] || '').toUpperCase().trim();
        return rTariff.includes(tariffSuffix) && (rSt.includes(cleanTarget) || cleanTarget.includes(rSt));
      });
      if (matchedRowBySuffix && typeof matchedRowBySuffix[5] === 'number') {
        return matchedRowBySuffix[5];
      }

      // 2. Direct calculation fallback
      const base = getStationBasePrice(stName);
      const markup = sourceOpt?.markup ?? 0.024;
      return Number(((base + markup) * 1.21).toFixed(3));
    }

    if (type === 'COMPRAS_VENTA_SUGERIDO') {
      const base = getStationBasePrice(stName);
      return Number((base * 1.21).toFixed(3));
    }

    if (type === 'COMPRAS_BRONCO') {
      try {
        const b = localStorage.getItem('efi_compras_gasolina_bronco') || localStorage.getItem('efi_purchases_bronco_' + selectedDate);
        if (b) {
          const parsed = JSON.parse(b);
          const p = parseFloat(String(parsed.conIva || '').replace(',', '.'));
          if (!isNaN(p) && p > 0) return p;
        }
      } catch (e) {}
      return 1.690;
    }

    if (type === 'COMPRAS_PRECIO_COMPRA') {
      let p = comprasPurchases[`${stName}_GOA`]?.buy;
      if (!p) {
        const matchK = Object.keys(comprasPurchases).find((k) => {
          if (!k.endsWith('_GOA')) return false;
          const b = k.replace(/_GOA$/, '').toUpperCase().replace(/^ES\s+/, '').trim();
          return b === cleanTarget || b.includes(cleanTarget) || cleanTarget.includes(b);
        });
        if (matchK) p = comprasPurchases[matchK]?.buy;
      }
      const num = parseFloat(String(p || '').replace(',', '.'));
      if (!isNaN(num) && num > 0) return Number((num * 1.21).toFixed(3));
      return 1.450;
    }

    if (type === 'ESPECIAL_REF') {
      const r = specialRates.find((s) => s.name?.toUpperCase().includes(cleanTarget) || cleanTarget.includes(s.name?.toUpperCase() || ''));
      if (r?.refPrice) {
        const num = parseFloat(String(r.refPrice).replace(',', '.'));
        if (!isNaN(num) && num > 0) return Number((num * 1.21).toFixed(3));
      }
      return 1.780;
    }

    if (type === 'ESPECIAL_ACTUAL') {
      const r = specialRates.find((s) => s.name?.toUpperCase().includes(cleanTarget) || cleanTarget.includes(s.name?.toUpperCase() || ''));
      if (r?.actualPrice) {
        const num = parseFloat(String(r.actualPrice).replace(',', '.'));
        if (!isNaN(num) && num > 0) return Number((num * 1.21).toFixed(3));
      }
      return 1.760;
    }

    if (type === 'POSTES_GOA') {
      const p = postesData?.propiasPvpRows?.[stName]?.gasoleoA || postesData?.propiasPvpRows?.[cleanTarget]?.gasoleoA;
      if (p) {
        const num = parseFloat(String(p).replace(',', '.'));
        if (!isNaN(num) && num > 0) return num;
      }
      return 1.799;
    }

    if (type === 'POSTES_GAS95') {
      const p = postesData?.propiasPvpRows?.[stName]?.gasolina95 || postesData?.propiasPvpRows?.[cleanTarget]?.gasolina95;
      if (p) {
        const num = parseFloat(String(p).replace(',', '.'));
        if (!isNaN(num) && num > 0) return num;
      }
      return 1.689;
    }

    if (type === 'POSTES_GOB') {
      const p = postesData?.gasoleoBRows?.[cleanTarget]?.compra;
      if (p) {
        const num = parseFloat(String(p).replace(',', '.'));
        if (!isNaN(num) && num > 0) return Number(((num + 0.017) * 1.21).toFixed(3));
      }
      return 1.439;
    }

    return 1.800;
  };

  // Preview computed PVP
  const previewComputedPvp = useMemo(() => {
    if (editPriceMode === 'DIRECT') {
      return parseFloat(manualPriceConIva.replace(',', '.')) || 0;
    }
    const baseVal = resolveSourceValue(sourceType, currentStation.name);
    const diff = parseFloat(markupDiff.replace(',', '.')) || 0;
    return Number((baseVal + diff).toFixed(3));
  }, [editPriceMode, manualPriceConIva, sourceType, markupDiff, currentStation]);

  const handleSaveModification = () => {
    const finalPvp = previewComputedPvp;
    const finalCodeA = parseInt(codeAValue) || 6;
    const finalProdNum = selectedProd;
    const finalDiff = parseFloat(markupDiff.replace(',', '.')) || 0;

    const override: EfiExportRowOverride = {
      pvp: finalPvp,
      codeA: finalCodeA,
      prod: finalProdNum,
      initialDate,
      finalDate,
      pago: pagoType,
      sourceType: editPriceMode === 'SOURCE' ? sourceType : undefined,
      markupDiff: editPriceMode === 'SOURCE' ? finalDiff : undefined,
      manualPriceConIva: editPriceMode === 'DIRECT' ? finalPvp : undefined,
      isCustom: true,
    };

    const targetKey = `${selectedTariff}::${selectedStationId}::${finalProdNum}`;

    onSaveOverride(
      targetKey,
      override,
      modifyScope,
      selectedTariff,
      currentStation.name
    );

    setSuccessMsg(
      modifyScope === 'ROW'
        ? `Modificación guardada para ${currentStation.name} (${selectedTariff}): ${finalPvp.toFixed(3).replace('.', ',')} €`
        : modifyScope === 'TARIFF'
        ? `Modificación aplicada a todas las estaciones de ${selectedTariff}`
        : `Modificación aplicada a todas las tarifas de ${currentStation.name}`
    );
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreateNewRow = () => {
    const pvpNum = parseFloat(newRowPvp.replace(',', '.')) || 0;
    const codeANum = parseInt(newRowCodeA) || 6;
    const stObj = importStations.find((s) => s.id === newRowStationId) || importStations[0];

    const newRow: EfiExportAddedRow = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      codeA: codeANum,
      stationId: newRowStationId,
      prod: newRowProd,
      initialDate: newRowInitialDate,
      finalDate: newRowFinalDate,
      pvp: pvpNum,
      stationName: stObj.name,
      pago: newRowPago,
      tarifa: newRowTariff.toUpperCase().trim(),
    };

    onAddRow(newRow);
    setSuccessMsg(`Fila añadida con éxito a ${newRow.tarifa} para ${newRow.stationName}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreateNewTariffBlock = () => {
    if (!newBlockName.trim()) {
      alert('Por favor, ingresa un nombre para la nueva tarifa.');
      return;
    }
    const cleanName = newBlockName.toUpperCase().trim().startsWith('TARIFA')
      ? newBlockName.toUpperCase().trim()
      : `TARIFA ${newBlockName.toUpperCase().trim()}`;
    const codeANum = parseInt(newBlockCodeA) || 99;
    const markupNum = parseFloat(newBlockMarkup.replace(',', '.')) || 0.024;

    onAddTariffBlock(cleanName, codeANum, newBlockProd, newBlockPago, markupNum);
    setSuccessMsg(`Bloque completo creado para ${cleanName} (56 estaciones integradas)`);
    setTimeout(() => setSuccessMsg(null), 3000);
    setNewBlockName('');
  };

  const handleDeleteTariff = () => {
    if (!confirm(`¿Confirmas eliminar todo el bloque de ${tariffToDelete} de la exportación?`)) {
      return;
    }
    onDeleteTariffBlock(tariffToDelete);
    setSuccessMsg(`Bloque ${tariffToDelete} eliminado de la exportación.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-lg tracking-tight">
                  Modificar y Configurar Datos de Exportación EFI
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Hoja IMPORTACION
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Modifica precios, fechas y orígenes por fórmula o fuente, agrega o quita tarifas y sincroniza con el archivo descargable.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/30 overflow-x-auto">
          <button
            onClick={() => setActiveTab('modify')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'modify'
                ? 'border-emerald-400 text-emerald-300 bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            <span>1. Modificar Datos y Fórmulas</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'add'
                ? 'border-blue-400 text-blue-300 bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>2. ➕ Agregar Filas o Tarifas</span>
          </button>

          <button
            onClick={() => setActiveTab('delete')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'delete'
                ? 'border-red-400 text-red-300 bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Trash2 className="h-4 w-4" />
            <span>3. 🗑️ Quitar Datos y Restablecer</span>
          </button>

          <button
            onClick={() => setActiveTab('picker')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'picker'
                ? 'border-purple-400 text-purple-300 bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <MousePointerClick className="h-4 w-4" />
            <span>4. 🎯 Modo Señalar en Ventanas</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Toast Notification */}
          {successMsg && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: MODIFICAR DATOS */}
          {activeTab === 'modify' && (
            <div className="space-y-6">
              
              {/* Scope Selector */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                  Ámbito de Modificación:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setModifyScope('ROW')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      modifyScope === 'ROW'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="text-xs font-black">Fila Específica</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Afecta solo a 1 estación en 1 tarifa</div>
                  </button>

                  <button
                    onClick={() => setModifyScope('TARIFF')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      modifyScope === 'TARIFF'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="text-xs font-black">Por Tarifa Completa</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Aplica a todas las 56 estaciones de la tarifa</div>
                  </button>

                  <button
                    onClick={() => setModifyScope('STATION')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      modifyScope === 'STATION'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="text-xs font-black">Por Estación</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Aplica a la estación en todas sus tarifas</div>
                  </button>
                </div>
              </div>

              {/* Target Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Tarifa a Modificar:
                  </label>
                  <select
                    value={selectedTariff}
                    onChange={(e) => setSelectedTariff(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                  >
                    {availableTariffs.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Estación de Servicio:
                  </label>
                  <select
                    value={selectedStationId}
                    onChange={(e) => setSelectedStationId(parseInt(e.target.value))}
                    disabled={modifyScope === 'TARIFF'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none disabled:opacity-50"
                  >
                    {importStations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.id} — {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Código de Producto:
                  </label>
                  <select
                    value={selectedProd}
                    onChange={(e) => setSelectedProd(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                  >
                    <option value={1}>1 (Gasóleo A / GOA)</option>
                    <option value={2}>2 (Gasolina Bronco / 95)</option>
                    <option value={5}>5 (Gasóleo B Agrícola)</option>
                  </select>
                </div>
              </div>

              {/* Price Mode & Calculation Box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Fuel className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-extrabold text-white">Configuración del Precio PVP (Con IVA)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditPriceMode('DIRECT')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        editPriceMode === 'DIRECT'
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Precio Manual Directo
                    </button>
                    <button
                      onClick={() => setEditPriceMode('SOURCE')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        editPriceMode === 'SOURCE'
                          ? 'bg-purple-500 text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Fórmula / Origen de Datos (fx)
                    </button>
                  </div>
                </div>

                {editPriceMode === 'DIRECT' ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      PVP Con IVA (€/Litro):
                    </label>
                    <input
                      type="text"
                      value={manualPriceConIva}
                      onChange={(e) => setManualPriceConIva(e.target.value.replace('.', ','))}
                      placeholder="1,807"
                      className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-300 font-bold font-mono focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Origen de Datos Base:
                      </label>
                      <select
                        value={sourceType}
                        onChange={(e) => setSourceType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
                      >
                        {allAvailableSources.map((s) => (
                          <option key={s.id} value={s.id}>
                            [{s.window}] {s.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {allAvailableSources.find((s) => s.id === sourceType)?.description}
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Diferencial / Margen Extra (+ / - €):
                      </label>
                      <input
                        type="text"
                        value={markupDiff}
                        onChange={(e) => setMarkupDiff(e.target.value.replace('.', ','))}
                        placeholder="0,000"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Ej: +0,010 para sumar 1 céntimo o -0,005 para restar medio céntimo
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Preview Box */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">PVP Con IVA Resultante:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono font-black text-emerald-400">
                      {previewComputedPvp.toFixed(3).replace('.', ',')} €
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Sin IVA: {(previewComputedPvp / 1.21).toFixed(3).replace('.', ',')} €)
                    </span>
                  </div>
                </div>
              </div>

              {/* Other Metadata: Dates, Payment, Col A */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Fecha Inicial (INICIAL):
                  </label>
                  <input
                    type="text"
                    value={initialDate}
                    onChange={(e) => setInitialDate(e.target.value)}
                    placeholder="01/08/2025"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Fecha Final (FINAL):
                  </label>
                  <input
                    type="text"
                    value={finalDate}
                    onChange={(e) => setFinalDate(e.target.value)}
                    placeholder="20/08/2025"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Tipo de Pago (PAGO):
                  </label>
                  <select
                    value={pagoType}
                    onChange={(e) => setPagoType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="MENSUAL">MENSUAL</option>
                    <option value="PREPAGO">PREPAGO</option>
                    <option value="SEMANAL">SEMANAL</option>
                    <option value="DIARIO">DIARIO</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Código Columna A (Col A):
                  </label>
                  <input
                    type="number"
                    value={codeAValue}
                    onChange={(e) => setCodeAValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Save Modification Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveModification}
                  className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  <span>Aplicar y Guardar Modificación</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AGREGAR FILAS O TARIFAS */}
          {activeTab === 'add' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setAddMode('ROW')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    addMode === 'ROW' ? 'bg-blue-500 text-white shadow' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  ➕ Añadir Fila Individual
                </button>
                <button
                  onClick={() => setAddMode('BLOCK')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    addMode === 'BLOCK' ? 'bg-purple-500 text-white shadow' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  ➕ Añadir Bloque de Tarifa Completo (56 EESS)
                </button>
              </div>

              {addMode === 'ROW' ? (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-blue-300">Nueva Fila de Exportación</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Estación:
                      </label>
                      <select
                        value={newRowStationId}
                        onChange={(e) => setNewRowStationId(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      >
                        {importStations.map((s) => (
                          <option key={s.id} value={s.id}>{s.id} — {s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Tarifa:
                      </label>
                      <input
                        type="text"
                        value={newRowTariff}
                        onChange={(e) => setNewRowTariff(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Producto:
                      </label>
                      <select
                        value={newRowProd}
                        onChange={(e) => setNewRowProd(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      >
                        <option value={1}>1 (GOA)</option>
                        <option value={2}>2 (Gasolina)</option>
                        <option value={5}>5 (Gasóleo B)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        PVP Con IVA (€):
                      </label>
                      <input
                        type="text"
                        value={newRowPvp}
                        onChange={(e) => setNewRowPvp(e.target.value)}
                        placeholder="1.800"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Fecha Inicial:
                      </label>
                      <input
                        type="text"
                        value={newRowInitialDate}
                        onChange={(e) => setNewRowInitialDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Fecha Final:
                      </label>
                      <input
                        type="text"
                        value={newRowFinalDate}
                        onChange={(e) => setNewRowFinalDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Pago:
                      </label>
                      <select
                        value={newRowPago}
                        onChange={(e) => setNewRowPago(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      >
                        <option value="MENSUAL">MENSUAL</option>
                        <option value="PREPAGO">PREPAGO</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Col A:
                      </label>
                      <input
                        type="number"
                        value={newRowCodeA}
                        onChange={(e) => setNewRowCodeA(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleCreateNewRow}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold transition-all shadow"
                    >
                      <Plus className="h-4 w-4" />
                      <span>➕ Añadir Fila a la Exportación</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-purple-300">Nuevo Bloque de Tarifa Completo (56 EESS)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Nombre de la Tarifa:
                      </label>
                      <input
                        type="text"
                        value={newBlockName}
                        onChange={(e) => setNewBlockName(e.target.value)}
                        placeholder="Ej: TARIFA FLOTA VIP"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Código Columna A (Col A):
                      </label>
                      <input
                        type="number"
                        value={newBlockCodeA}
                        onChange={(e) => setNewBlockCodeA(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Margen Comercial Inicial (+ €/L):
                      </label>
                      <input
                        type="text"
                        value={newBlockMarkup}
                        onChange={(e) => setNewBlockMarkup(e.target.value)}
                        placeholder="0.024"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Tipo de Pago:
                      </label>
                      <select
                        value={newBlockPago}
                        onChange={(e) => setNewBlockPago(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      >
                        <option value="MENSUAL">MENSUAL</option>
                        <option value="PREPAGO">PREPAGO</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Producto:
                      </label>
                      <select
                        value={newBlockProd}
                        onChange={(e) => setNewBlockProd(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      >
                        <option value={1}>1 (GOA)</option>
                        <option value={2}>2 (Gasolina)</option>
                        <option value={5}>5 (Gasóleo B)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleCreateNewTariffBlock}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white rounded-xl text-xs font-bold transition-all shadow"
                    >
                      <Layers className="h-4 w-4" />
                      <span>➕ Generar e Insertar Bloque Completo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUITAR DATOS Y RESTABLECER */}
          {activeTab === 'delete' && (
            <div className="space-y-6">
              
              {/* Delete Tariff Block */}
              <div className="bg-slate-950/80 border border-red-500/20 rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-2 text-red-400 font-bold text-sm">
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar un Bloque de Tarifa Completo</span>
                </div>
                <p className="text-xs text-slate-400">
                  Selecciona una tarifa para remover todas sus filas del archivo exportable.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={tariffToDelete}
                    onChange={(e) => setTariffToDelete(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none max-w-sm"
                  >
                    {availableTariffs.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleDeleteTariff}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Eliminar Bloque Seleccionado</span>
                  </button>
                </div>
              </div>

              {/* Reset All to Sabana Defaults */}
              <div className="bg-slate-950/80 border border-amber-500/20 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                  <RotateCcw className="h-4 w-4" />
                  <span>Restablecer a Valores Predeterminados de Sábana de Precios</span>
                </div>
                <p className="text-xs text-slate-400">
                  Esta acción eliminará todas las sobreescrituras, filas y tarifas añadidas en EFI Export y volverá a cargar los precios oficiales calculados desde la ventana Sábana de Precios.
                </p>

                <button
                  onClick={() => {
                    if (confirm('¿Deseas restablecer todas las modificaciones y volver al 100% a los datos de la Sábana de Precios?')) {
                      onResetAll();
                      setSuccessMsg('Todos los datos han sido restablecidos a los valores de la Sábana de Precios.');
                      setTimeout(() => setSuccessMsg(null), 3000);
                    }
                  }}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Restablecer Todo a Valores de Sábana</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 4: MODO SEÑALAR EN VENTANAS */}
          {activeTab === 'picker' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-200 flex items-center space-x-2">
                <MousePointerClick className="h-4 w-4 text-purple-400 shrink-0" />
                <span>
                  Haz clic en cualquier valor para capturarlo automáticamente como precio para la estación{' '}
                  <strong className="text-white">{currentStation.name}</strong> en <strong className="text-white">{selectedTariff}</strong>.
                </span>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setPickerSubTab('sabana')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    pickerSubTab === 'sabana' ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  📊 Sábana de Precios
                </button>
                <button
                  onClick={() => setPickerSubTab('compras')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    pickerSubTab === 'compras' ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  🛒 Compras
                </button>
                <button
                  onClick={() => setPickerSubTab('special')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    pickerSubTab === 'special' ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  ⭐ Tarifas Especiales
                </button>
                <button
                  onClick={() => setPickerSubTab('postes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    pickerSubTab === 'postes' ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  ⛽ Postes
                </button>
              </div>

              {/* Subtab Content: Sabana */}
              {pickerSubTab === 'sabana' && (
                <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 sticky top-0 text-[11px] text-slate-400 font-mono">
                      <tr>
                        <th className="py-2 px-3">Estación</th>
                        <th className="py-2 px-2 text-right">T12 Con IVA</th>
                        <th className="py-2 px-2 text-right">T18 Con IVA</th>
                        <th className="py-2 px-2 text-right">T24 Con IVA</th>
                        <th className="py-2 px-2 text-right">T36 Con IVA</th>
                        <th className="py-2 px-2 text-right">T60 Con IVA</th>
                        {sabanaTariffsData.cStd.map((c) => (
                          <th key={c.id || c.name} className="py-2 px-2 text-right text-purple-300 whitespace-nowrap">
                            {c.name} Con IVA
                          </th>
                        ))}
                        {sabanaTariffsData.cSpec.map((c) => (
                          <th key={c.id || c.name} className="py-2 px-2 text-right text-amber-300 whitespace-nowrap">
                            {c.name} Con IVA
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {importStations.slice(0, 30).map((st) => {
                        const v12 = resolveSourceValue('SABANA_T12', st.name);
                        const v18 = resolveSourceValue('SABANA_T18', st.name);
                        const v24 = resolveSourceValue('SABANA_T24', st.name);
                        const v36 = resolveSourceValue('SABANA_T36', st.name);
                        const v60 = resolveSourceValue('SABANA_T60', st.name);

                        const customStdValues = sabanaTariffsData.cStd.map((c) => {
                          const sid = `SABANA_CUSTOM_STD_${(c.id || c.name).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
                          return { name: c.name, val: resolveSourceValue(sid, st.name) };
                        });

                        const customSpecValues = sabanaTariffsData.cSpec.map((c) => {
                          const sid = `SABANA_CUSTOM_SPEC_${(c.id || c.name).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
                          return { name: c.name, val: resolveSourceValue(sid, st.name) };
                        });

                        return (
                          <tr key={st.id} className="hover:bg-slate-800/40">
                            <td className="py-1.5 px-3 font-bold text-slate-300 font-sans">{st.name}</td>
                            {[
                              { label: 'T12', val: v12 },
                              { label: 'T18', val: v18 },
                              { label: 'T24', val: v24 },
                              { label: 'T36', val: v36 },
                              { label: 'T60', val: v60 },
                              ...customStdValues.map((c) => ({ label: c.name, val: c.val })),
                              ...customSpecValues.map((c) => ({ label: c.name, val: c.val })),
                            ].map((col, idx) => (
                              <td
                                key={idx}
                                onClick={() => {
                                  setManualPriceConIva(col.val.toFixed(3).replace('.', ','));
                                  setEditPriceMode('DIRECT');
                                  setActiveTab('modify');
                                  setSuccessMsg(`Precio de ${col.label} capturado: ${col.val.toFixed(3).replace('.', ',')} €`);
                                  setTimeout(() => setSuccessMsg(null), 2500);
                                }}
                                className="py-1.5 px-2 text-right text-emerald-400 cursor-pointer hover:bg-purple-500/20 hover:scale-105 transition-all font-bold whitespace-nowrap"
                              >
                                {col.val.toFixed(3).replace('.', ',')} €
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Subtab Content: Compras */}
              {pickerSubTab === 'compras' && (
                <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 sticky top-0 text-[11px] text-slate-400 font-mono">
                      <tr>
                        <th className="py-2 px-3">Estación</th>
                        <th className="py-2 px-2 text-right">P. Venta Sugerido (Con IVA)</th>
                        <th className="py-2 px-2 text-right">P. Compra Medio (Con IVA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {importStations.slice(0, 30).map((st) => {
                        const vs = resolveSourceValue('COMPRAS_VENTA_SUGERIDO', st.name);
                        const vc = resolveSourceValue('COMPRAS_PRECIO_COMPRA', st.name);
                        return (
                          <tr key={st.id} className="hover:bg-slate-800/40">
                            <td className="py-1.5 px-3 font-bold text-slate-300 font-sans">{st.name}</td>
                            <td
                              onClick={() => {
                                setManualPriceConIva(vs.toFixed(3).replace('.', ','));
                                setEditPriceMode('DIRECT');
                                setActiveTab('modify');
                                setSuccessMsg(`P. Venta Sugerido capturado: ${vs.toFixed(3).replace('.', ',')} €`);
                                setTimeout(() => setSuccessMsg(null), 2500);
                              }}
                              className="py-1.5 px-2 text-right text-emerald-400 cursor-pointer hover:bg-purple-500/20 font-bold"
                            >
                              {vs.toFixed(3).replace('.', ',')} €
                            </td>
                            <td
                              onClick={() => {
                                setManualPriceConIva(vc.toFixed(3).replace('.', ','));
                                setEditPriceMode('DIRECT');
                                setActiveTab('modify');
                                setSuccessMsg(`P. Compra capturado: ${vc.toFixed(3).replace('.', ',')} €`);
                                setTimeout(() => setSuccessMsg(null), 2500);
                              }}
                              className="py-1.5 px-2 text-right text-blue-400 cursor-pointer hover:bg-purple-500/20 font-bold"
                            >
                              {vc.toFixed(3).replace('.', ',')} €
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Subtab Content: Tarifas Especiales */}
              {pickerSubTab === 'special' && (
                <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 sticky top-0 text-[11px] text-slate-400 font-mono">
                      <tr>
                        <th className="py-2 px-3">Estación</th>
                        <th className="py-2 px-2 text-right">Precio Referencia Con IVA</th>
                        <th className="py-2 px-2 text-right">Precio Actual Con IVA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {importStations.slice(0, 30).map((st) => {
                        const vr = resolveSourceValue('ESPECIAL_REF', st.name);
                        const va = resolveSourceValue('ESPECIAL_ACTUAL', st.name);
                        return (
                          <tr key={st.id} className="hover:bg-slate-800/40">
                            <td className="py-1.5 px-3 font-bold text-slate-300 font-sans">{st.name}</td>
                            <td
                              onClick={() => {
                                setManualPriceConIva(vr.toFixed(3).replace('.', ','));
                                setEditPriceMode('DIRECT');
                                setActiveTab('modify');
                                setSuccessMsg(`Precio Referencia capturado: ${vr.toFixed(3).replace('.', ',')} €`);
                                setTimeout(() => setSuccessMsg(null), 2500);
                              }}
                              className="py-1.5 px-2 text-right text-amber-400 cursor-pointer hover:bg-purple-500/20 font-bold"
                            >
                              {vr.toFixed(3).replace('.', ',')} €
                            </td>
                            <td
                              onClick={() => {
                                setManualPriceConIva(va.toFixed(3).replace('.', ','));
                                setEditPriceMode('DIRECT');
                                setActiveTab('modify');
                                setSuccessMsg(`Precio Actual capturado: ${va.toFixed(3).replace('.', ',')} €`);
                                setTimeout(() => setSuccessMsg(null), 2500);
                              }}
                              className="py-1.5 px-2 text-right text-cyan-400 cursor-pointer hover:bg-purple-500/20 font-bold"
                            >
                              {va.toFixed(3).replace('.', ',')} €
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Subtab Content: Postes */}
              {pickerSubTab === 'postes' && (
                <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 sticky top-0 text-[11px] text-slate-400 font-mono">
                      <tr>
                        <th className="py-2 px-3">Estación</th>
                        <th className="py-2 px-2 text-right">PVP Poste GOA</th>
                        <th className="py-2 px-2 text-right">PVP Poste Gasolina 95</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {importStations.slice(0, 30).map((st) => {
                        const vpGoa = resolveSourceValue('POSTES_GOA', st.name);
                        const vpGas = resolveSourceValue('POSTES_GAS95', st.name);
                        return (
                          <tr key={st.id} className="hover:bg-slate-800/40">
                            <td className="py-1.5 px-3 font-bold text-slate-300 font-sans">{st.name}</td>
                            <td
                              onClick={() => {
                                setManualPriceConIva(vpGoa.toFixed(3).replace('.', ','));
                                setEditPriceMode('DIRECT');
                                setActiveTab('modify');
                                setSuccessMsg(`PVP Poste GOA capturado: ${vpGoa.toFixed(3).replace('.', ',')} €`);
                                setTimeout(() => setSuccessMsg(null), 2500);
                              }}
                              className="py-1.5 px-2 text-right text-emerald-400 cursor-pointer hover:bg-purple-500/20 font-bold"
                            >
                              {vpGoa.toFixed(3).replace('.', ',')} €
                            </td>
                            <td
                              onClick={() => {
                                setManualPriceConIva(vpGas.toFixed(3).replace('.', ','));
                                setEditPriceMode('DIRECT');
                                setActiveTab('modify');
                                setSuccessMsg(`PVP Poste Gasolina 95 capturado: ${vpGas.toFixed(3).replace('.', ',')} €`);
                                setTimeout(() => setSuccessMsg(null), 2500);
                              }}
                              className="py-1.5 px-2 text-right text-amber-400 cursor-pointer hover:bg-purple-500/20 font-bold"
                            >
                              {vpGas.toFixed(3).replace('.', ',')} €
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/50">
          <span className="text-[11px] text-slate-500">
            Total de Filas Actuales en Vista Previa: <strong className="text-slate-300 font-mono">{previewRows.length - 1}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
}
