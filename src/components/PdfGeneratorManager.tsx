'use client';

import React, { useState, useEffect } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS } from '@/lib/dataSeed';
import {
  Printer, Download, FileText, Search, Calendar, Check,
  Sparkles, Building2, Store, Fuel, Zap, Eye, ArrowDownToLine,
  Plus, CheckSquare, Square, Trash2, X, Flame
} from 'lucide-react';

interface PdfGeneratorProps {
  selectedDate: string;
}

// Catálogo de Estaciones con Bandera y Dirección Real del Excel
const STATIONS_METADATA: Record<string, { bandera: string; ubicacion: string }> = {
  'ES RIBA-ROJA': { bandera: 'EXOIL', ubicacion: 'Polígono Industrial el Oliveral, Calle U, nº 4, Riba-roja de Túria, Valencia' },
  'ES PISTA DE SILLA': { bandera: 'EXOIL', ubicacion: 'Camí pont de pedra, 3, 46910, Valencia' },
  'ES REAL DE GANDIA': { bandera: 'EXOIL', ubicacion: "Carrer Travessera D'Albaida, 62, El Real de Gandia, Valencia" },
  'ES CHIVA': { bandera: 'EXOIL', ubicacion: 'C. Ramón y Cajal, 53, Valencia' },
  'ES ALBERIC': { bandera: 'EXOIL', ubicacion: 'AV. La Marquesa, 14, 46260 Alberic, Valencia' },
  'CATARROJA': { bandera: 'EXOIL', ubicacion: 'Camí Vell de Russafa, 418, 46470 Catarroja, Valencia' },
  'MANISES - EXOIL': { bandera: 'EXOIL', ubicacion: 'Avinguda de la Cova, 62, 46940 Manises, Valencia' },
  'TORREJON': { bandera: 'VALCARCE', ubicacion: 'Avenida ronda sur 3, Pol. Ind. Los Almendros, Torrejón de Ardoz, Madrid' },
  'ARCOS JALON': { bandera: 'AREA 117', ubicacion: 'Calle Malita, 15 - Arcos de Jalón, Soria' },
  'ALFAJARIN': { bandera: 'ALFA ENERGIA', ubicacion: 'Pl. del Saco, 12 - 50172 Alfajarín, Zaragoza' },
  'TORREMOCHA': { bandera: 'AREA 117', ubicacion: 'Área de Servicio A2, KM 117, 19268 Torremocha del Campo, Guadalajara' },
  'MADRID': { bandera: 'AREA 117', ubicacion: 'Vía de Servicio A-3, KM 11, 28031 Madrid' },
  'VALLECAS': { bandera: 'AREA 117', ubicacion: 'Av. de la Democracia, 15, 28031 Madrid' },
  'VALDEMORO': { bandera: 'AREA 117', ubicacion: 'C/ Narciso Monturiol 28, Pol. Ind. Rompecubas, Valdemoro, Madrid' },
  'PAMPLONA': { bandera: 'ALAITZ', ubicacion: 'N-121, KM 11,3 - 31398 Muruarte de Reta, Navarra' },
  'HUMILLADERO': { bandera: 'AREA 117', ubicacion: 'Autovía A92, KM 138,20, 29531 Humilladero, Málaga' },
  'UCLES': { bandera: 'VALCARCE', ubicacion: 'Autovía del Este, KM 90, 16420 Villarrubio, Cuenca' },
  'BENAMEJI': { bandera: 'AREA 117', ubicacion: 'E.S. Cepsa El Berrocal, N-331, PK 96, Benamejí, Córdoba' },
  'SORIA ALCUBILLAS': { bandera: 'AREA 117', ubicacion: 'A-15, KM 13, 42213 Alcubilla de las Peñas, Soria' },
  'ABRERA': { bandera: 'HAM', ubicacion: 'Carrer del Treball, 1, 08630 Abrera, Barcelona' },
  'VALDEHERRERA': { bandera: 'PETROBIL', ubicacion: 'Área de Servicio Valdeherrera A2, KM 231, Calatayud, Zaragoza' },
  'EL CASAR': { bandera: 'VALCARCE', ubicacion: 'Cam. Pilón, 2, 45614 El Casar de Talavera, Toledo' },
  'LA JOYOSA': { bandera: 'VALCARCE', ubicacion: 'Autovía de Logroño, A-68 - Salida 257, Zaragoza' },
  'JUNDIZ NORPETROL': { bandera: 'NORPETROL', ubicacion: 'Margarita Entitatea, 16, 01195 Margarita, Álava' },
  'OLIVERAL': { bandera: 'ALZ', ubicacion: 'Carrer A, 57 - 46394 Ribarroja de Túria, Valencia' },
  'GUARROMAN': { bandera: 'VALCARCE', ubicacion: 'Carretera N-IV, Salida 280, Guarromán, Jaén' },
  'VALDEPEÑAS': { bandera: 'VALCARCE', ubicacion: 'Autovía A-4, KM 200, Valdepeñas, Ciudad Real' },
  'OPEN': { bandera: 'OPEN', ubicacion: 'Polígono Industrial Las Quemadas, Córdoba' },
  'TJOIL SEVILLA': { bandera: 'TJOIL', ubicacion: 'Autovía A-92, KM 15, Alcalá de Guadaíra, Sevilla' },
  'BENAVENTE': { bandera: 'VALCARCE', ubicacion: 'A-6, KM 262, Benavente, Zamora' },
  'IRUN ZAISA III': { bandera: 'VALCARCE', ubicacion: 'Centro de Transportes Zaisa III, Behobia, Irún, Guipúzcoa' },
  'TARRAGONA': { bandera: 'PETROMIRALLES', ubicacion: 'Pol. Ind. Riu Clar, Carrer de la Química, Tarragona' },
  'LACHAR': { bandera: 'VALCARCE', ubicacion: 'Autovía A-92, KM 221, Láchar, Granada' },
  'LA CAMPANA': { bandera: 'VALCARCE', ubicacion: 'Autovía A-4, KM 480, La Campana, Sevilla' },
  'AVILESINA': { bandera: 'AVILESINA', ubicacion: 'Polígono Industrial PEPA, Avilés, Asturias' },
  'GOR': { bandera: 'VALCARCE', ubicacion: 'Autovía A-92N, KM 20, Gor, Granada' },
  'LLERS': { bandera: 'PADROSA', ubicacion: 'Autopista AP-7, Salida 3, 17740 Llers, Girona' },
  'DARRO - A92': { bandera: 'VALCARCE', ubicacion: 'Autovía A-92, KM 292, Darro, Granada' },
  'MERIDA': { bandera: 'VALCARCE', ubicacion: 'Autovía A-5, KM 341, Mérida, Badajoz' },
  'SANCTI-SPIRITUS': { bandera: 'VALCARCE', ubicacion: 'Autovía A-62, KM 312, Sancti-Spíritus, Salamanca' },
  'MURCIA': { bandera: 'ANDAMUR', ubicacion: 'Polígono Industrial Oeste, Alcantarilla, Murcia' },
  'NORIOIL': { bandera: 'NORIOIL', ubicacion: 'Autovía A-7, KM 585, Lorca, Murcia' },
  'SAN VICENTE DEL PALACIO': { bandera: 'VALCARCE', ubicacion: 'A-6, KM 147, San Vicente del Palacio, Valladolid' },
  'WATERY ARANDA': { bandera: 'WATERY', ubicacion: 'Pol. Ind. Allendeduero, Aranda de Duero, Burgos' },
  'BERA': { bandera: 'BERA', ubicacion: 'Carretera NA-1310, KM 2, Bera, Navarra' },
  'PUERTO DE BARCELONA': { bandera: 'AUTONET', ubicacion: 'Moll Sud, Tram VI, Puerto de Barcelona, Barcelona' },
  'GIRONA-CALSINA': { bandera: 'CALSINA', ubicacion: 'Pol. Ind. Pont Xetmar, Cornellà del Terri, Girona' },
  'FEGOBLAN PONTEVEDRA': { bandera: 'FEGOBLAN', ubicacion: 'Polígono Industrial do Campiño, Pontevedra' },
  'VEGA DE VALCARCE': { bandera: 'VALCARCE', ubicacion: 'A-6, KM 419, Vega de Valcarce, León' },
  'HOILA TOLEDO': { bandera: 'HOILA', ubicacion: 'Autovía A-42, KM 65, Olías del Rey, Toledo' },
  'PETREM FIGUERES': { bandera: 'PETREM', ubicacion: 'Carretera N-IIa, KM 756, Figueres, Girona' },
};

