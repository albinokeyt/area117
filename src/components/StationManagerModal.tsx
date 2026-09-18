'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Building2, Plus, Edit3, Trash2, RotateCcw, Search,
  CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, Filter,
  DollarSign, MapPin, Fuel, Layers, Save, ArrowLeft
} from 'lucide-react';
import {
  getStationsCatalog,
  createStation,
  updateStation,
  deleteStation,
  resetStationsToDefault,
  CreateStationParams,
  StationsCatalog,
} from '@/lib/stationsService';
import { StationSeed } from '@/lib/dataSeed';

interface StationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'CATALOG' | 'NEW' | 'EDIT';

export function StationManagerModal({ isOpen, onClose }: StationManagerModalProps) {
  const [catalog, setCatalog] = useState<StationsCatalog>(() => getStationsCatalog());
  const [activeTab, setActiveTab] = useState<TabType>('CATALOG');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PROPIA' | 'COLABORADORA_FIJA' | 'COLABORADORA_ESTANDAR'>('ALL');

  // Estado para edición
  const [editingStationName, setEditingStationName] = useState<string | null>(null);

  // Formulario de creación / edición
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'PROPIA' | 'COLABORADORA'>('PROPIA');
  const [formIsFixedColab, setFormIsFixedColab] = useState(false);
  const [formClhName, setFormClhName] = useState('TORREJON');
  const [formPorte, setFormPorte] = useState('0.0050');
  const [formPase, setFormPase] = useState('0.0100');
  const [formFin, setFormFin] = useState('0.0100');
  const [formDefaultPrev, setFormDefaultPrev] = useState('1.2000');
  const [formDefaultCurr, setFormDefaultCurr] = useState('1.2000');
  const [formSuggestedPrice, setFormSuggestedPrice] = useState('1.3200');
  const [formInitialBuyPrice, setFormInitialBuyPrice] = useState('1.2000');
  const [formIsPoste, setFormIsPoste] = useState(true);
  const [formHasGasolina, setFormHasGasolina] = useState(true);
  const [formDefaultGoaPoste, setFormDefaultGoaPoste] = useState('1.749');
  const [formDefaultGasolinaPoste, setFormDefaultGasolinaPoste] = useState('1.749');
  const [formDefaultGainPoste, setFormDefaultGainPoste] = useState('0.250');
  const [formHasAdblue, setFormHasAdblue] = useState(false);
  const [formAdblueBuy, setFormAdblueBuy] = useState('0.4000');
  const [formAdblueSale, setFormAdblueSale] = useState('0.7990');
  const [formImportId, setFormImportId] = useState('');

  // Mensajes y confirmación
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingStationName, setDeletingStationName] = useState<string | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  const refreshCatalog = () => {
    setCatalog(getStationsCatalog());
  };

  useEffect(() => {
    refreshCatalog();
    const handleUpdate = () => refreshCatalog();
    window.addEventListener('efi_stations_updated', handleUpdate);
    return () => window.removeEventListener('efi_stations_updated', handleUpdate);
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormType('PROPIA');
    setFormIsFixedColab(false);
    setFormClhName('TORREJON');
    setFormPorte('0,005');
    setFormPase('0,010');
    setFormFin('0,010');
    setFormDefaultPrev('1,200');
    setFormDefaultCurr('1,200');
    setFormSuggestedPrice('1,320');
    setFormInitialBuyPrice('1,200');
    setFormIsPoste(true);
    setFormHasGasolina(true);
    setFormDefaultGoaPoste('1,749');
    setFormDefaultGasolinaPoste('1,749');
    setFormDefaultGainPoste('0,250');
    setFormHasAdblue(false);
    setFormAdblueBuy('0,400');
    setFormAdblueSale('0,799');
    setFormImportId('');
    setEditingStationName(null);
  };

  const handleStartEdit = (st: StationSeed) => {
    const cost = catalog.costs[st.name] || {
      clhName: 'TORREJON',
      porte: 0.0050,
      pase: 0.0100,
      fin: 0.0100,
      defaultPrev: 1.2000,
      defaultCurr: 1.2000,
    };
    const suggested = catalog.suggestedPrices[st.name] || 1.3200;
    const posteDef = catalog.postesStations.find((p) => p.name.toUpperCase() === st.name.toUpperCase());
    const importDef = catalog.importStations.find((i) => i.name.toUpperCase() === st.name.toUpperCase());
    const adblue = catalog.adblueConfig[st.name];

    setEditingStationName(st.name);
    setFormName(st.name);
    setFormType(st.type);
    setFormIsFixedColab(Boolean(st.isFixedColaboradora));
    setFormClhName(cost.clhName || 'TORREJON');
    setFormPorte(String(cost.porte ?? '0,005').replace('.', ','));
    setFormPase(String(cost.pase ?? '0,010').replace('.', ','));
    setFormFin(String(cost.fin ?? '0,010').replace('.', ','));
    setFormDefaultPrev(String(cost.defaultPrev ?? '1,200').replace('.', ','));
    setFormDefaultCurr(String(cost.defaultCurr ?? '1,200').replace('.', ','));
    setFormSuggestedPrice(String(suggested).replace('.', ','));
    setFormInitialBuyPrice(String(cost.defaultCurr ?? '1,200').replace('.', ','));
    setFormIsPoste(Boolean(posteDef));
    setFormHasGasolina(posteDef ? Boolean(posteDef.hasGasolina) : false);
    setFormDefaultGoaPoste((posteDef?.defaultGoa || '1,749').replace('.', ','));
    setFormDefaultGasolinaPoste((posteDef?.defaultGasolina || '').replace('.', ','));
    setFormDefaultGainPoste((posteDef?.defaultGain || '0,250').replace('.', ','));
    setFormHasAdblue(Boolean(adblue));
    setFormAdblueBuy(adblue ? String(adblue.defaultBuy).replace('.', ',') : '0,400');
    setFormAdblueSale(adblue ? String(adblue.defaultSale).replace('.', ',') : '0,799');
    setFormImportId(importDef ? String(importDef.id) : '');

    setActiveTab('EDIT');
    setStatusMessage(null);
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setStatusMessage({ type: 'error', text: 'El nombre de la estación es obligatorio.' });
      return;
    }

    const payload: CreateStationParams = {
      name: formName.trim().toUpperCase(),
      type: formType,
      isFixedColaboradora: formType === 'COLABORADORA' ? formIsFixedColab : false,
      clhName: formClhName.trim().toUpperCase(),
      porte: parseFloat(formPorte.replace(',', '.')) || 0,
      pase: parseFloat(formPase.replace(',', '.')) || 0,
      fin: parseFloat(formFin.replace(',', '.')) || 0,
      defaultPrev: parseFloat(formDefaultPrev.replace(',', '.')) || 0,
      defaultCurr: parseFloat(formDefaultCurr.replace(',', '.')) || 0,
      suggestedSalePrice: parseFloat(formSuggestedPrice.replace(',', '.')) || 0,
      initialBuyPrice: parseFloat(formInitialBuyPrice.replace(',', '.')) || 0,
      isPoste: formIsPoste,
      hasGasolina: formHasGasolina,
      defaultGoaPoste: formDefaultGoaPoste,
      defaultGasolinaPoste: formDefaultGasolinaPoste,
      defaultGainPoste: formDefaultGainPoste,
      hasAdblue: formHasAdblue,
      adblueBuyPrice: parseFloat(formAdblueBuy.replace(',', '.')) || 0,
      adblueSalePrice: parseFloat(formAdblueSale.replace(',', '.')) || 0,
      importId: formImportId ? parseInt(formImportId) : undefined,
    };

    if (activeTab === 'EDIT' && editingStationName) {
      const res = updateStation(editingStationName, payload);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        refreshCatalog();
        setTimeout(() => {
          resetForm();
          setActiveTab('CATALOG');
          setStatusMessage(null);
        }, 1200);
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } else {
      const res = createStation(payload);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        refreshCatalog();
        setTimeout(() => {
          resetForm();
          setActiveTab('CATALOG');
          setStatusMessage(null);
        }, 1200);
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingStationName) return;
    const res = deleteStation(deletingStationName);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      refreshCatalog();
      setDeletingStationName(null);
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleResetCatalog = () => {
    const res = resetStationsToDefault();
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      refreshCatalog();
      setIsConfirmingReset(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const filteredStations = useMemo(() => {
    const all = [...catalog.propias, ...catalog.colaboradoras];
    return all.filter((st) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = term === '' || st.name.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (filterType === 'PROPIA') return st.type === 'PROPIA';
      if (filterType === 'COLABORADORA_FIJA') return st.type === 'COLABORADORA' && st.isFixedColaboradora;
      if (filterType === 'COLABORADORA_ESTANDAR') return st.type === 'COLABORADORA' && !st.isFixedColaboradora;

      return true;
    });
  }, [catalog, searchTerm, filterType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-white tracking-wide">
                  Gestión Integral de Estaciones de Servicio
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {catalog.propias.length + catalog.colaboradoras.length} Activas
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Al crear, modificar o eliminar una estación, se actualiza automáticamente en Compras, Sábana, Postes, EFI Export y PDFs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setActiveTab('CATALOG');
                resetForm();
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
                activeTab === 'CATALOG'
                  ? 'border-amber-400 text-amber-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Catálogo ({catalog.propias.length + catalog.colaboradoras.length})</span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setActiveTab('NEW');
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
                activeTab === 'NEW'
                  ? 'border-emerald-400 text-emerald-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Estación</span>
            </button>

            {activeTab === 'EDIT' && (
              <button
                className="flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 border-purple-400 text-purple-300 bg-slate-900"
              >
                <Edit3 className="h-4 w-4" />
                <span>Modificando: {editingStationName}</span>
              </button>
            )}
          </div>

          <button
            onClick={() => setIsConfirmingReset(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-slate-800"
            title="Restablecer todas las estaciones al listado oficial inicial"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Restablecer Semilla</span>
          </button>
        </div>

        {/* Mensaje de Estado / Feedback */}
        {statusMessage && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border flex items-center space-x-2.5 text-xs font-medium animate-in slide-in-from-top-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* CONTENIDO DEL MODAL */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: CATÁLOGO */}
          {activeTab === 'CATALOG' && (
            <div className="space-y-4">
              {/* Barra de Filtros y Búsqueda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar estación por nombre (ej. TORREJON, VALCARCE...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <select
                    value={filterType}
                    onChange={(e: any) => setFilterType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">Todas las Estaciones ({catalog.propias.length + catalog.colaboradoras.length})</option>
                    <option value="PROPIA">Solo Propias ({catalog.propias.length})</option>
                    <option value="COLABORADORA_FIJA">Colaboradoras Fijas ({catalog.colaboradoras.filter((c) => c.isFixedColaboradora).length})</option>
                    <option value="COLABORADORA_ESTANDAR">Colaboradoras Estándar ({catalog.colaboradoras.filter((c) => !c.isFixedColaboradora).length})</option>
                  </select>
                </div>
              </div>

              {/* Grid / Tabla de Estaciones */}
              <div className="rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[11px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Estación</th>
                      <th className="py-2.5 px-3 text-center">Tipo</th>
                      <th className="py-2.5 px-3 text-center">Terminal CLH</th>
                      <th className="py-2.5 px-3 text-right">Porte</th>
                      <th className="py-2.5 px-3 text-right">Pase</th>
                      <th className="py-2.5 px-3 text-right">Fin.</th>
                      <th className="py-2.5 px-3 text-right text-amber-300">P. Venta Sug.</th>
                      <th className="py-2.5 px-3 text-center">Módulos</th>
                      <th className="py-2.5 px-3 text-center w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 bg-slate-950/40 font-mono">
                    {filteredStations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500 italic font-sans">
                          No se encontraron estaciones coincidentes con los filtros.
                        </td>
                      </tr>
                    ) : (
                      filteredStations.map((st) => {
                        const cost = catalog.costs[st.name];
                        const suggested = catalog.suggestedPrices[st.name];
                        const hasPoste = catalog.postesStations.some((p) => p.name.toUpperCase() === st.name.toUpperCase());
                        const hasAdblue = Boolean(catalog.adblueConfig[st.name]);
                        const importDef = catalog.importStations.find((i) => i.name.toUpperCase() === st.name.toUpperCase());

                        return (
                          <tr key={st.name} className="hover:bg-slate-800/40 transition-colors group">
                            <td className="py-2 px-3 font-sans font-bold text-white flex items-center space-x-2">
                              <span>{st.name}</span>
                              {importDef && (
                                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
                                  ID {importDef.id}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-sans">
                              {st.type === 'PROPIA' ? (
                                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                                  PROPIA
                                </span>
                              ) : st.isFixedColaboradora ? (
                                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
                                  COLAB. FIJA
                                </span>
                              ) : (
                                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30">
                                  COLABORADORA
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-300">
                              {cost?.clhName || '-'}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-300">
                              {cost?.porte ? cost.porte.toFixed(3).replace('.', ',') : '0,000'}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-300">
                              {cost?.pase ? cost.pase.toFixed(3).replace('.', ',') : '0,000'}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-300">
                              {cost?.fin ? cost.fin.toFixed(3).replace('.', ',') : '0,000'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-amber-300">
                              {suggested ? suggested.toFixed(3).replace('.', ',') + ' €' : '-'}
                            </td>
                            <td className="py-2 px-3 text-center font-sans space-x-1">
                              {hasPoste && (
                                <span className="bg-purple-500/20 text-purple-300 text-[9px] font-bold px-1.5 py-0.5 rounded" title="Aparece en ventana Postes">
                                  POSTE
                                </span>
                              )}
                              {hasAdblue && (
                                <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-bold px-1.5 py-0.5 rounded" title="Configurada con AdBlue">
                                  ADBLUE
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => handleStartEdit(st)}
                                  className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-purple-900/30 rounded-lg transition-colors"
                                  title="Modificar estación"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingStationName(st.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors"
                                  title="Eliminar estación en todo el sistema"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2 & 3: FORMULARIO (NUEVA O EDITAR) */}
          {(activeTab === 'NEW' || activeTab === 'EDIT') && (
            <form onSubmit={handleSaveStation} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveTab('CATALOG');
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h4 className="text-sm font-bold text-white">
                    {activeTab === 'EDIT' ? `Modificando Estación: ${editingStationName}` : 'Alta de Nueva Estación'}
                  </h4>
                </div>
                <span className="text-xs text-slate-400">
                  {activeTab === 'EDIT' ? 'Los cambios se reflejarán en cascada' : 'Se inicializarán precios y costes para todos los módulos'}
                </span>
              </div>

              {/* Sección 1: Datos Principales */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>1. Identificación y Clasificación</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Nombre de Estación *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. GETAFE SUR"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold uppercase focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Tipo de Estación *</label>
                    <select
                      value={formType}
                      onChange={(e: any) => {
                        setFormType(e.target.value);
                        if (e.target.value === 'PROPIA') {
                          setFormIsPoste(true);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:border-amber-400 focus:outline-none"
                    >
                      <option value="PROPIA">PROPIA (Red interna)</option>
                      <option value="COLABORADORA">COLABORADORA (Asociada)</option>
                    </select>
                  </div>

                  {formType === 'COLABORADORA' ? (
                    <div className="flex items-center pt-5">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIsFixedColab}
                          onChange={(e) => setFormIsFixedColab(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                        />
                        <span className="text-xs text-amber-300 font-bold">¿Es Colaboradora Fija? (Columna J)</span>
                      </label>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">ID Archivo EFI (Opcional)</label>
                      <input
                        type="number"
                        placeholder="Automático si se deja vacío"
                        value={formImportId}
                        onChange={(e) => setFormImportId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 2: Costes Logísticos y CLH */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>2. Terminal CLH y Costes Fijos (€/Litro)</span>
                </h5>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Terminal CLH</label>
                    <input
                      type="text"
                      value={formClhName}
                      onChange={(e) => setFormClhName(e.target.value)}
                      placeholder="Ej. TORREJON, ALBUIXECH"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold uppercase focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Porte (€)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formPorte}
                      onChange={(e) => setFormPorte(e.target.value.replace('.', ','))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Pase (€)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formPase}
                      onChange={(e) => setFormPase(e.target.value.replace('.', ','))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Financiación (€)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formFin}
                      onChange={(e) => setFormFin(e.target.value.replace('.', ','))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">P. Compra Referencia (€)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formDefaultCurr}
                      onChange={(e) => setFormDefaultCurr(e.target.value.replace('.', ','))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">P. Compra Anterior (€)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formDefaultPrev}
                      onChange={(e) => setFormDefaultPrev(e.target.value.replace('.', ','))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase block mb-1">P. Venta Sugerido (€) *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={formSuggestedPrice}
                      onChange={(e) => setFormSuggestedPrice(e.target.value.replace('.', ','))}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-bold font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Opciones de Postes y AdBlue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Postes */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Fuel className="h-3.5 w-3.5" />
                      <span>3. Integración en Postes</span>
                    </h5>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsPoste}
                        onChange={(e) => setFormIsPoste(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0"
                      />
                      <span className="text-[11px] text-purple-300 font-bold">Activar Poste</span>
                    </label>
                  </div>

                  {formIsPoste && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">PVP Poste GOA</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formDefaultGoaPoste}
                            onChange={(e) => setFormDefaultGoaPoste(e.target.value.replace('.', ','))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Margen Gasolina</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formDefaultGainPoste}
                            onChange={(e) => setFormDefaultGainPoste(e.target.value.replace('.', ','))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <label className="flex items-center space-x-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={formHasGasolina}
                          onChange={(e) => setFormHasGasolina(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0"
                        />
                        <span className="text-xs text-slate-300">¿Vende Gasolina en Poste?</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* AdBlue */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>4. Configuración AdBlue</span>
                    </h5>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formHasAdblue}
                        onChange={(e) => setFormHasAdblue(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      <span className="text-[11px] text-cyan-300 font-bold">Activar AdBlue</span>
                    </label>
                  </div>

                  {formHasAdblue && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">P. Compra AdBlue</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formAdblueBuy}
                          onChange={(e) => setFormAdblueBuy(e.target.value.replace('.', ','))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">PVP Venta AdBlue</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formAdblueSale}
                          onChange={(e) => setFormAdblueSale(e.target.value.replace('.', ','))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab('CATALOG');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  <span>{activeTab === 'EDIT' ? 'Guardar Cambios de Estación' : 'Crear Estación y Propagar'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* DIÁLOGO MODAL DE CONFIRMACIÓN: ELIMINAR ESTACIÓN */}
        {deletingStationName && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-950 border border-rose-500/50 max-w-md w-full rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3 text-rose-400">
                <div className="p-2.5 bg-rose-500/20 rounded-xl">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">¿Eliminar Estación Definitivamente?</h4>
                  <p className="text-xs text-rose-300 font-mono font-bold">{deletingStationName}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Esta acción eliminará la estación <strong>{deletingStationName}</strong> y purgará de forma segura sus datos asociados en:
              </p>

              <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-5">
                <li>Registros de <strong>Compras</strong> (precios diarios y costes).</li>
                <li>Filas y cálculos en la <strong>Sábana de Precios</strong>.</li>
                <li>Configuración y precios en la ventana de <strong>Postes</strong>.</li>
                <li>Bloques de tarifas en el archivo oficial de <strong>EFI Export</strong>.</li>
                <li>Selectores y orígenes de datos en <strong>PDFs y Clientes</strong>.</li>
              </ul>

              <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingStationName(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIÁLOGO MODAL DE CONFIRMACIÓN: RESTABLECER TODO */}
        {isConfirmingReset && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-950 border border-amber-500/50 max-w-md w-full rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3 text-amber-400">
                <div className="p-2.5 bg-amber-500/20 rounded-xl">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Restablecer Catálogo Semilla</h4>
                  <p className="text-xs text-slate-400">53 Estaciones Oficiales Iniciales</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                ¿Deseas restaurar la lista de estaciones a las 19 Propias y 34 Colaboradoras iniciales del archivo de cálculo? Todas las estaciones personalizadas añadidas serán removidas.
              </p>

              <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleResetCatalog}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95"
                >
                  Restablecer
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
