'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Plus, PlusCircle, Sliders, Check, RotateCcw, Trash2, ArrowRight,
  FileSpreadsheet, Fuel, Layers, Star, Table, MousePointerClick,
  AlertCircle, Sparkles, CheckCircle2, ChevronRight, Info
} from 'lucide-react';

// Fallback defensivo para evitar 'plusCircle is not defined' bajo cualquier circunstancia
const plusCircle = PlusCircle;
import { PROPIAS_STATIONS, COLABORADORA_STATIONS } from '@/lib/dataSeed';
import { getAllStations } from '@/lib/stationsService';

export interface SabanaTariffDef {
  id: string;
  name: string;
  colTitle?: string;
  markup: number;
  blockType: 'standard' | 'special';
  specialBlockId?: string;
  isCustom?: boolean;
  description?: string;
}

export interface SabanaSourceConfig {
  sourceType: string;
  markupDiff?: number;
  manualPriceSinIva?: number;
  sourceLabel?: string;
  windowName?: string;
}

interface SabanaTariffManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTariffs: SabanaTariffDef[];
  onCreateTariff: (tariff: SabanaTariffDef, initialSource?: SabanaSourceConfig) => void;
  onUpdateTariff: (tariffId: string, updates: Partial<SabanaTariffDef>) => void;
  onDeleteTariff: (tariffId: string) => void;
  deletedTariffs?: SabanaTariffDef[];
  onRestoreTariff?: (tariffId: string) => void;
  sourcesMapping: Record<string, SabanaSourceConfig>;
  onSaveSourceMapping: (mapping: Record<string, SabanaSourceConfig>) => void;
  selectedDate: string;
  comprasPurchases: Record<string, { sale?: string; buy?: string; min?: string; avg?: string }>;
  specialRates: any[];
  postesData: any;
  getStationBasePrice: (stName: string, isPropia?: boolean) => number;
  getSpecialRateRefPrice: (stName: string) => number;
  getSpecialRateActualPrice: (stName: string) => number;
  initialSelectedTariffId?: string;
}

export const PRESET_DATA_SOURCES = [
  {
    id: 'DEFAULT',
    window: 'Predeterminado',
    label: 'Cálculo Predeterminado de la Sábana',
    description: 'P. Venta Sugerido de Compras + Margen de la tarifa',
  },
  {
    id: 'COMPRAS_VENTA_SUGERIDO',
    window: 'Compras',
    label: 'Compras — P. Venta Sugerido Gasóleo A',
    description: 'Precio de venta sugerido oficial para la estación en Compras',
  },
  {
    id: 'COMPRAS_BRONCO',
    window: 'Compras',
    label: 'Compras — Gasolina Bronco',
    description: 'Precio asignado de Gasolina Bronco en Compras',
  },
  {
    id: 'COMPRAS_MEDIO',
    window: 'Compras',
    label: 'Compras — Precio Compra Medio',
    description: 'Promedio ponderado de compra para la estación',
  },
  {
    id: 'COMPRAS_MINIMO',
    window: 'Compras',
    label: 'Compras — Proveedor Más Barato (Mínimo)',
    description: 'Costo más bajo de los operadores disponibles',
  },
  {
    id: 'COMPRAS_ESPECIAL_REF',
    window: 'Tarifas Especiales',
    label: 'Tarifas Especiales — Precio Referencia (B50:F82)',
    description: 'Columna Precio Referencia de la tabla especial de compras',
  },
  {
    id: 'COMPRAS_ESPECIAL_ACTUAL',
    window: 'Tarifas Especiales',
    label: 'Tarifas Especiales — Precio Actual / Especial (B50:F82)',
    description: 'Columna Precio Actual / Especial de la tabla especial de compras',
  },
  {
    id: 'POSTE_GOA',
    window: 'Postes',
    label: 'Postes — Precio Poste Gasóleo A',
    description: 'Precio visible de poste cargado para Gasóleo A',
  },
  {
    id: 'POSTE_G95',
    window: 'Postes',
    label: 'Postes — Precio Poste Gasolina 95',
    description: 'Precio visible de poste cargado para Gasolina 95',
  },
  {
    id: 'SABANA_TAR_12',
    window: 'Sábana',
    label: 'Sábana — Tarifa 12 Sin IVA',
    description: 'Precio resultante de la columna Tarifa 12 de la Sábana',
  },
  {
    id: 'SABANA_TAR_18',
    window: 'Sábana',
    label: 'Sábana — Tarifa 18 Sin IVA',
    description: 'Precio resultante de la columna Tarifa 18 de la Sábana',
  },
  {
    id: 'SABANA_TAR_24',
    window: 'Sábana',
    label: 'Sábana — Tarifa 24 Sin IVA',
    description: 'Precio resultante de la columna Tarifa 24 de la Sábana',
  },
  {
    id: 'SABANA_TAR_36',
    window: 'Sábana',
    label: 'Sábana — Tarifa 36 Sin IVA',
    description: 'Precio resultante de la columna Tarifa 36 de la Sábana',
  },
  {
    id: 'SABANA_TAR_40',
    window: 'Sábana',
    label: 'Sábana — Tarifa 40 Sin IVA',
    description: 'Precio resultante de la columna Tarifa 40 de la Sábana',
  },
  {
    id: 'SABANA_TAR_42',
    window: 'Sábana',
    label: 'Sábana — Tarifa 42 Sin IVA',
    description: 'Precio resultante de la columna Tarifa 42 de la Sábana',
  },
  {
    id: 'SABANA_TAR_47',
    window: 'Sábana',
    label: 'Sábana — Tarifa 47 Sin IVA',
    description: 'Precio resultante de la columna Tarifa 47 de la Sábana',
  },
  {
    id: 'SABANA_TAR_50',
    window: 'Sábana',
    label: 'Sábana — Tarifa 50 Sin IVA',
    description: 'Precio resultante de la columna Tarifa 50 de la Sábana',
  },
  {
    id: 'SABANA_TAR_60',
    window: 'Sábana',
    label: 'Sábana — Tarifa 60 Sin IVA',
    description: 'Precio resultante de la columna Tarifa 60 de la Sábana',
  },
  {
    id: 'SABANA_ECOTRANS',
    window: 'Sábana',
    label: 'Sábana — Tarifa ECOTRANS Sin IVA',
    description: 'Precio resultante de la columna Tarifa ECOTRANS de la Sábana',
  },
  {
    id: 'MANUAL',
    window: 'Manual',
    label: 'Precio Fijo / Manual',
    description: 'Ingresar una cifra fija directa en €/L sin IVA',
  },
];