// Lista Oficial Limpia (Sin Noriega, Sin Tarifa 15, Sin Tarifa 27, Sin Tarifa Soya)
const INITIAL_TARIFFS_LIST: { name: string; markup: number }[] = [
  { name: 'TARIFA 12', markup: 0.0120 },
  { name: 'TARIFA 18', markup: 0.0180 },
  { name: 'T18 - PISTA DE SILLA', markup: 0.0180 },
  { name: 'TARIFA 24', markup: 0.0240 },
  { name: 'TARIFA 36', markup: 0.0360 },
  { name: 'T36 - PISTA DE SILLA', markup: 0.0360 },
  { name: 'ESPECIAL COMPLETO', markup: 0.0116 },
  { name: 'TARIFA 40', markup: 0.0400 },
  { name: 'TARIFA 42', markup: 0.0420 },
  { name: 'TARIFA 45', markup: 0.0450 },
  { name: 'TARIFA 47', markup: 0.0470 },
  { name: 'TARIFA 50', markup: 0.0600 },
  { name: 'TARIFA 60', markup: 0.0800 },
  { name: 'T60 - PISTA DE SILLA', markup: 0.0800 },
  { name: 'AMAEXO', markup: 0.0120 },
  { name: 'E100', markup: 0.0130 },
  { name: 'TARIFA ECO', markup: 0.0158 },
  { name: 'DORADO', markup: 0.0135 },
  { name: 'HIQI', markup: 0.0128 },
  { name: 'NORPETROL 24', markup: 0.0132 },
  { name: 'ROR', markup: 0.0132 },
  { name: 'TARJETERA', markup: 0.0140 },
  { name: 'TAX MOVING 24', markup: 0.0132 },
  { name: 'TORTUGA', markup: 0.0125 },
  { name: 'EXOIL', markup: 0.0110 },
  { name: 'NORPETROL', markup: 0.0110 },
  { name: 'LOS JAVI', markup: 0.0116 },
  { name: 'CARRERAS', markup: 0.0116 },
  { name: 'TRANSFRIRED', markup: 0.0116 },
  { name: 'BENITO', markup: 0.0120 },
  { name: 'C-0 GENERAL', markup: 0.0116 },
  { name: 'ESTEBAN', markup: 0.0132 },
  { name: 'MIKI 90', markup: 0.0198 },
  { name: 'ECOTRANS', markup: 0.0158 },
  { name: 'TARIFA 30', markup: 0.0138 },
];

