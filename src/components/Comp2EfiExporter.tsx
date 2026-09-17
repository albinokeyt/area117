'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, PRODUCTS } from '@/lib/dataSeed';
import {
  Download, CheckCircle2, FileSpreadsheet, Send, MessageSquare,
  Copy, Check, Calculator, Fuel, Calendar, FileDown, Layers,
  Sliders, Search, Filter, Edit3, Trash2, RotateCcw, Plus, ChevronLeft, ChevronRight,
  Maximize2, Minimize2
} from 'lucide-react';
import {
  downloadImportacionXlsx,
  downloadImportacionCsv,
  buildImportacionTable,
  IMPORT_STATIONS_56,
  EfiExportRowOverride,
  EfiExportAddedRow
} from '@/lib/excelExportService';
import { EfiExportModifierModal } from './EfiExportModifierModal';

interface Comp2Props {
  selectedDate: string;
}

export function Comp2EfiExporter({ selectedDate }: Comp2Props) {
  const [validFromDate, setValidFromDate] = useState<string>(() => {
    try {
      return localStorage.getItem('efi_compras_valid_from') || selectedDate || '2026-09-05';
    } catch (e) {
      return selectedDate;
    }
  });
  const [finalDate, setFinalDate] = useState<string>('2026-09-20');

  const [fixedStationPrices, setFixedStationPrices] = useState<Record<string, number>>({
    'BENAVENTE': 1.1790,
    'IRUN ZAISA III': 1.1920,
    'AVILESINA': 1.1880,
    'MERIDA': 1.1820,
    'SANCTI-SPIRITUS': 1.1820,
    'SAN VICENTE DEL PALACIO': 1.1810,
    'WATERY ARANDA': 1.1890,
    'PUERTO DE BARCELONA': 1.1940,
    'FEGOBLAN PONTEVEDRA': 1.1870,
    'VEGA DE VALCARCE': 1.1910,
    'HOILA TOLEDO': 1.1830,
    'PETREM FIGUERES': 1.1950,
  });

  // Precios especiales de proveedores con desglose de IVA (Nieves / 1.21, Petromiralles / 1.21, Valcarce)
  const [nievesIncVat, setNievesIncVat] = useState<number>(1.4390);
  const [petromirallesIncVat, setPetromirallesIncVat] = useState<number>(1.4420);
  const [valcarceDirectPrice, setValcarceDirectPrice] = useState<number>(1.1890);

  const [isExported, setIsExported] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const nievesExclVat = Number((nievesIncVat / 1.21).toFixed(4));
  const petromirallesExclVat = Number((petromirallesIncVat / 1.21).toFixed(4));

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal State
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [modalTargetRow, setModalTargetRow] = useState<any>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [tariffFilter, setTariffFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [pagoFilter, setPagoFilter] = useState('ALL');
  const [rowsPerPage, setRowsPerPage] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  // Additional Data Sources for Modal
  const [comprasPurchases, setComprasPurchases] = useState<Record<string, any>>({});
  const [specialRates, setSpecialRates] = useState<any[]>([]);
  const [postesData, setPostesData] = useState<any>({});

  useEffect(() => {
    const handleUpdate = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener('efi_compras_updated', handleUpdate);
    window.addEventListener('efi_sabana_updated', handleUpdate);
    window.addEventListener('efi_postes_updated', handleUpdate);
    window.addEventListener('efi_valid_date_changed', handleUpdate);
    window.addEventListener('efi_export_updated', handleUpdate);
    window.addEventListener('efi_stations_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('efi_compras_updated', handleUpdate);
      window.removeEventListener('efi_sabana_updated', handleUpdate);
      window.removeEventListener('efi_postes_updated', handleUpdate);
      window.removeEventListener('efi_valid_date_changed', handleUpdate);
      window.removeEventListener('efi_export_updated', handleUpdate);
      window.removeEventListener('efi_stations_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  useEffect(() => {
    try {
      const sDate = localStorage.getItem('efi_purchases_' + selectedDate);
      const sGlob = localStorage.getItem('efi_compras_data');
      if (sDate) setComprasPurchases(JSON.parse(sDate).data || {});
      else if (sGlob) setComprasPurchases(JSON.parse(sGlob).data || {});

      const sp = localStorage.getItem('efi_special_rates_b50_f82_v4') || localStorage.getItem('efi_special_rates_b50_f82_v3');
      if (sp) setSpecialRates(JSON.parse(sp));

      const pData = localStorage.getItem('efi_postes_data_v2');
      if (pData) setPostesData(JSON.parse(pData));
    } catch (e) {}
  }, [selectedDate, refreshTrigger]);

  const previewRows = useMemo(() => {
    return buildImportacionTable(selectedDate, validFromDate, finalDate);
  }, [selectedDate, validFromDate, finalDate, refreshTrigger]);

  // List of all tariffs in preview
  const allTariffsList = useMemo(() => {
    const setT = new Set<string>();
    previewRows.slice(1).forEach((r) => {
      if (r[8] && typeof r[8] === 'string' && r[8].trim() !== '') {
        setT.add(r[8].trim());
      }
    });
    return Array.from(setT);
  }, [previewRows]);

  // List of all data rows (excluding header row 0)
  const dataRows = useMemo(() => {
    return previewRows.slice(1);
  }, [previewRows]);

  // Filtered rows for the table view
  const filteredDataRows = useMemo(() => {
    return dataRows.filter((r) => {
      const codeA = String(r[0] ?? '');
      const stId = String(r[1] ?? '');
      const prod = String(r[2] ?? '');
      const stName = String(r[6] ?? '').toLowerCase();
      const pago = String(r[7] ?? '');
      const tarifa = String(r[8] ?? '').toLowerCase();

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        term === '' ||
        stName.includes(term) ||
        stId.includes(term) ||
        tarifa.includes(term) ||
        codeA.includes(term) ||
        pago.toLowerCase().includes(term);

      const matchesTariff = tariffFilter === 'ALL' || r[8] === tariffFilter;
      const matchesProd = productFilter === 'ALL' || String(r[2]) === productFilter;
      const matchesPago = pagoFilter === 'ALL' || String(r[7]) === pagoFilter;

      return matchesSearch && matchesTariff && matchesProd && matchesPago;
    });
  }, [dataRows, searchTerm, tariffFilter, productFilter, pagoFilter]);

  // Pagination calculation
  const totalPages = useMemo(() => {
    if (rowsPerPage === -1) return 1;
    return Math.max(1, Math.ceil(filteredDataRows.length / rowsPerPage));
  }, [filteredDataRows.length, rowsPerPage]);

  const paginatedRows = useMemo(() => {
    if (rowsPerPage === -1) return filteredDataRows;
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDataRows.slice(start, start + rowsPerPage);
  }, [filteredDataRows, currentPage, rowsPerPage]);

  const displayStart = filteredDataRows.length === 0 ? 0 : rowsPerPage === -1 ? 1 : (currentPage - 1) * rowsPerPage + 1;
  const displayEnd = rowsPerPage === -1 ? filteredDataRows.length : Math.min(currentPage * rowsPerPage, filteredDataRows.length);

  // Overrides Handlers
  const handleSaveOverride = (
    key: string,
    override: EfiExportRowOverride,
    scope: 'ROW' | 'TARIFF' | 'STATION' = 'ROW',
    targetTariff?: string,
    targetStation?: string
  ) => {
    try {
      const raw = localStorage.getItem('efi_export_custom_overrides_v1');
      const currentOverrides: Record<string, EfiExportRowOverride> = raw ? JSON.parse(raw) : {};

      if (scope === 'ROW') {
        currentOverrides[key] = override;
      } else if (scope === 'TARIFF' && targetTariff) {
        IMPORT_STATIONS_56.forEach((st) => {
          const k = `${targetTariff}::${st.id}`;
          currentOverrides[k] = { ...override };
        });
      } else if (scope === 'STATION' && targetStation) {
        const cleanSt = targetStation.toUpperCase().replace(/^ES\s+/, '').trim();
        const stObj = IMPORT_STATIONS_56.find(
          (s) => s.name.toUpperCase().includes(cleanSt) || cleanSt.includes(s.name.toUpperCase())
        );
        if (stObj) {
          allTariffsList.forEach((t) => {
            const k = `${t}::${stObj.id}`;
            currentOverrides[k] = { ...override };
          });
        }
      }

      localStorage.setItem('efi_export_custom_overrides_v1', JSON.stringify(currentOverrides));
      window.dispatchEvent(new Event('efi_export_updated'));
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      console.error('Error al guardar sobreescritura EFI:', e);
    }
  };

  const handleAddRow = (newRow: EfiExportAddedRow) => {
    try {
      const raw = localStorage.getItem('efi_export_added_rows_v1');
      const added: EfiExportAddedRow[] = raw ? JSON.parse(raw) : [];
      added.push(newRow);
      localStorage.setItem('efi_export_added_rows_v1', JSON.stringify(added));
      window.dispatchEvent(new Event('efi_export_updated'));
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      console.error('Error al añadir fila:', e);
    }
  };

  const handleAddTariffBlock = (
    tariffName: string,
    codeA: number,
    prod: number,
    pago: string,
    markup: number
  ) => {
    try {
      const raw = localStorage.getItem('efi_export_added_rows_v1');
      const added: EfiExportAddedRow[] = raw ? JSON.parse(raw) : [];

      IMPORT_STATIONS_56.forEach((st) => {
        if (st.isZero) return;
        added.push({
          id: `block_${tariffName}_${st.id}_${Date.now()}`,
          codeA,
          stationId: st.id,
          prod,
          initialDate: validFromDate,
          finalDate: finalDate,
          pvp: Number(((1.480 + markup) * 1.21).toFixed(3)),
          stationName: st.name,
          pago,
          tarifa: tariffName,
        });
      });

      localStorage.setItem('efi_export_added_rows_v1', JSON.stringify(added));
      window.dispatchEvent(new Event('efi_export_updated'));
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      console.error('Error al añadir bloque de tarifa:', e);
    }
  };

  const handleDeleteRow = (rowKey: string) => {
    try {
      const raw = localStorage.getItem('efi_export_deleted_rows_v1');
      const deleted: string[] = raw ? JSON.parse(raw) : [];
      if (!deleted.includes(rowKey)) {
        deleted.push(rowKey);
      }
      localStorage.setItem('efi_export_deleted_rows_v1', JSON.stringify(deleted));
      window.dispatchEvent(new Event('efi_export_updated'));
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      console.error('Error al eliminar fila:', e);
    }
  };

  const handleDeleteTariffBlock = (tariffName: string) => {
    try {
      const raw = localStorage.getItem('efi_export_deleted_tariffs_v1');
      const deleted: string[] = raw ? JSON.parse(raw) : [];
      if (!deleted.includes(tariffName)) {
        deleted.push(tariffName);
      }
      localStorage.setItem('efi_export_deleted_tariffs_v1', JSON.stringify(deleted));
      window.dispatchEvent(new Event('efi_export_updated'));
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      console.error('Error al eliminar bloque de tarifa:', e);
    }
  };

  const handleResetAll = () => {
    try {
      localStorage.removeItem('efi_export_custom_overrides_v1');
      localStorage.removeItem('efi_export_added_rows_v1');
      localStorage.removeItem('efi_export_deleted_rows_v1');
      localStorage.removeItem('efi_export_deleted_tariffs_v1');
      window.dispatchEvent(new Event('efi_export_updated'));
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      console.error('Error al restablecer EFI export:', e);
    }
  };

  // Export handlers with exact preview synchronization
  const handleExportXlsx = () => {
    downloadImportacionXlsx(selectedDate, validFromDate, finalDate, previewRows);
    setIsExported(true);
    setTimeout(() => setIsExported(false), 4000);
  };

  const handleExportCsv = () => {
    downloadImportacionCsv(selectedDate, validFromDate, finalDate, previewRows);
    setIsExported(true);
    setTimeout(() => setIsExported(false), 4000);
  };

  const handlePriceChange = (stationName: string, val: string) => {
    const num = parseFloat(val) || 0;
    setFixedStationPrices((prev) => ({
      ...prev,
      [stationName]: num,
    }));
  };

  const whatsappMessage = `⛽ *ACTUALIZACIÓN DE PRECIOS - EFI DATA OIL* ⛽
📅 Fecha: ${selectedDate}

Estimado equipo, los precios del día han sido actualizados en EFI DATA OIL:

🔹 *Estaciones Propias:* Precios de compra y postes cargados.
🔹 *NIEVES (H44/H45):* ${nievesIncVat.toFixed(4)} € (Con IVA) -> *${nievesExclVat.toFixed(4)} € (Sin IVA)*
🔹 *PETROMIRALLES (H30):* ${petromirallesIncVat.toFixed(4)} € (Con IVA) -> *${petromirallesExclVat.toFixed(4)} € (Sin IVA)*
🔹 *VALCARCE:* ${valcarceDirectPrice.toFixed(4)} €
🔹 *Colaboradoras Fijas (Columna J):* 13 estaciones sincronizadas.

✅ Archivo IMPORTACION (${previewRows.length - 1} filas, ${allTariffsList.length} bloques de tarifas) generado con éxito.`;

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner Superior con Botones Principales */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4" />
              <span>Gestión de Compañeros 2 y 3 - Validación & EFI</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Exportación e Integración EFI DATA OIL (Hoja IMPORTACION)
            </h2>
            <p className="text-slate-400 text-sm">
              Genera el archivo oficial <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-mono text-xs">IMPORTACION</code> con todos los precios Con IVA de Sábana de Precios, Gasolina Bronco y Gasóleo B.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="bg-slate-800/80 text-amber-300 font-mono px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
                {previewRows.length - 1} Filas Totales en Archivo
              </span>
              <span className="bg-slate-800/80 text-blue-300 font-mono px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
                {allTariffsList.length} Bloques de Tarifas
              </span>
              <span className="bg-slate-800/80 text-emerald-300 font-mono px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
                56 Estaciones Sincronizadas
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* BOTÓN PRINCIPAL: MODIFICAR */}
            <button
              onClick={() => {
                setModalTargetRow(null);
                setShowModifierModal(true);
              }}
              className="flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-xl shadow-purple-500/25 transition-all active:scale-95 border border-purple-400/30"
              title="Modificar valores, fórmulas, orígenes de datos, agregar o quitar datos en la vista previa"
            >
              <Sliders className="h-4 w-4 text-purple-200" />
              <span>Modificar</span>
            </button>

            <button
              onClick={handleExportXlsx}
              className={`flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold shadow-xl transition-all active:scale-95 ${
                isExported
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{isExported ? '¡Excel IMPORTACION Generado!' : 'Descargar Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all active:scale-95"
            >
              <FileDown className="h-4 w-4 text-amber-400" />
              <span>Descargar CSV</span>
            </button>
          </div>
        </div>

        {/* Date Selector Row */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span>Fecha Inicial (Columna INICIAL):</span>
            </label>
            <input
              type="text"
              value={validFromDate}
              onChange={(e) => setValidFromDate(e.target.value)}
              placeholder="DD/MM/YYYY o YYYY-MM-DD"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>Fecha Final (Columna FINAL):</span>
            </label>
            <input
              type="text"
              value={finalDate}
              onChange={(e) => setFinalDate(e.target.value)}
              placeholder="DD/MM/YYYY o YYYY-MM-DD"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Proveedores Especiales (Valcarce, Nieves / 1.21, Petromiralles / 1.21) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-base border-b border-slate-800 pb-3">
          <Calculator className="h-5 w-5" />
          <span>Proveedores con Fórmulas de Desglose de IVA (Celdas H30, H44, H45, Valcarce)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* NIEVES (H44, H45) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">NIEVES (H44, H45)</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono">Fórmula ÷ 1.21</span>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Precio Recibido (Con IVA):</label>
              <input
                type="number"
                step="0.0001"
                value={nievesIncVat}
                onChange={(e) => setNievesIncVat(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Sin IVA resultante:</span>
              <span className="font-mono font-bold text-emerald-400">{nievesExclVat.toFixed(4)} €</span>
            </div>
          </div>

          {/* PETROMIRALLES (H30) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">PETROMIRALLES (H30)</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono">Fórmula ÷ 1.21</span>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Precio Recibido (Con IVA):</label>
              <input
                type="number"
                step="0.0001"
                value={petromirallesIncVat}
                onChange={(e) => setPetromirallesIncVat(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Sin IVA resultante:</span>
              <span className="font-mono font-bold text-emerald-400">{petromirallesExclVat.toFixed(4)} €</span>
            </div>
          </div>

          {/* VALCARCE */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">VALCARCE (H35, H36, H40...)</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">Neto Directo</span>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Precio Neto Recibido (€):</label>
              <input
                type="number"
                step="0.0001"
                value={valcarceDirectPrice}
                onChange={(e) => setValcarceDirectPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Con IVA (21%):</span>
              <span className="font-mono font-bold text-emerald-400">{(valcarceDirectPrice * 1.21).toFixed(4)} €</span>
            </div>
          </div>

        </div>
      </div>

      {/* Fixed Colaboradoras Section (BENAVENTE, IRUN ZAISA III, etc.) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-amber-300 flex items-center space-x-2">
            <Send className="h-5 w-5 text-amber-400" />
            <span>Estaciones Colaboradoras Fijas (Columna J - Hoja Cálculo Inicial)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">13 Estaciones Clave</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(fixedStationPrices).map(([stName, price]) => (
            <div key={stName} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 shadow-inner hover:border-slate-700 transition-colors">
              <div className="text-xs font-bold text-slate-300 truncate mb-1.5">{stName}</div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-mono">GOA:</span>
                <input
                  type="number"
                  step="0.0001"
                  value={price}
                  onChange={(e) => handlePriceChange(stName, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-amber-300 font-bold font-mono text-xs focus:border-amber-400 focus:outline-none"
                />
                <span className="text-xs text-slate-400 font-mono">€</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generador de Notificación para Grupos de WhatsApp */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            <span>Notificación Automática para Grupos de WhatsApp</span>
          </h3>
          <button
            onClick={handleCopyWhatsApp}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            {copiedWhatsApp ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copiedWhatsApp ? '¡Texto Copiado!' : 'Copiar Mensaje'}</span>
          </button>
        </div>
        <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 border border-slate-800/80 whitespace-pre-wrap">
          {whatsappMessage}
        </pre>
      </div>

      {/* TABLA COMPLETA: VISTA PREVIA DE ESTRUCTURA DE EXPORTACIÓN */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
              <FileSpreadsheet className="h-5 w-5" />
              <span>Vista Previa Completa del Archivo de Exportación (`IMPORTACION` - 9 Columnas)</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualiza el 100% de las filas del archivo oficial ({previewRows.length - 1} filas). Todos los precios proceden por defecto de la Sábana de Precios.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsTableExpanded(!isTableExpanded)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold shadow transition-all active:scale-95"
              title={isTableExpanded ? 'Limitar altura de tabla' : 'Expandir altura completa de tabla'}
            >
              {isTableExpanded ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-blue-400" />
                  <span>Reducir Altura</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-blue-400" />
                  <span>Expandir Altura</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setModalTargetRow(null);
                setShowModifierModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Modificar Datos</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Búsqueda y Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          
          {/* Búsqueda */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar estación, ID, tarifa, pago..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Filtro Tarifa */}
          <div>
            <select
              value={tariffFilter}
              onChange={(e) => {
                setTariffFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">Todas las Tarifas ({allTariffsList.length})</option>
              {allTariffsList.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filtro Producto */}
          <div>
            <select
              value={productFilter}
              onChange={(e) => {
                setProductFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">Todos los Productos</option>
              <option value="1">1 - Gasóleo A (GOA)</option>
              <option value="2">2 - Gasolina Bronco</option>
              <option value="5">5 - Gasóleo B Agrícola</option>
            </select>
          </div>

          {/* Selector de Filas por Página */}
          <div>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
            >
              <option value={10}>Ver 10</option>
              <option value={20}>Ver 20</option>
              <option value={50}>Ver 50</option>
              <option value={100}>Ver 100</option>
              <option value={1000}>Ver 1000</option>
              <option value={-1}>Ver Todo ({filteredDataRows.length})</option>
            </select>
          </div>

        </div>

        {/* Tabla de Datos Completa */}
        <div className={`overflow-x-auto rounded-xl border border-slate-800 shadow-inner transition-all ${
          isTableExpanded ? 'max-h-none' : 'max-h-[620px]'
        }`}>
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400 tracking-wider shadow-sm">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">Col A</th>
                <th className="py-2.5 px-3">ESTACION (ID)</th>
                <th className="py-2.5 px-3 text-center">PRODUCTO</th>
                <th className="py-2.5 px-3 text-center">INICIAL</th>
                <th className="py-2.5 px-3 text-center">FINAL</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">PVP (Con IVA)</th>
                <th className="py-2.5 px-3">ESTACION (NOMBRE)</th>
                <th className="py-2.5 px-3 text-center">PAGO</th>
                <th className="py-2.5 px-3 text-amber-300">TARIFA</th>
                <th className="py-2.5 px-2 text-center w-12">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs bg-slate-950/70">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-sans italic">
                    No se encontraron filas que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const codeA = row[0];
                  const stationId = row[1];
                  const prod = row[2];
                  const dInit = row[3];
                  const dEnd = row[4];
                  const pvp = row[5];
                  const stName = row[6];
                  const pago = row[7];
                  const tarifa = row[8];

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-1.5 px-3 text-center font-bold text-slate-500">{codeA}</td>
                      <td className="py-1.5 px-3 text-white font-bold">{stationId}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          prod === 1 ? 'bg-blue-500/20 text-blue-300' :
                          prod === 2 ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {prod === 1 ? '1 (GOA)' : prod === 2 ? '2 (GAS)' : '5 (GOB)'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-center text-slate-400">{dInit}</td>
                      <td className="py-1.5 px-3 text-center text-slate-400">{dEnd}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-emerald-400 font-mono">
                        {typeof pvp === 'number' ? pvp.toFixed(3).replace('.', ',') : pvp}
                      </td>
                      <td className="py-1.5 px-3 text-slate-200 font-sans font-medium">{stName}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          pago === 'PREPAGO' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-slate-400'
                        }`}>
                          {pago || '-'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 font-bold text-amber-300 font-sans">{tarifa}</td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          onClick={() => {
                            setModalTargetRow({
                              rowKey: `${tarifa}::${stationId}::${prod}`,
                              codeA: Number(codeA),
                              stationId: Number(stationId),
                              prod: Number(prod),
                              initialDate: String(dInit || validFromDate),
                              finalDate: String(dEnd || finalDate),
                              pvp: typeof pvp === 'number' ? pvp : parseFloat(String(pvp).replace(',', '.')) || 0,
                              stationName: String(stName),
                              pago: String(pago || 'MENSUAL'),
                              tarifa: String(tarifa),
                            });
                            setShowModifierModal(true);
                          }}
                          className="p-1 text-slate-500 hover:text-purple-300 rounded hover:bg-purple-900/40 transition-colors"
                          title={`Modificar esta fila (${stName} - ${tarifa})`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación y Contador */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Mostrando <strong className="text-white font-mono">{displayStart}</strong> a <strong className="text-white font-mono">{displayEnd}</strong> de{' '}
            <strong className="text-emerald-400 font-mono">{filteredDataRows.length}</strong> filas coincidentes{' '}
            ({previewRows.length - 1} filas totales en el archivo)
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Desplegable solicitado: Ver 10, 20, 50, 100, 1000, Ver Todo */}
            <div className="flex items-center space-x-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 shadow-inner">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mostrar:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-emerald-300 font-bold font-mono focus:outline-none focus:border-emerald-400"
              >
                <option value={10}>Ver 10</option>
                <option value={20}>Ver 20</option>
                <option value={50}>Ver 50</option>
                <option value={100}>Ver 100</option>
                <option value={1000}>Ver 1000</option>
                <option value={-1}>Ver Todo ({filteredDataRows.length})</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage <= 1 || rowsPerPage === -1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all text-slate-200"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Anterior</span>
              </button>
              <span className="font-mono text-slate-300 px-2">
                {rowsPerPage === -1 ? 'Vista Completa' : `Página ${currentPage} de ${totalPages}`}
              </span>
              <button
                disabled={currentPage >= totalPages || rowsPerPage === -1}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all text-slate-200"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL INTEGRAL: MODIFICAR / CONFIGURAR DATOS */}
      {showModifierModal && (
        <EfiExportModifierModal
          isOpen={showModifierModal}
          onClose={() => {
            setShowModifierModal(false);
            setModalTargetRow(null);
          }}
          selectedDate={selectedDate}
          previewRows={previewRows}
          onSaveOverride={handleSaveOverride}
          onAddRow={handleAddRow}
          onAddTariffBlock={handleAddTariffBlock}
          onDeleteRow={handleDeleteRow}
          onDeleteTariffBlock={handleDeleteTariffBlock}
          onResetAll={handleResetAll}
          comprasPurchases={comprasPurchases}
          specialRates={specialRates}
          postesData={postesData}
          sabanaFormulas={{}}
          initialSelectedRow={modalTargetRow}
        />
      )}

    </div>
  );
}