export function SabanaTariffManagerModal({
  isOpen,
  onClose,
  allTariffs,
  onCreateTariff,
  onUpdateTariff,
  onDeleteTariff,
  deletedTariffs = [],
  onRestoreTariff,
  sourcesMapping,
  onSaveSourceMapping,
  selectedDate,
  comprasPurchases,
  specialRates,
  postesData,
  getStationBasePrice,
  getSpecialRateRefPrice,
  getSpecialRateActualPrice,
  initialSelectedTariffId,
}: SabanaTariffManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'delete' | 'picker'>('manage');
  const [deleteSearchQuery, setDeleteSearchQuery] = useState('');
  const [selectedTariffId, setSelectedTariffId] = useState<string>(
    initialSelectedTariffId || allTariffs[0]?.id || '12'
  );

  // Formulario para Crear Nueva Tarifa
  const [newTariffName, setNewTariffName] = useState('');
  const [newTariffBlockType, setNewTariffBlockType] = useState<'standard' | 'special'>('standard');
  const [newTariffMarkup, setNewTariffMarkup] = useState('0,050');
  const [newTariffSource, setNewTariffSource] = useState('COMPRAS_VENTA_SUGERIDO');
  const [newTariffDescription, setNewTariffDescription] = useState('');

  // Formulario para Modificar Tarifa Seleccionada
  const activeTariff = useMemo(() => {
    return allTariffs.find((t) => t.id === selectedTariffId) || allTariffs[0];
  }, [allTariffs, selectedTariffId]);

  const [editName, setEditName] = useState('');
  const [editMarkup, setEditMarkup] = useState('0,036');
  const [editTargetStation, setEditTargetStation] = useState('__ALL__');
  const [editSelectedSource, setEditSelectedSource] = useState('DEFAULT');
  const [editMarkupDiff, setEditMarkupDiff] = useState('0,000');
  const [editManualPrice, setEditManualPrice] = useState('1,200');

  // Estado del Modo Señalar en Ventana
  const [pickerWindowTab, setPickerWindowTab] = useState<'sabana' | 'compras' | 'compras_especiales' | 'postes'>('sabana');
  const [selectedPointingCell, setSelectedPointingCell] = useState<{
    windowName: string;
    sourceId: string;
    label: string;
    sampleStation?: string;
    sampleValueSinIva?: number;
    sampleValueConIva?: number;
  } | null>(null);

  // Actualizar estado del formulario cuando cambia la tarifa seleccionada
  useEffect(() => {
    if (activeTariff) {
      setEditName(activeTariff.name);
      setEditMarkup((typeof activeTariff.markup === 'number' ? activeTariff.markup : 0).toFixed(3).replace('.', ','));
      
      const defaultMapping = sourcesMapping[`${activeTariff.name}::__DEFAULT__`];
      if (defaultMapping) {
        setEditSelectedSource(defaultMapping.sourceType || 'DEFAULT');
        setEditMarkupDiff((defaultMapping.markupDiff ?? 0).toFixed(3).replace('.', ','));
        setEditManualPrice((defaultMapping.manualPriceSinIva ?? 1.200).toFixed(3).replace('.', ','));
      } else {
        setEditSelectedSource('DEFAULT');
        setEditMarkupDiff('0,000');
        setEditManualPrice('1,200');
      }
    }
  }, [activeTariff, sourcesMapping]);

  const allStations = useMemo(() => {
    return getAllStations().map((s) => ({ name: s.name, type: s.type }));
  }, [isOpen]);

  if (!isOpen) return null;

  // Manejar creación de nueva tarifa
  const handleCreateTariffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTariffName.trim()) return;

    const formattedName = newTariffName.trim().toUpperCase();
    const parsedMarkup = parseFloat(newTariffMarkup.replace(',', '.')) || 0.0500;
    const newId = formattedName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const created: SabanaTariffDef = {
      id: newId,
      name: formattedName,
      colTitle: `${formattedName} SIN IVA`,
      markup: parsedMarkup,
      blockType: newTariffBlockType,
      specialBlockId: newTariffBlockType === 'special' ? 'custom_specials' : undefined,
      isCustom: true,
      description: newTariffDescription.trim() || `Tarifa ${formattedName}`,
    };

    const initialSourceConfig: SabanaSourceConfig = {
      sourceType: newTariffSource,
      markupDiff: parsedMarkup,
      sourceLabel: PRESET_DATA_SOURCES.find((s) => s.id === newTariffSource)?.label,
      windowName: PRESET_DATA_SOURCES.find((s) => s.id === newTariffSource)?.window,
    };

    onCreateTariff(created, initialSourceConfig);
    setSelectedTariffId(created.id);
    setActiveTab('manage');
    setNewTariffName('');
    setNewTariffDescription('');
  };

  // Guardar modificaciones de la tarifa seleccionada
  const handleSaveTariffUpdates = () => {
    if (!activeTariff) return;

    const parsedMarkup = parseFloat(editMarkup.replace(',', '.')) || activeTariff.markup;
    const cleanName = editName.trim().toUpperCase() || activeTariff.name;

    onUpdateTariff(activeTariff.id, {
      name: cleanName,
      colTitle: `${cleanName} SIN IVA`,
      markup: parsedMarkup,
    });

    // Guardar origen de datos para la estación seleccionada o para todas
    const parsedDiff = parseFloat(editMarkupDiff.replace(',', '.')) || 0;
    const parsedManual = parseFloat(editManualPrice.replace(',', '.')) || 1.200;

    const updated = { ...sourcesMapping };
    const sourceLabel = PRESET_DATA_SOURCES.find((s) => s.id === editSelectedSource)?.label || editSelectedSource;
    const windowName = PRESET_DATA_SOURCES.find((s) => s.id === editSelectedSource)?.window || 'Personalizado';

    if (editTargetStation === '__ALL__') {
      // Aplicar masivamente a todas las estaciones de esta tarifa
      allStations.forEach((st) => {
        const key = `${cleanName}::${st.name}`;
        const clean = st.name.toUpperCase().replace(/^ES\s+/, '').trim();
        updated[key] = {
          sourceType: editSelectedSource,
          markupDiff: parsedDiff,
          manualPriceSinIva: parsedManual,
          sourceLabel,
          windowName,
        };
        updated[`${cleanName}::${clean}`] = {
          sourceType: editSelectedSource,
          markupDiff: parsedDiff,
          manualPriceSinIva: parsedManual,
          sourceLabel,
          windowName,
        };
      });
      // Clave comodín por defecto para la tarifa
      updated[`${cleanName}::__DEFAULT__`] = {
        sourceType: editSelectedSource,
        markupDiff: parsedDiff,
        manualPriceSinIva: parsedManual,
        sourceLabel,
        windowName,
      };
    } else {
      // Aplicar solo a la estación específica
      const key = `${cleanName}::${editTargetStation}`;
      const clean = editTargetStation.toUpperCase().replace(/^ES\s+/, '').trim();
      updated[key] = {
        sourceType: editSelectedSource,
        markupDiff: parsedDiff,
        manualPriceSinIva: parsedManual,
        sourceLabel,
        windowName,
      };
      updated[`${cleanName}::${clean}`] = {
        sourceType: editSelectedSource,
        markupDiff: parsedDiff,
        manualPriceSinIva: parsedManual,
        sourceLabel,
        windowName,
      };
    }

    onSaveSourceMapping(updated);
  };

  // Aplicar dato señalado con el picker
  const handleApplyPointingCell = () => {
    if (!selectedPointingCell || !activeTariff) return;

    const updated = { ...sourcesMapping };
    const cleanTariff = activeTariff.name;

    if (editTargetStation === '__ALL__') {
      allStations.forEach((st) => {
        const key = `${cleanTariff}::${st.name}`;
        const clean = st.name.toUpperCase().replace(/^ES\s+/, '').trim();
        updated[key] = {
          sourceType: selectedPointingCell.sourceId,
          sourceLabel: selectedPointingCell.label,
          windowName: selectedPointingCell.windowName,
        };
        updated[`${cleanTariff}::${clean}`] = {
          sourceType: selectedPointingCell.sourceId,
          sourceLabel: selectedPointingCell.label,
          windowName: selectedPointingCell.windowName,
        };
      });
      updated[`${cleanTariff}::__DEFAULT__`] = {
        sourceType: selectedPointingCell.sourceId,
        sourceLabel: selectedPointingCell.label,
        windowName: selectedPointingCell.windowName,
      };
    } else {
      const key = `${cleanTariff}::${editTargetStation}`;
      const clean = editTargetStation.toUpperCase().replace(/^ES\s+/, '').trim();
      updated[key] = {
        sourceType: selectedPointingCell.sourceId,
        sourceLabel: selectedPointingCell.label,
        windowName: selectedPointingCell.windowName,
      };
      updated[`${cleanTariff}::${clean}`] = {
        sourceType: selectedPointingCell.sourceId,
        sourceLabel: selectedPointingCell.label,
        windowName: selectedPointingCell.windowName,
      };
    }

    onSaveSourceMapping(updated);
    setEditSelectedSource(selectedPointingCell.sourceId);
    setActiveTab('manage');
  };

  // Restablecer orígenes de la tarifa actual
  const handleResetTariffSources = () => {
    if (!activeTariff) return;
    const updated = { ...sourcesMapping };
    const prefix = `${activeTariff.name}::`;
    Object.keys(updated).forEach((k) => {
      if (k.startsWith(prefix)) {
        delete updated[k];
      }
    });
    onSaveSourceMapping(updated);
    setEditSelectedSource('DEFAULT');
    setEditMarkupDiff('0,000');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-4xl w-full h-[90vh] max-h-[850px] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                Gestor de Tarifas & Origen de Datos (Sábana de Precios)
              </h3>
              <p className="text-xs text-amber-300 font-medium">
                Crea nuevas tarifas, modifica existentes y apunta a datos de Compras, Postes o Sábana
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/50 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all shrink-0 ${
              activeTab === 'manage'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>1. Modificar Tarifa y Fuentes</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all shrink-0 ${
              activeTab === 'create'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>2. Crear Nueva Tarifa</span>
          </button>

          <button
            onClick={() => setActiveTab('delete')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all shrink-0 ${
              activeTab === 'delete'
                ? 'border-rose-400 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trash2 className="h-4 w-4 text-rose-400" />
            <span>3. Eliminar Tarifa</span>
          </button>

          <button
            onClick={() => setActiveTab('picker')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all shrink-0 ${
              activeTab === 'picker'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MousePointerClick className="h-4 w-4" />
            <span>4. Señalar en Ventana</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: MODIFICAR TARIFA EXISTENTE */}
          {activeTab === 'manage' && (
            <div className="space-y-6">
              {/* Selector de la Tarifa a Gestionar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Selecciona la Tarifa a Configurar o Modificar:
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTariffId}
                      onChange={(e) => setSelectedTariffId(e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/40 text-amber-300 font-extrabold text-sm rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                    >
                      <optgroup label="── TARIFAS ESTÁNDAR ──">
                        {allTariffs
                          .filter((t) => t.blockType === 'standard')
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} (Margen: +{t.markup.toFixed(3).replace('.', ',')}) {t.isCustom ? '★ Creada por Usuario' : ''}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="── TARIFAS ESPECIALES ──">
                        {allTariffs
                          .filter((t) => t.blockType === 'special')
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} (Margen: +{t.markup.toFixed(3).replace('.', ',')}) {t.isCustom ? '★ Creada por Usuario' : ''}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                {activeTariff && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Estás seguro de que deseas eliminar la tarifa "${activeTariff.name}"?`)) {
                        onDeleteTariff(activeTariff.id);
                        const remaining = allTariffs.filter((t) => t.id !== activeTariff.id);
                        if (remaining.length > 0) {
                          setSelectedTariffId(remaining[0].id);
                        }
                      }
                    }}
                    className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 self-end sm:self-center cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                    title={`Eliminar tarifa ${activeTariff.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-rose-400" />
                    <span>Eliminar Tarifa</span>
                  </button>
                )}
              </div>

              {/* Ajustes Generales de la Tarifa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Sliders className="h-4 w-4 text-amber-400" />
                    <span>1. Nombre y Margen Base</span>
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Nombre de la Tarifa:</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ej. TARIFA 36, TARIFA 80..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Margen / Diferencial Predeterminado (+ €/L):
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editMarkup}
                      onChange={(e) => setEditMarkup(e.target.value.replace('.', ','))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[10px] text-slate-400">
                      Ejemplos: <code className="text-amber-300 font-mono">0,036</code> (Tarifa 36), <code className="text-amber-300 font-mono">0,080</code> (Tarifa 60).
                    </p>
                  </div>
                </div>

                {/* Configuración del Origen de Datos */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Fuel className="h-4 w-4 text-emerald-400" />
                    <span>2. Origen de Datos para Obtener Nuevos Valores</span>
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      ¿A qué estaciones aplicar este origen?
                    </label>
                    <select
                      value={editTargetStation}
                      onChange={(e) => setEditTargetStation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none"
                    >
                      <option value="__ALL__">★ TODAS LAS ESTACIONES (Asignación Masiva)</option>
                      {allStations.map((st) => (
                        <option key={st.name} value={st.name}>
                          {st.name} ({st.type === 'PROPIA' ? 'Propia' : 'Colaboradora'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Selecciona de dónde salen los datos:
                    </label>
                    <select
                      value={editSelectedSource}
                      onChange={(e) => setEditSelectedSource(e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold focus:outline-none cursor-pointer"
                    >
                      {PRESET_DATA_SOURCES.map((src) => (
                        <option key={src.id} value={src.id}>
                          [{src.window}] {src.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editSelectedSource !== 'DEFAULT' && editSelectedSource !== 'MANUAL' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        Diferencial / Margen Adicional sobre el Origen (+/- €/L):
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editMarkupDiff}
                        onChange={(e) => setEditMarkupDiff(e.target.value.replace('.', ','))}
                        placeholder="0,000"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}

                  {editSelectedSource === 'MANUAL' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        Precio Fijo Manual Sin IVA (€/L):
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editManualPrice}
                        onChange={(e) => setEditManualPrice(e.target.value.replace('.', ','))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Botón para Señalar en Ventana */}
              <div className="bg-gradient-to-r from-purple-950/40 via-slate-950 to-purple-950/40 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30">
                    <MousePointerClick className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">¿Prefieres señalar directamente en pantalla?</h5>
                    <p className="text-[11px] text-slate-400">
                      Usa el <strong>Modo Señalar</strong> para hacer clic sobre las celdas de Sábana, Compras o Postes y vincular su valor automáticamente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('picker')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all active:scale-95 shrink-0"
                >
                  Abrir Modo Señalar &rarr;
                </button>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleResetTariffSources}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 text-xs font-bold transition-all flex items-center space-x-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restablecer Orígenes a Predeterminado</span>
                </button>

                <div className="flex items-center space-x-3">
                  {activeTariff && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Estás seguro de que deseas eliminar la tarifa "${activeTariff.name}" de la Sábana de Precios?`)) {
                          onDeleteTariff(activeTariff.id);
                          const remaining = allTariffs.filter((t) => t.id !== activeTariff.id);
                          if (remaining.length > 0) {
                            setSelectedTariffId(remaining[0].id);
                          }
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 hover:border-rose-500/70 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95 shadow-sm"
                      title={`Eliminar tarifa ${activeTariff.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      <span>Eliminar Esta Tarifa</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTariffUpdates}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-2 active:scale-95"
                  >
                    <Check className="h-4 w-4" />
                    <span>Guardar y Aplicar Cambios</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREAR NUEVA TARIFA */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateTariffSubmit} className="space-y-5 max-w-xl mx-auto">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300/90 space-y-1">
                <div className="font-bold text-amber-200 flex items-center space-x-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span>Creación de Nueva Tarifa en la Sábana de Precios</span>
                </div>
                <p className="text-slate-300">
                  La nueva tarifa aparecerá como una columna completa en la Sábana de Precios con sus respectivos cálculos Sin IVA y Con IVA (+21%), descargable en Excel y vinculada en tiempo real.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Nombre de la Nueva Tarifa:</label>
                <input
                  type="text"
                  required
                  value={newTariffName}
                  onChange={(e) => setNewTariffName(e.target.value)}
                  placeholder="Ej. TARIFA 80, TARIFA 100, TARIFA VIP..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Ubicación en la Sábana:</label>
                  <select
                    value={newTariffBlockType}
                    onChange={(e) => setNewTariffBlockType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none"
                  >
                    <option value="standard">Recuadro Superior (Tarifas Estándar)</option>
                    <option value="special">Recuadro Inferior (Tarifas Especiales)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Margen / Diferencial (+ €/L):</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={newTariffMarkup}
                    onChange={(e) => setNewTariffMarkup(e.target.value.replace('.', ','))}
                    placeholder="0,050"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Origen de Datos Inicial:</label>
                <select
                  value={newTariffSource}
                  onChange={(e) => setNewTariffSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-emerald-300 font-bold focus:outline-none cursor-pointer"
                >
                  {PRESET_DATA_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.window}] {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Descripción / Notas (Opcional):</label>
                <input
                  type="text"
                  value={newTariffDescription}
                  onChange={(e) => setNewTariffDescription(e.target.value)}
                  placeholder="Ej. Tarifa acordada para clientes mayoristas o flotas especiales"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('manage')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-2 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear Tarifa y Agregar a Sábana</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ELIMINAR TARIFA */}
          {activeTab === 'delete' && (
            <div className="space-y-6">
              <div className="bg-slate-950 p-4 rounded-2xl border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Eliminación de Tarifas</h4>
                    <p className="text-xs text-slate-400">
                      Elimina cualquier tarifa que no desees visualizar en la Sábana de Precios. Si eliminas una tarifa estándar, podrás restaurarla en cualquier momento.
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    value={deleteSearchQuery}
                    onChange={(e) => setDeleteSearchQuery(e.target.value)}
                    placeholder="Buscar tarifa a eliminar..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 font-medium"
                  />
                </div>
              </div>

              {/* Lista de Tarifas Activas para Eliminar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                  <span>Tarifas Activas en Sábana ({allTariffs.length})</span>
                  <span className="text-[11px] text-slate-500 font-normal">Pulsa "Eliminar Tarifa" para quitarla</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allTariffs
                    .filter((t) => {
                      if (!deleteSearchQuery) return true;
                      const q = deleteSearchQuery.toUpperCase().trim();
                      return t.name.toUpperCase().includes(q) || t.id.toUpperCase().includes(q);
                    })
                    .map((tariff) => {
                      const isStd = tariff.blockType === 'standard';
                      return (
                        <div
                          key={tariff.id}
                          className="bg-slate-950/80 border border-slate-800 hover:border-rose-500/40 p-4 rounded-2xl flex flex-col justify-between space-y-3 transition-all group shadow-sm hover:shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-extrabold text-white group-hover:text-rose-200 transition-colors">
                                  {tariff.name}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase border ${
                                    tariff.isCustom
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : isStd
                                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                      : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                  }`}
                                >
                                  {tariff.isCustom ? 'Personalizada' : isStd ? 'Estándar' : 'Especial'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                                Margen: <strong className="text-amber-300">+{tariff.markup.toFixed(3).replace('.', ',')} €/L</strong>
                              </div>
                              {tariff.description && (
                                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{tariff.description}</p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Estás seguro de que deseas eliminar la tarifa "${tariff.name}" de la Sábana de Precios?`)) {
                                onDeleteTariff(tariff.id);
                                if (selectedTariffId === tariff.id) {
                                  const rem = allTariffs.filter((t) => t.id !== tariff.id);
                                  if (rem.length > 0) setSelectedTariffId(rem[0].id);
                                }
                              }
                            }}
                            className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/60 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 active:scale-95 shadow-sm cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                            <span>Eliminar Tarifa</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Sección de Tarifas Eliminadas / Papelera para Restaurar */}
              {deletedTariffs && deletedTariffs.length > 0 && (
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
                    <RotateCcw className="h-4 w-4 text-emerald-400" />
                    <span>Tarifas Eliminadas ({deletedTariffs.length}) — Puedes restaurarlas en cualquier momento</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {deletedTariffs.map((t) => (
                      <div
                        key={t.id}
                        className="bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-2xl flex items-center justify-between gap-3 opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-300 line-through">{t.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Margen: +{t.markup.toFixed(3).replace('.', ',')} €/L
                          </div>
                        </div>

                        {onRestoreTariff && (
                          <button
                            type="button"
                            onClick={() => onRestoreTariff(t.id)}
                            className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shrink-0 active:scale-95 cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Restaurar Tarifa</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MODO SEÑALAR EN VENTANAS (PICKER) */}
          {activeTab === 'picker' && (
            <div className="space-y-4 flex flex-col min-h-0">
              {/* Barra de Configuración de Señalización */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-end shrink-0">
                <div className="md:col-span-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Tarifa a Configurar:
                  </label>
                  <select
                    value={selectedTariffId}
                    onChange={(e) => setSelectedTariffId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-bold text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    {allTariffs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Estación a la que se aplica:
                  </label>
                  <select
                    value={editTargetStation}
                    onChange={(e) => setEditTargetStation(e.target.value)}
                    className="w-full bg-slate-900 border border-purple-500/60 text-white font-bold text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    <option value="__ALL__">★ TODAS LAS ESTACIONES (Asignación Masiva)</option>
                    {allStations.map((st) => (
                      <option key={st.name} value={st.name}>
                        {st.name} ({st.type === 'PROPIA' ? 'Propia' : 'Colaboradora'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-6">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Ventana donde señalar el dato:
                  </label>
                  <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPickerWindowTab('sabana')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                        pickerWindowTab === 'sabana'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Table className="h-3.5 w-3.5" />
                      <span>Sábana</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPickerWindowTab('compras')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                        pickerWindowTab === 'compras'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Fuel className="h-3.5 w-3.5" />
                      <span>Compras</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPickerWindowTab('compras_especiales')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                        pickerWindowTab === 'compras_especiales'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Star className="h-3.5 w-3.5 text-amber-400" />
                      <span>Tarifas Especiales</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPickerWindowTab('postes')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                        pickerWindowTab === 'postes'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>Postes</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Banner de Celda Señalada */}
              {selectedPointingCell && (
                <div className="p-3 bg-purple-950/70 border border-purple-500/50 rounded-2xl flex items-center justify-between gap-3 shadow-xl shrink-0 animate-in fade-in">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/40 shrink-0">
                      <MousePointerClick className="h-5 w-5" />
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-300 font-bold uppercase text-[10px]">Dato Señalado:</span>
                        <span className="font-extrabold text-white">{selectedPointingCell.label}</span>
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700">
                          {selectedPointingCell.windowName}
                        </span>
                      </div>
                      <div className="text-slate-300 mt-0.5 text-[11px]">
                        Muestra: <strong className="text-amber-300 font-mono">{selectedPointingCell.sampleValueSinIva !== undefined ? selectedPointingCell.sampleValueSinIva.toFixed(3).replace('.', ',') : ''} €</strong> Sin IVA • <strong className="text-emerald-400 font-mono">{selectedPointingCell.sampleValueConIva !== undefined ? selectedPointingCell.sampleValueConIva.toFixed(3).replace('.', ',') : ''} €</strong> Con IVA
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyPointingCell}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/25 transition-all active:scale-95 shrink-0 flex items-center space-x-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>Confirmar y Asignar a {activeTariff?.name}</span>
                  </button>
                </div>
              )}

              {/* Contenido Visual Interactivo según la pestaña de picker seleccionada */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 max-h-[420px] overflow-y-auto">
                {/* 1. SEÑALAR EN SÁBANA */}
                {pickerWindowTab === 'sabana' && (
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-400 font-medium">
                      Haz clic sobre cualquiera de las columnas de la Sábana de Precios para que la tarifa <strong>{activeTariff?.name}</strong> se alimente de ella:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {['12', '18', '24', '36', '40', '42', '47', '50', '60'].map((tarId) => {
                        const sampleBase = getStationBasePrice('UCLES', true);
                        const sampleSin = Number((sampleBase + (parseFloat(tarId) / 1000)).toFixed(3));
                        const sampleCon = Number((sampleSin * 1.21).toFixed(3));
                        const isSelected = selectedPointingCell?.sourceId === `SABANA_TAR_${tarId}`;

                        return (
                          <button
                            key={tarId}
                            type="button"
                            onClick={() => {
                              setSelectedPointingCell({
                                windowName: 'Sábana',
                                sourceId: `SABANA_TAR_${tarId}`,
                                label: `Sábana — Tarifa ${tarId} Sin IVA`,
                                sampleStation: 'UCLES (Muestra)',
                                sampleValueSinIva: sampleSin,
                                sampleValueConIva: sampleCon,
                              });
                            }}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-purple-900/50 border-purple-400 text-white ring-2 ring-purple-500 shadow-md'
                                : 'bg-slate-900 border-slate-800 hover:border-amber-400 text-slate-200'
                            }`}
                          >
                            <div className="font-extrabold text-xs text-amber-300">TARIFA {tarId}</div>
                            <div className="text-[11px] text-slate-400 mt-1 font-mono">
                              ~{sampleSin.toFixed(3).replace('.', ',')} € <span className="text-[9px] text-slate-500">sin IVA</span>
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono">
                              ~{sampleCon.toFixed(3).replace('.', ',')} € <span className="text-[9px] text-slate-500">con IVA</span>
                            </div>
                          </button>
                        );
                      })}

                      {/* Ecotrans */}
                      <button
                        type="button"
                        onClick={() => {
                          const sampleBase = getStationBasePrice('UCLES', true);
                          const sampleSin = Number((sampleBase + 0.05).toFixed(3));
                          const sampleCon = Number((sampleSin * 1.21).toFixed(3));
                          setSelectedPointingCell({
                            windowName: 'Sábana',
                            sourceId: 'SABANA_ECOTRANS',
                            label: 'Sábana — Tarifa ECOTRANS Sin IVA',
                            sampleStation: 'UCLES (Muestra)',
                            sampleValueSinIva: sampleSin,
                            sampleValueConIva: sampleCon,
                          });
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedPointingCell?.sourceId === 'SABANA_ECOTRANS'
                            ? 'bg-purple-900/50 border-purple-400 text-white ring-2 ring-purple-500 shadow-md'
                            : 'bg-slate-900 border-slate-800 hover:border-amber-400 text-slate-200'
                        }`}
                      >
                        <div className="font-extrabold text-xs text-emerald-300">TARIFA ECOTRANS</div>
                        <div className="text-[11px] text-slate-400 mt-1 font-mono">
                          P. Venta + 0.050 €
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. SEÑALAR EN COMPRAS */}
                {pickerWindowTab === 'compras' && (
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-400 font-medium">
                      Haz clic sobre los precios principales de la ventana de Compras:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const sampleSin = getStationBasePrice('UCLES', true);
                          setSelectedPointingCell({
                            windowName: 'Compras',
                            sourceId: 'COMPRAS_VENTA_SUGERIDO',
                            label: 'Compras — P. Venta Sugerido Gasóleo A',
                            sampleStation: 'UCLES (Muestra)',
                            sampleValueSinIva: sampleSin,
                            sampleValueConIva: Number((sampleSin * 1.21).toFixed(3)),
                          });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          selectedPointingCell?.sourceId === 'COMPRAS_VENTA_SUGERIDO'
                            ? 'bg-purple-900/50 border-purple-400 text-white ring-2 ring-purple-500'
                            : 'bg-slate-900 border-slate-800 hover:border-emerald-400 text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs text-emerald-300">P. Venta Sugerido Gasóleo A</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Precio de venta oficial de referencia en Compras</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const sampleSin = 1.265;
                          setSelectedPointingCell({
                            windowName: 'Compras',
                            sourceId: 'COMPRAS_BRONCO',
                            label: 'Compras — Gasolina Bronco',
                            sampleStation: 'Estaciones con Bronco',
                            sampleValueSinIva: sampleSin,
                            sampleValueConIva: Number((sampleSin * 1.21).toFixed(3)),
                          });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          selectedPointingCell?.sourceId === 'COMPRAS_BRONCO'
                            ? 'bg-purple-900/50 border-purple-400 text-white ring-2 ring-purple-500'
                            : 'bg-slate-900 border-slate-800 hover:border-emerald-400 text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs text-amber-300">Gasolina Bronco</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Precios fijados en Compras para Bronco</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const sampleSin = 1.197;
                          setSelectedPointingCell({
                            windowName: 'Compras',
                            sourceId: 'COMPRAS_MEDIO',
                            label: 'Compras — Precio Compra Medio',
                            sampleStation: 'Promedio general',
                            sampleValueSinIva: sampleSin,
                            sampleValueConIva: Number((sampleSin * 1.21).toFixed(3)),
                          });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          selectedPointingCell?.sourceId === 'COMPRAS_MEDIO'
                            ? 'bg-purple-900/50 border-purple-400 text-white ring-2 ring-purple-500'
                            : 'bg-slate-900 border-slate-800 hover:border-emerald-400 text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs text-blue-300">Precio Compra Medio</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Media ponderada de compra de combustible</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const sampleSin = 1.189;
                          setSelectedPointingCell({
                            windowName: 'Compras',
                            sourceId: 'COMPRAS_MINIMO',
                            label: 'Compras — Proveedor Más Barato',
                            sampleStation: 'Mínimo del día',
                            sampleValueSinIva: sampleSin,
                            sampleValueConIva: Number((sampleSin * 1.21).toFixed(3)),
                          });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          selectedPointingCell?.sourceId === 'COMPRAS_MINIMO'
                            ? 'bg-purple-900/50 border-purple-400 text-white ring-2 ring-purple-500'
                            : 'bg-slate-900 border-slate-800 hover:border-emerald-400 text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs text-purple-300">Proveedor Más Barato (Mínimo)</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Costo más económico de los proveedores cargados</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. SEÑALAR EN TARIFAS ESPECIALES */}
                {pickerWindowTab === 'compras_especiales' && (
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-400 font-medium">
                      Haz clic para enlazar con la tabla B50:F82 de Tarifas Especiales en Compras:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const sampleSin = getSpecialRateRefPrice('UCLES');
                          setSelectedPointingCell({
                            windowName: 'Tarifas Especiales',
                            sourceId: 'COMPRAS_ESPECIAL_REF',
                            label: 'Tarifas Especiales — Precio Referencia (B50:F82)',
                            sampleStation: 'UCLES (Muestra)',
                            sampleValueSinIva: sampleSin,
                            sampleValueConIva: Number((sampleSin * 1.21).toFixed(3)),
                          });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          selectedPointingCell?.sourceId === 'COMPRAS_ESPECIAL_REF'
                            ? 'bg-purple-900/50 border-purple-400 text-white ring-2 ring-purple-500'
                            : 'bg-slate-900 border-slate-800 hover:border-amber-400 text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs text-amber-300">Precio Referencia (Compras B50:F82)</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Columna de referencia de convenios (P. Venta Sugerido + 0.008 o modificado)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const sampleSin = getSpecialRateActualPrice('UCLES');
                          setSelectedPointingCell({
                            windowName: 'Tarifas Especiales',
                            sourceId: 'COMPRAS_ESPECIAL_ACTUAL',
                            label: 'Tarifas Especiales — Precio Actual / Especial (B50:F82)',
                            sampleStation: 'UCLES (Muestra)',
                            sampleValueSinIva: sampleSin,
                            sampleValueConIva: Number((sampleSin * 1.21).toFixed(3)),
                          });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          selectedPointingCell?.sourceId === 'COMPRAS_ESPECIAL_ACTUAL'
                            ? 'bg-purple-900/50 border-purple-400 text-white ring-2 ring-purple-500'
                            : 'bg-slate-900 border-slate-800 hover:border-amber-400 text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs text-emerald-300">Precio Actual / Especial (B50:F82)</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Columna de precios asignados directamente a flotas específicas
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. SEÑALAR EN POSTES */}
                {pickerWindowTab === 'postes' && (
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-400 font-medium">
                      Haz clic para enlazar con los precios de poste de las estaciones:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const sampleCon = 1.489;
                          const sampleSin = Number((sampleCon / 1.21).toFixed(3));
                          setSelectedPointingCell({
                            windowName: 'Postes',
                            sourceId: 'POSTE_GOA',
                            label: 'Postes — Precio Poste Gasóleo A',
                            sampleStation: 'Muestra Poste',
                            sampleValueSinIva: sampleSin,
                            sampleValueConIva: sampleCon,
                          });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          selectedPointingCell?.sourceId === 'POSTE_GOA'
                            ? 'bg-purple-900/50 border-purple-400 text-white ring-2 ring-purple-500'
                            : 'bg-slate-900 border-slate-800 hover:border-blue-400 text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs text-blue-300">Poste Gasóleo A</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Precio al público en poste de la estación
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const sampleCon = 1.549;
                          const sampleSin = Number((sampleCon / 1.21).toFixed(3));
                          setSelectedPointingCell({
                            windowName: 'Postes',
                            sourceId: 'POSTE_G95',
                            label: 'Postes — Precio Poste Gasolina 95',
                            sampleStation: 'Muestra Poste',
                            sampleValueSinIva: sampleSin,
                            sampleValueConIva: sampleCon,
                          });
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          selectedPointingCell?.sourceId === 'POSTE_G95'
                            ? 'bg-purple-900/50 border-purple-400 text-white ring-2 ring-purple-500'
                            : 'bg-slate-900 border-slate-800 hover:border-blue-400 text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs text-amber-300">Poste Gasolina 95</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Precio al público en poste para gasolina 95 octanos
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