export function PdfGeneratorManager({ selectedDate }: PdfGeneratorProps) {
  const [tariffsList, setTariffsList] = useState<{ name: string; markup: number }[]>(() => {
    try {
      const saved = localStorage.getItem('efi_custom_tariffs_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Reconciliar con INITIAL_TARIFFS_LIST para asegurar markups oficiales exactos
          const merged = INITIAL_TARIFFS_LIST.map((initT) => {
            const found = parsed.find((p) => p.name === initT.name);
            return found && found.markup < 0.1 ? found : initT;
          });
          // Añadir tarifas personalizadas creadas por el usuario
          parsed.forEach((p) => {
            if (!merged.some((m) => m.name === p.name)) {
              merged.push(p);
            }
          });
          return merged;
        }
      }
    } catch (e) {}
    return INITIAL_TARIFFS_LIST;
  });

  const [selectedTariff, setSelectedTariff] = useState('TARIFA 12');
  const [targetDate, setTargetDate] = useState<string>(() => {
    try {
      return localStorage.getItem('efi_compras_valid_from') || selectedDate || new Date().toISOString().split('T')[0];
    } catch (e) {
      return selectedDate;
    }
  });

  useEffect(() => {
    const updateValidDate = () => {
      try {
        const saved = localStorage.getItem('efi_compras_valid_from');
        if (saved) setTargetDate(saved);
      } catch (e) {}
    };
    window.addEventListener('efi_valid_date_changed', updateValidDate);
    window.addEventListener('storage', updateValidDate);
    return () => {
      window.removeEventListener('efi_valid_date_changed', updateValidDate);
      window.removeEventListener('storage', updateValidDate);
    };
  }, []);
  const [searchFilter, setSearchFilter] = useState('');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Modal para Añadir Nueva Tarifa
  const [showAddTariffModal, setShowAddTariffModal] = useState(false);
  const [newTariffName, setNewTariffName] = useState('');
  const [newTariffMarkup, setNewTariffMarkup] = useState('0.1350');

  // Mapa de Estaciones Activas por Tarifa (TariffName -> Array de nombres de estaciones activas)
  const allStations = [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];
    // Mapa para Incluir/Quitar información de HVO por Tarifa (TariffName -> boolean)
  const [includeHvoMap, setIncludeHvoMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('efi_pdf_include_hvo_map');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const isHvoIncluded = includeHvoMap[selectedTariff] !== undefined
    ? includeHvoMap[selectedTariff]
    : true; // Por defecto incluido

  const toggleIncludeHvo = () => {
    setIncludeHvoMap((prev) => {
      const nextVal = !isHvoIncluded;
      const updated = { ...prev, [selectedTariff]: nextVal };
      try {
        localStorage.setItem('efi_pdf_include_hvo_map', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const [activeStationsMap, setActiveStationsMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('efi_tariff_active_stations_map');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Por defecto todas las estaciones activas
    return {};
  });

  // Obtener lista de estaciones activas para la tarifa actual
  const currentActiveStations = activeStationsMap[selectedTariff] !== undefined
    ? activeStationsMap[selectedTariff]
    : allStations.map((st) => st.name);

  const isStationActive = (stName: string) => {
    return currentActiveStations.includes(stName);
  };

  const toggleStationActive = (stName: string) => {
    const nextList = isStationActive(stName)
      ? currentActiveStations.filter((n) => n !== stName)
      : [...currentActiveStations, stName];

    setActiveStationsMap((prev) => {
      const updated = { ...prev, [selectedTariff]: nextList };
      try {
        localStorage.setItem('efi_tariff_active_stations_map', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleSelectAllStations = () => {
    const allNames = allStations.map((st) => st.name);
    setActiveStationsMap((prev) => {
      const updated = { ...prev, [selectedTariff]: allNames };
      try {
        localStorage.setItem('efi_tariff_active_stations_map', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleDeselectAllStations = () => {
    setActiveStationsMap((prev) => {
      const updated = { ...prev, [selectedTariff]: [] };
      try {
        localStorage.setItem('efi_tariff_active_stations_map', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Añadir nueva tarifa
  const handleAddNewTariff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTariffName.trim()) return;

    const formattedName = newTariffName.trim().toUpperCase();
    const markupNum = parseFloat(newTariffMarkup.replace(',', '.')) || 0.1350;

    const nextList = [...tariffsList, { name: formattedName, markup: markupNum }];
    setTariffsList(nextList);
    setSelectedTariff(formattedName);

    try {
      localStorage.setItem('efi_custom_tariffs_list', JSON.stringify(nextList));
    } catch (e) {}

    setShowAddTariffModal(false);
    setNewTariffName('');
    setNewTariffMarkup('0.1350');
    setDownloadNotice(`Nueva tarifa añadida: ${formattedName}`);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  // Markup actual
  const currentTariffObj = tariffsList.find((t) => t.name === selectedTariff);
  const currentMarkup = currentTariffObj ? currentTariffObj.markup : 0.125;

  // Obtener precios exactos de la Sábana de Precios / Compras para cada estación
  const getStationPrice = (stName: string, isPropia: boolean) => {
    let basePrice = 0;
    const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').trim();

    try {
      const savedDate = localStorage.getItem(`efi_purchases_${targetDate}`);
      const savedGlobal = localStorage.getItem('efi_compras_data');
      const pData = savedDate ? JSON.parse(savedDate).data : savedGlobal ? JSON.parse(savedGlobal).data : null;

      if (pData) {
        const key = `${stName}_GOA`;
        if (pData[key]?.sale) {
          basePrice = parseFloat(pData[key].sale.toString().replace(',', '.'));
        } else {
          const matchedKey = Object.keys(pData).find((k) => {
            if (!k.endsWith('_GOA')) return false;
            const baseK = k.replace(/_GOA$/, '').toUpperCase().replace(/^ES\s+/, '').trim();
            return baseK === cleanTarget || baseK.includes(cleanTarget) || cleanTarget.includes(baseK);
          });
          if (matchedKey && pData[matchedKey]?.sale) {
            basePrice = parseFloat(pData[matchedKey].sale.toString().replace(',', '.'));
          }
        }
      }
    } catch (e) {}

    // Fallback de Costo Total si aún no se ha guardado en compras
    if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
      const costs = STATION_EXCEL_COSTS[stName] || {
        porte: 0.0050,
        pase: 0.0100,
        fin: 0.0100,
        defaultCurr: 1.2000,
      };
      basePrice = Number((costs.defaultCurr + costs.porte + costs.pase + costs.fin).toFixed(4));
    }

    const sinIva = Number((basePrice + currentMarkup).toFixed(3));
    const conIva = Number((sinIva * 1.21).toFixed(3));
    return { sinIva, conIva };
  };

  // Precios dinámicos de HVO desde Postes
  const hvoPrices = (() => {
    try {
      const saved = localStorage.getItem('efi_postes_data_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        const base = parseFloat(parsed.hvoGeneralBase || '1.2000');
        const add = parseFloat(parsed.hvoGeneralAddition || '0.3280');
        const genSinIva = base + add;
        const genConIva = genSinIva * 1.21;

        const valAdd = parseFloat(parsed.hvoValdemoroAddition || '0.0700');
        const valGoa = parseFloat(parsed.postes?.['VALDEMORO']?.goa || '1.489');
        const valConIva = valGoa + valAdd;
        const valSinIva = valConIva / 1.21;

        return {
          alfajarinSinIva: genSinIva.toFixed(3),
          alfajarinConIva: genConIva.toFixed(3),
          valdemoroSinIva: valSinIva.toFixed(3),
          valdemoroConIva: valConIva.toFixed(3),
        };
      }
    } catch (e) {}
    return {
      alfajarinSinIva: '1.256',
      alfajarinConIva: '1.520',
      valdemoroSinIva: '1.347',
      valdemoroConIva: '1.630',
    };
  })();

  // Filtrado por búsqueda y por estación activa para el preview/impresión
  const filteredActiveStations = allStations
    .filter((st) => isStationActive(st.name))
    .filter((st) => st.name.toLowerCase().includes(searchFilter.toLowerCase()));

  const handlePrintPdf = () => {
    const cleanTariffName = selectedTariff.replace(/\s+/g, '_').toUpperCase();
    const fileName = `${cleanTariffName}_VALIDO_A_PARTIR_DE_${targetDate}.pdf`;

    const originalTitle = document.title;
    document.title = fileName.replace('.pdf', '');
    window.print();
    document.title = originalTitle;

    setDownloadNotice(fileName);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <FileText className="h-4 w-4" />
              <span>Emisión Oficial de Tarifas & Descarga de PDFs</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Generador Oficial de PDFs para Clientes
            </h2>
            <p className="text-slate-400 text-sm">
              Selecciona las estaciones activas con el checkbox <strong className="text-emerald-400">[✓]</strong> para que solo se incluyan en el PDF las estaciones válidas para esta tarifa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddTariffModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/40 shadow-md transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir Nueva Tarifa</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Descargar / Imprimir PDF ({filteredActiveStations.length} EESS)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel: Select Tariff & Date */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Fecha de Validez del Documento:
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Buscar Estación:
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar por nombre o ubicación..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tariffs List Selector */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Seleccionar Tarifa: <span className="text-amber-400">{selectedTariff}</span>
            </label>
            <span className="text-xs text-slate-500 font-mono">Markup: +{currentMarkup.toFixed(4)} €</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 max-h-48 overflow-y-auto pr-1">
            {tariffsList.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelectedTariff(t.name)}
                className={`p-2.5 rounded-xl text-left border transition-all text-xs font-bold truncate ${
                  selectedTariff === t.name
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Checkbox Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Estaciones Activas para <strong className="text-white">{selectedTariff}</strong>:</span>
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
              {currentActiveStations.length} de {allStations.length} Seleccionadas
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectAllStations}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all flex items-center space-x-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
              <span>Activar Todas</span>
            </button>
            <button
              onClick={handleDeselectAllStations}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all flex items-center space-x-1.5"
            >
              <Square className="h-3.5 w-3.5 text-rose-400" />
              <span>Deseleccionar Todas</span>
            </button>
          </div>
        </div>

        {/* Interruptor para Incluir o Quitar Banners de HVO en esta Tarifa */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${isHvoIncluded ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Información de HVO en este PDF</span>
              <span className="text-[11px] text-slate-400">
                {isHvoIncluded
                  ? `Banners de HVO Alfajarín y Valdemoro ACTIVOS para ${selectedTariff}`
                  : `Banners de HVO OCULTOS para ${selectedTariff}`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleIncludeHvo}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-md active:scale-95 ${
              isHvoIncluded
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {isHvoIncluded ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            <span>{isHvoIncluded ? 'HVO Incluido en PDF [✓]' : 'HVO Oculto en PDF [✗]'}</span>
          </button>
        </div>
      </div>

      {/* DOCUMENT PREVIEW & PDF CONTAINER */}
      <div className="printable-document bg-white text-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-300 space-y-6 print:p-0 print:border-none print:shadow-none print:m-0">
        
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tight text-slate-950">AREA 117</span>
              <span className="text-xs bg-slate-900 text-white font-bold px-2 py-0.5 rounded">RED PETRÓLEO</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1 uppercase tracking-tight">
              CONDICIONES DE SUMINISTRO — {selectedTariff}
            </h1>
          </div>
          <div className="text-right sm:text-right">
            <span className="text-xs font-bold text-slate-500 uppercase block">Fecha de Aplicación:</span>
            <span className="text-base font-black text-slate-950 font-mono">{targetDate}</span>
          </div>
        </div>

        {/* HVO Banner Highlights (Opcional por tarifa) */}
        {isHvoIncluded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="font-black text-amber-900 block text-[11px] uppercase">
                  GASÓLEO HVO EN ALFAJARÍN — ALFA ENERGÍA
                </span>
                <span className="text-slate-600 text-[10px]">Hidrobiodiésel Renovable</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-amber-950 block">SIN IVA: {hvoPrices.alfajarinSinIva.replace('.', ',')} €/L</span>
                <span className="text-[10px] text-amber-800">CON IVA: {hvoPrices.alfajarinConIva.replace('.', ',')} €/L</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="font-black text-amber-900 block text-[11px] uppercase">
                  GASÓLEO HVO EN VALDEMORO — AREA 117
                </span>
                <span className="text-slate-600 text-[10px]">Hidrobiodiésel Renovable</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-amber-950 block">SIN IVA: {hvoPrices.valdemoroSinIva.replace('.', ',')} €/L</span>
                <span className="text-[10px] text-amber-800">CON IVA: {hvoPrices.valdemoroConIva.replace('.', ',')} €/L</span>
              </div>
            </div>
          </div>
        )}

        {/* Stations Table con Columna de Estaciones Activas Checkbox */}
        <div className="overflow-x-auto border border-slate-300 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                <th className="py-2.5 px-3 w-12 text-center">Nº</th>
                <th className="py-2.5 px-3 print:hidden text-center w-28 bg-slate-800 text-emerald-300">
                  Estación Activa
                </th>
                <th className="py-2.5 px-3">E.E.S.S</th>
                <th className="py-2.5 px-3">Bandera</th>
                <th className="py-2.5 px-3">Ubicación</th>
                <th className="py-2.5 px-3 text-right">Sin IVA</th>
                <th className="py-2.5 px-3 text-right">Con IVA 21%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {allStations
                .filter((st) => st.name.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((st, idx) => {
                  const active = isStationActive(st.name);
                  const isPropia = st.type === 'PROPIA';
                  const prices = getStationPrice(st.name, isPropia);
                  const meta = STATIONS_METADATA[st.name] || {
                    bandera: isPropia ? 'AREA 117' : 'VALCARCE',
                    ubicacion: 'Red de Estaciones de Servicio',
                  };

                  return (
                    <tr
                      key={st.name}
                      className={`transition-colors ${
                        active ? 'hover:bg-slate-50' : 'bg-slate-100/60 opacity-40 print:hidden'
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-bold text-slate-500 font-mono">
                        {idx + 1}
                      </td>

                      {/* Columna Estación Activa con Checkbox Interactivo */}
                      <td className="py-2 px-3 text-center print:hidden bg-slate-50/50">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleStationActive(st.name)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className={`text-[10px] font-bold ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {active ? 'Activa' : 'Inactiva'}
                          </span>
                        </label>
                      </td>

                      <td className="py-2 px-3 font-bold text-slate-950">
                        {st.name}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-300">
                          {meta.bandera}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px]">
                        {meta.ubicacion}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                        {prices.sinIva.toFixed(3).replace('.', ',')} €
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-700 text-xs bg-emerald-50/50">
                        {prices.conIva.toFixed(3).replace('.', ',')} €
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Document Footer */}
        <div className="pt-4 border-t border-slate-200 text-slate-500 text-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Área 117 — Sistema Automatizado de Gestión de Tarifas Petrolíferas</span>
          <span>Validez sujeta a variaciones de mercado. IVA 21% incluido en columna correspondiente.</span>
        </div>
      </div>

      {/* MODAL: Añadir Nueva Tarifa */}
      {showAddTariffModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Plus className="h-4 w-4" />
                <span>Crear Nueva Tarifa</span>
              </div>
              <button
                onClick={() => setShowAddTariffModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewTariff} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  Nombre de la Tarifa:
                </label>
                <input
                  type="text"
                  placeholder="Ej: TARIFA 32, TARIFA GRUPO LOGISTICO"
                  value={newTariffName}
                  onChange={(e) => setNewTariffName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white uppercase font-bold focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  Margen / Markup sobre Base (€):
                </label>
                <input
                  type="text"
                  placeholder="0.1350"
                  value={newTariffMarkup}
                  onChange={(e) => setNewTariffMarkup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono font-bold focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddTariffModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
                >
                  Guardar y Usar Tarifa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notice */}
      {downloadNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5">
          <Check className="h-5 w-5" />
          <span>{downloadNotice}</span>
        </div>
      )}
    </div>
  );
}
