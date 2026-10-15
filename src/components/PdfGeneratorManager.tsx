'use client';

import { workspaceStorage } from '@/lib/workspaceStorage';
import { SABANA_PRICES_KEY, HVO_PRICES_KEY, SABANA_PRICES_EVENT, HVO_PRICES_EVENT, SabanaPrices, HvoPrices, pdfStationSource, publishedStationPrice } from '@/lib/publishedPrices';
import { PdfPriceSourcesModal } from './PdfPriceSourcesModal';

import React, { useState, useEffect, useMemo } from 'react';
import { getAllStations } from '@/lib/stationsService';
import { Printer, FileText, Search, Check, Plus, CheckSquare, Square, Trash2, X, Flame, AlertTriangle, ShieldAlert, RotateCcw, Sliders, Tag } from 'lucide-react';

interface PdfGeneratorProps {
  isActive?: boolean;
  selectedDate: string;
}

// Catálogo Oficial de Estaciones con Bandera y Dirección Exactas del Catálogo
const STATIONS_METADATA: Record<string, { bandera: string; ubicacion: string }> = {
  // 1. RIBA-RROJA / RIBA-ROJA / ES RIBA-ROJA
  'RIBA-RROJA': { bandera: 'EXOIL', ubicacion: 'Polígono Industrial el Oliveral, Calle U, número 4, 46394 Riba-roja de Túria, Valencia' },
  'RIBA-ROJA': { bandera: 'EXOIL', ubicacion: 'Polígono Industrial el Oliveral, Calle U, número 4, 46394 Riba-roja de Túria, Valencia' },
  'ES RIBA-ROJA': { bandera: 'EXOIL', ubicacion: 'Polígono Industrial el Oliveral, Calle U, número 4, 46394 Riba-roja de Túria, Valencia' },

  // 2. PISTA DE SILLA / ES PISTA DE SILLA
  'PISTA DE SILLA': { bandera: 'EXOIL', ubicacion: 'Camí pont de pedra, 3, 46910, Valencia' },
  'ES PISTA DE SILLA': { bandera: 'EXOIL', ubicacion: 'Camí pont de pedra, 3, 46910, Valencia' },

  // 3. REAL DE GANDÍA / REAL DE GANDIA / ES REAL DE GANDIA
  'REAL DE GANDÍA': { bandera: 'EXOIL', ubicacion: "Carrer Travessera D'Albaida, 62, 46727 El Real de Gandia, Valencia" },
  'REAL DE GANDIA': { bandera: 'EXOIL', ubicacion: "Carrer Travessera D'Albaida, 62, 46727 El Real de Gandia, Valencia" },
  'ES REAL DE GANDIA': { bandera: 'EXOIL', ubicacion: "Carrer Travessera D'Albaida, 62, 46727 El Real de Gandia, Valencia" },

  // 4. CHIVA / ES CHIVA
  'CHIVA': { bandera: 'EXOIL', ubicacion: 'C. Ramón y Cajal, 53, Valencia' },
  'ES CHIVA': { bandera: 'EXOIL', ubicacion: 'C. Ramón y Cajal, 53, Valencia' },

  // 5. ALBERIC / ES ALBERIC
  'ALBERIC': { bandera: 'EXOIL', ubicacion: 'AV. La Marquesa, 14, 46260 Alberic, Valencia' },
  'ES ALBERIC': { bandera: 'EXOIL', ubicacion: 'AV. La Marquesa, 14, 46260 Alberic, Valencia' },

  // 6. CATARROJA
  'CATARROJA': { bandera: 'EXOIL', ubicacion: 'Camí Vell de Russafa, 418 - 46470 Catarroja, Valencia' },

  // 7. MANISES / MANISES - EXOIL
  'MANISES': { bandera: 'EXOIL', ubicacion: 'Avinguda de la Cova, 62, 46940 Manises, Valencia' },
  'MANISES - EXOIL': { bandera: 'EXOIL', ubicacion: 'Avinguda de la Cova, 62, 46940 Manises, Valencia' },

  // 8. TORREJON
  'TORREJON': { bandera: 'VALCARCE', ubicacion: 'Avenida ronda sur 3, Polígono industrial los almendros, 28850 – Torrejón de Ardoz, Madrid' },

  // 9. ARCOS JALON
  'ARCOS JALON': { bandera: 'AREA 117', ubicacion: 'Calle Malita, 15 - Arcos de Jalón' },

  // 10. ALFAJARIN
  'ALFAJARIN': { bandera: 'ALFA ENERGIA', ubicacion: 'Pl. del Saco, 12 - 50172 Alfajarín, Zaragoza' },

  // 11. TORREMOCHA
  'TORREMOCHA': { bandera: 'AREA117', ubicacion: 'Área de Servicio A2, KM 117 19268 - Torremocha del Campo' },

  // 12. MADRID
  'MADRID': { bandera: 'AREA 117', ubicacion: 'Vía de Servicio A-3, KM 11, 28031 Madrid' },

  // 13. VALLECAS
  'VALLECAS': { bandera: 'AREA 117', ubicacion: 'Av. de la Democracia, 15, 28031 Madrid' },

  // 14. VALDEMORO / ES VALDEMORO
  'VALDEMORO': { bandera: 'AREA 117', ubicacion: 'C/ Narciso Monturiol 28, Pol. Industrial Rompecubas, 28341 Valdemoro' },
  'ES VALDEMORO': { bandera: 'AREA 117', ubicacion: 'C/ Narciso Monturiol 28, Pol. Industrial Rompecubas, 28341 Valdemoro' },

  // 15. PAMPLONA
  'PAMPLONA': { bandera: 'ALAITZ', ubicacion: 'N-121, KM11,3 - 31398 Muruarte de Reta, Navarra' },

  // 16. HUMILLADERO
  'HUMILLADERO': { bandera: 'AREA117', ubicacion: 'Al autovia A92, KM. 138,20, 29531 Humilladero, Malaga' },

  // 17. UCLES
  'UCLES': { bandera: 'VALCARCE', ubicacion: 'Autovía del Este, KM 90, 16420 Villarrubio, Cuenca' },

  // 18. BENAMEJI
  'BENAMEJI': { bandera: 'AREA117', ubicacion: 'Estación de servicio Cepsa EL BERROCAL, N-331, PK: 96, 14910 Benamejí, Córdoba, España' },

  // 19. SORIA ALCUBILLAS
  'SORIA ALCUBILLAS': { bandera: 'AREA117', ubicacion: 'A-15, km, Salida 13, 42213 Alcubilla de las Peñas, Soria' },

  // 20. ABRERA
  'ABRERA': { bandera: 'HAM', ubicacion: 'Carrer del Treball, 1, 08630 Abrera, Barcelona' },

  // 21. VALDEHERRERA
  'VALDEHERRERA': { bandera: 'PETROBIL', ubicacion: 'Area de servicio Valdeherrera A2, KM 231, 50300 Calatayud, Zaragoza' },

  // 22. EL CASAR
  'EL CASAR': { bandera: 'VALCARCE', ubicacion: 'Cam. Pilón, 2, 45614 El Casar de Talavera, Toledo' },

  // 23. LA JOYOSA
  'LA JOYOSA': { bandera: 'VALCARCE', ubicacion: 'Autovía de Logroño, A-68 - Salida 257' },

  // 24. JUNDIZ / JUNDIZ NORPETROL
  'JUNDIZ': { bandera: 'NORPETROL', ubicacion: 'Margarita Entitatea, 16, 01195 Margarita, Araba, España' },
  'JUNDIZ NORPETROL': { bandera: 'NORPETROL', ubicacion: 'Margarita Entitatea, 16, 01195 Margarita, Araba, España' },

  // 25. OLIVERAL
  'OLIVERAL': { bandera: 'ALZ', ubicacion: 'Carrer A, 57 - 46394 Ribarroja de Túria, Valencia' },

  // 26. GUARROMAN
  'GUARROMAN': { bandera: 'VALCARCE', ubicacion: 'Carretera N-IV, Salida 280, al lado Hostal Mellizos' },

  // 27. VALDEPEÑAS
  'VALDEPEÑAS': { bandera: 'LA PARA ROCIERA', ubicacion: 'A-4, 210, 13730 Santa Cruz de Mudela, Ciudad Real' },

  // 28. OPEN
  'OPEN': { bandera: 'VALCARCE', ubicacion: 'Cam. Garrán, 23710 Bailén, Jaén, España' },

  // 29. TJOIL SEVILLA
  'TJOIL SEVILLA': { bandera: 'TJ OIL', ubicacion: 'C. Castilla la Mancha, 181, 41909 Salteras, Sevilla' },

  // 30. BENAVENTE
  'BENAVENTE': { bandera: 'VALCARCE', ubicacion: 'C. Cañada Berciano - 49600 Benavente, Zamora' },

  // 31. IRUN ZAISA III
  'IRUN ZAISA III': { bandera: 'VALCARCE', ubicacion: 'Antxotxipi Kalea, 4 - 20305 Irun, Gipuzkoa' },

  // 32. TARRAGONA
  'TARRAGONA': { bandera: 'BIOESTACIONES', ubicacion: 'CL SOFRE, POL. IND. RIU-CLAR, 3' },

  // 33. LACHAR
  'LACHAR': { bandera: 'VALCARCE', ubicacion: 'Autovía A-92 Carretera Lachar Peñuelas Parcela 301-302 Salida 221' },

  // 34. LA CAMPANA
  'LA CAMPANA': { bandera: 'RUTA 4', ubicacion: 'Autovia A4 - Salida KM 482, 41429, Sevilla' },

  // 35. AVILESINA
  'AVILESINA': { bandera: 'VALCARCE', ubicacion: 'Lugar Silvota, AS-19, KM-15, 700, 33468 Trasona, Asturias' },

  // 36. GOR
  'GOR': { bandera: 'VALCARCE', ubicacion: 'A-92N, PK 12, 18870 GOR, Granada' },

  // 37. LLERS
  'LLERS': { bandera: 'PETROMIRALLES', ubicacion: 'Ctra, N-II, Km 760, 17730 Llers, Girona' },

  // 38. DARRO - A92
  'DARRO - A92': { bandera: 'A-92', ubicacion: 'Autovia 92 P.K. 282, 18181 Darro, Granada' },

  // 39. MERIDA
  'MERIDA': { bandera: 'NIEVES', ubicacion: 'Polígono Industrial El Prado, Autovía del Suroeste, Salida 34, 06800 Mérida, Badajoz' },

  // 40. SANCTI-SPIRITUS
  'SANCTI-SPIRITUS': { bandera: 'NIEVES', ubicacion: 'Pol. Ind. Sancti-Spiritus, C. el Majadal, 8, 37470 Sancti-Spíritus, Salamanca' },

  // 41. MURCIA
  'MURCIA': { bandera: 'MILL SERVICES', ubicacion: 'c/ Valencia 14-16 Pol indus Los Torraos de Ceutí' },

  // 42. NORIOIL
  'NORIOIL': { bandera: 'NORIOIL', ubicacion: 'N-630, 06200 Almendralejo, Badajoz' },

  // 43. SAN VICENTE DEL PALACIO
  'SAN VICENTE DEL PALACIO': { bandera: 'VALCARCE', ubicacion: 'A-6, salida147, 47493 Medina del Campo, Valladolid' },

  // 44. WATERY ARANDA
  'WATERY ARANDA': { bandera: 'VALCARCE', ubicacion: 'C. Vendimia, 2, 09400 Aranda de Duero, Burgos' },

  // 45. BERA
  'BERA': { bandera: 'PETROMIRALLES', ubicacion: 'Poligono Industrial Zalain, 18, 31780 Bera, Navarra' },

  // 46. PUERTO BARCELONA / PUERTO DE BARCELONA
  'PUERTO BARCELONA': { bandera: 'PETROMIRALES', ubicacion: "Delta 1, Moll d'inflamables, Carrer del Port de Haifa, 3, 08039 Barcelona, España" },
  'PUERTO DE BARCELONA': { bandera: 'PETROMIRALES', ubicacion: "Delta 1, Moll d'inflamables, Carrer del Port de Haifa, 3, 08039 Barcelona, España" },

  // 47. GIRONA-CALSINA
  'GIRONA-CALSINA': { bandera: 'CALSINA CARRÉ', ubicacion: 'Camí del Roure, 5, 17706 Pont de Molins, Girona' },

  // 48. FEGOBLAN PONTEVEDRA
  'FEGOBLAN PONTEVEDRA': { bandera: 'VALCARCE', ubicacion: 'Gasolineira Valcarce, 36419, Pontevedra' },

  // 49. VEGA DE VALCARCE
  'VEGA DE VALCARCE': { bandera: 'VALCARCE', ubicacion: 'Ctra. N 6, Km 418, 24524 La Portela de Valcarce, León' },

  // 50. HOILA TOLEDO
  'HOILA TOLEDO': { bandera: 'HOLIA', ubicacion: 'C. Alfareros, 45200 Illescas, Toledo' },

  // 51. FIGUERES / PETREM FIGUERES / PETREM TRUCKS FIGUERES
  'FIGUERES': { bandera: 'PETREM', ubicacion: "AP-7 Sortida 4 - Corral Roig s/n 17771 Sta. Llogaia D'Alguma" },
  'PETREM FIGUERES': { bandera: 'PETREM', ubicacion: "AP-7 Sortida 4 - Corral Roig s/n 17771 Sta. Llogaia D'Alguma" },
  'PETREM TRUCKS FIGUERES': { bandera: 'PETREM', ubicacion: "AP-7 Sortida 4 - Corral Roig s/n 17771 Sta. Llogaia D'Alguma" },

  // Compatibilidad adicional
  'MONTE REAL': { bandera: 'AREA 117', ubicacion: 'Red de Estaciones de Servicio' },
};

const getStationMetadata = (stationName: string, isPropia: boolean): { bandera: string; ubicacion: string } => {
  if (STATIONS_METADATA[stationName]) return STATIONS_METADATA[stationName];
  const upper = stationName.toUpperCase().trim();
  if (STATIONS_METADATA[upper]) return STATIONS_METADATA[upper];
  const withoutEs = upper.replace(/^ES\s+/, '').trim();
  if (STATIONS_METADATA[withoutEs]) return STATIONS_METADATA[withoutEs];
  const stripped = withoutEs.replace(/-/g, ' ');
  for (const [key, val] of Object.entries(STATIONS_METADATA)) {
    if (key.toUpperCase().replace(/-/g, ' ') === stripped) return val;
  }
  return {
    bandera: isPropia ? 'AREA 117' : 'VALCARCE',
    ubicacion: 'Red de Estaciones de Servicio',
  };
};

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
  { name: 'AMAEXO', markup: 0.0360 },
  { name: 'E100', markup: 0.0360 },
  { name: 'TARIFA ECO', markup: 0.0500 },
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
  { name: 'ECOTRANS', markup: 0.0500 },
  { name: 'TARIFA 30', markup: 0.0138 },
  { name: 'TARIFA 27 SUR', markup: 0.0270 },
  { name: 'TARIFA 15 SUR', markup: 0.0150 },
  { name: 'TARIFA 75', markup: 0.0380 },
  { name: 'TRANFIRRED GOB', markup: 0.0000 },
];

export interface CustomSourceConfig {
  sourceType: string;
  manualPriceSinIva?: number;
}

export function PdfGeneratorManager({ selectedDate, isActive = true }: PdfGeneratorProps) {
  const [tariffsList, setTariffsList] = useState<{ name: string; markup: number }[]>(() => {
    try {
      const savedDeleted = workspaceStorage.getItem('efi_deleted_tariffs_list');
      const deletedList: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];

      const saved = workspaceStorage.getItem('efi_custom_tariffs_catalog_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((t: any) => t && t.name && !deletedList.includes(t.name))
            .map((t: any) => {
              if (t.name === 'AMAEXO' || t.name === 'E100') return { ...t, markup: 0.0360 };
              if (t.name === 'TARIFA ECO' || t.name === 'ECOTRANS') return { ...t, markup: 0.0500 };
              return t;
            });
        }
      }
      const initial = INITIAL_TARIFFS_LIST.filter((t) => !deletedList.includes(t.name));
      workspaceStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(initial));
      workspaceStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(initial));
      workspaceStorage.setItem('efi_custom_tariffs_list', JSON.stringify(initial));
      return initial;
    } catch (e) {}
    return INITIAL_TARIFFS_LIST;
  });

  const [selectedTariff, setSelectedTariff] = useState('TARIFA 12');
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    tariffName: string;
    step: 1 | 2;
  }>({
    isOpen: false,
    tariffName: '',
    step: 1,
  });

  const [targetDate, setTargetDate] = useState<string>(() => {
    try {
      return workspaceStorage.getItem('efi_compras_valid_from') || selectedDate || new Date().toISOString().split('T')[0];
    } catch (e) {
      return selectedDate;
    }
  });

  useEffect(() => {
    const updateValidDate = () => {
      try {
        const saved = workspaceStorage.getItem('efi_compras_valid_from');
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

  const [, setPostesRefreshTrigger] = useState(0);

  useEffect(() => {
    const handlePostesUpdate = () => {
      setPostesRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener('efi_postes_updated', handlePostesUpdate);
    window.addEventListener(SABANA_PRICES_EVENT, handlePostesUpdate);
    window.addEventListener(HVO_PRICES_EVENT, handlePostesUpdate);
    window.addEventListener('efi_compras_updated', handlePostesUpdate);
    window.addEventListener('efi_sabana_updated', handlePostesUpdate);
    window.addEventListener('efi_valid_date_changed', handlePostesUpdate);
    window.addEventListener('storage', handlePostesUpdate);

    return () => {
      window.removeEventListener('efi_postes_updated', handlePostesUpdate);
      window.removeEventListener(SABANA_PRICES_EVENT, handlePostesUpdate);
      window.removeEventListener(HVO_PRICES_EVENT, handlePostesUpdate);
      window.removeEventListener('efi_compras_updated', handlePostesUpdate);
      window.removeEventListener('efi_sabana_updated', handlePostesUpdate);
      window.removeEventListener('efi_valid_date_changed', handlePostesUpdate);
      window.removeEventListener('storage', handlePostesUpdate);
    };
  }, []);

  // Sincronizar catálogo inicial si no existe, respetando permanentemente las tarifas eliminadas
  useEffect(() => {
    try {
      const savedDeleted = workspaceStorage.getItem('efi_deleted_tariffs_list');
      const deletedList: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];

      const saved = workspaceStorage.getItem('efi_custom_tariffs_catalog_v5');
      if (!saved) {
        const initial = INITIAL_TARIFFS_LIST.filter((t) => !deletedList.includes(t.name));
        setTariffsList(initial);
        workspaceStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(initial));
        workspaceStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(initial));
        workspaceStorage.setItem('efi_custom_tariffs_list', JSON.stringify(initial));
      } else {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed
            .filter((t: any) => t && t.name && !deletedList.includes(t.name))
            .map((t: any) => {
              if (t.name === 'AMAEXO' || t.name === 'E100') return { ...t, markup: 0.0360 };
              if (t.name === 'TARIFA ECO' || t.name === 'ECOTRANS') return { ...t, markup: 0.0500 };
              return t;
            });
          setTariffsList(filtered);
          workspaceStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(filtered));
          workspaceStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(filtered));
          workspaceStorage.setItem('efi_custom_tariffs_list', JSON.stringify(filtered));
        }
      }
    } catch (e) {}
  }, []);

  // Proteger ante Cierre de Día: las tarifas eliminadas NUNCA deben reaparecer al cerrar el día
  useEffect(() => {
    const handleCierreDia = () => {
      try {
        const savedDeleted = workspaceStorage.getItem('efi_deleted_tariffs_list');
        const deletedList: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];

        setTariffsList((prev) => {
          const filtered = prev.filter((t) => !deletedList.includes(t.name));
          workspaceStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(filtered));
          workspaceStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(filtered));
          workspaceStorage.setItem('efi_custom_tariffs_list', JSON.stringify(filtered));
          return filtered;
        });
      } catch (e) {}
    };

    window.addEventListener('efi_cierre_dia', handleCierreDia);
    return () => {
      window.removeEventListener('efi_cierre_dia', handleCierreDia);
    };
  }, []);

  const handleRestoreAllTariffs = () => {
    setTariffsList(INITIAL_TARIFFS_LIST);
    try {
      workspaceStorage.removeItem('efi_deleted_tariffs_list');
      workspaceStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(INITIAL_TARIFFS_LIST));
      workspaceStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(INITIAL_TARIFFS_LIST));
      workspaceStorage.setItem('efi_custom_tariffs_list', JSON.stringify(INITIAL_TARIFFS_LIST));
    } catch (e) {}
    setDownloadNotice(`Catálogo completo oficial restaurado (${INITIAL_TARIFFS_LIST.length} Tarifas)`);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  const [searchFilter, setSearchFilter] = useState('');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Modal para Añadir Nueva Tarifa
  const [showAddTariffModal, setShowAddTariffModal] = useState(false);
  const [newTariffName, setNewTariffName] = useState('');
  const [newTariffSource, setNewTariffSource] = useState('');

  const [stationsVersion, setStationsVersion] = useState(0);
  const allStations = useMemo(() => getAllStations(), [stationsVersion]);

  useEffect(() => {
    const handleStationsUpdated = () => setStationsVersion((v) => v + 1);
    window.addEventListener('efi_stations_updated', handleStationsUpdated);
    return () => window.removeEventListener('efi_stations_updated', handleStationsUpdated);
  }, []);

  // Gestión de etiquetas de estaciones (rectángulos anaranjados y filas en amarillo claro)
  const [stationLabels, setStationLabels] = useState<Record<string, string[]>>(() => {
    try {
      const saved = workspaceStorage.getItem('efi_pdf_station_labels_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          const normalized: Record<string, string[]> = {};
          Object.entries(parsed).forEach(([k, v]) => {
            if (Array.isArray(v)) {
              normalized[k] = v.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
            } else if (typeof v === 'string' && v.trim().length > 0) {
              normalized[k] = [v.trim()];
            }
          });
          return normalized;
        }
      }
    } catch (e) {}
    return {};
  });

  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [selectedStationForLabel, setSelectedStationForLabel] = useState('');

  // Sincronizar etiquetas reactivamente ante eventos y cambios entre pestañas
  useEffect(() => {
    const handleLabelsUpdate = () => {
      try {
        const saved = workspaceStorage.getItem('efi_pdf_station_labels_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed === 'object' && parsed !== null) {
            const normalized: Record<string, string[]> = {};
            Object.entries(parsed).forEach(([k, v]) => {
              if (Array.isArray(v)) {
                normalized[k] = v.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
              } else if (typeof v === 'string' && v.trim().length > 0) {
                normalized[k] = [v.trim()];
              }
            });
            setStationLabels(normalized);
            return;
          }
        }
        setStationLabels({});
      } catch (e) {}
    };
    window.addEventListener('efi_station_labels_updated', handleLabelsUpdate);
    window.addEventListener('storage', handleLabelsUpdate);
    return () => {
      window.removeEventListener('efi_station_labels_updated', handleLabelsUpdate);
      window.removeEventListener('storage', handleLabelsUpdate);
    };
  }, []);

  const getStationLabels = (stName: string): string[] => {
    if (!stName) return [];
    const direct = stationLabels[stName];
    if (Array.isArray(direct) && direct.length > 0) return direct;

    const clean = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    const byClean = stationLabels[clean];
    if (Array.isArray(byClean) && byClean.length > 0) return byClean;

    for (const [k, v] of Object.entries(stationLabels)) {
      if (k.toUpperCase().replace(/^ES\s+/, '').trim() === clean) {
        if (Array.isArray(v) && v.length > 0) return v;
      }
    }
    return [];
  };

  const hasAnyLabels = useMemo(() => {
    return Object.values(stationLabels).some((arr) => Array.isArray(arr) && arr.length > 0);
  }, [stationLabels]);

  const assignedLabelsList = useMemo(() => {
    const list: { station: string; label: string }[] = [];
    Object.entries(stationLabels).forEach(([stName, labels]) => {
      if (Array.isArray(labels)) {
        labels.forEach((lbl) => {
          if (lbl && lbl.trim()) {
            list.push({ station: stName, label: lbl.trim() });
          }
        });
      }
    });
    return list;
  }, [stationLabels]);

  const existingLabelNames = useMemo(() => {
    const set = new Set<string>();
    Object.values(stationLabels).forEach((labels) => {
      if (Array.isArray(labels)) {
        labels.forEach((lbl) => {
          if (lbl && lbl.trim()) set.add(lbl.trim());
        });
      }
    });
    return Array.from(set);
  }, [stationLabels]);

  const handleAssignLabel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = newLabelText.trim().toUpperCase();
    if (!trimmedLabel || !selectedStationForLabel) return;

    const current = stationLabels[selectedStationForLabel] || [];
    if (current.includes(trimmedLabel)) {
      setDownloadNotice(`La estación ${selectedStationForLabel} ya tiene la etiqueta ${trimmedLabel}`);
      setTimeout(() => setDownloadNotice(null), 3000);
      return;
    }

    const updated: Record<string, string[]> = {
      ...stationLabels,
      [selectedStationForLabel]: [...current, trimmedLabel],
    };

    setStationLabels(updated);
    try {
      workspaceStorage.setItem('efi_pdf_station_labels_v1', JSON.stringify(updated));
      window.dispatchEvent(new Event('efi_station_labels_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error(err);
    }

    setDownloadNotice(`Etiqueta "${trimmedLabel}" asignada a ${selectedStationForLabel}`);
    setTimeout(() => setDownloadNotice(null), 3500);
    setNewLabelText('');
  };

  const handleRemoveLabelAssignment = (station: string, labelToRemove: string) => {
    const current = stationLabels[station] || [];
    const filtered = current.filter((l) => l !== labelToRemove);
    const updated = { ...stationLabels };
    if (filtered.length > 0) {
      updated[station] = filtered;
    } else {
      delete updated[station];
    }

    setStationLabels(updated);
    try {
      workspaceStorage.setItem('efi_pdf_station_labels_v1', JSON.stringify(updated));
      window.dispatchEvent(new Event('efi_station_labels_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error(err);
    }

    setDownloadNotice(`Etiqueta "${labelToRemove}" eliminada de ${station}`);
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  const handleClearAllLabels = () => {
    if (window.confirm('¿Seguro que deseas eliminar todas las etiquetas asignadas a las estaciones?')) {
      setStationLabels({});
      try {
        workspaceStorage.removeItem('efi_pdf_station_labels_v1');
        window.dispatchEvent(new Event('efi_station_labels_updated'));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {}
      setDownloadNotice('Todas las etiquetas han sido eliminadas');
      setTimeout(() => setDownloadNotice(null), 3000);
    }
  };
    // Mapa para Incluir/Quitar información de HVO por Tarifa (TariffName -> boolean)
  const [includeHvoMap, setIncludeHvoMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = workspaceStorage.getItem('efi_pdf_include_hvo_map');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const isGobTariff = selectedTariff.toUpperCase().includes('GOB') ||
    selectedTariff.toUpperCase().includes('GASOLEO B') ||
    selectedTariff.toUpperCase().includes('GASÓLEO B');

  const isHvoIncluded = includeHvoMap[selectedTariff] !== undefined
    ? includeHvoMap[selectedTariff]
    : !isGobTariff; // Por defecto incluido salvo en GOB

  const toggleIncludeHvo = () => {
    setIncludeHvoMap((prev) => {
      const nextVal = !isHvoIncluded;
      const updated = { ...prev, [selectedTariff]: nextVal };
      try {
        workspaceStorage.setItem('efi_pdf_include_hvo_map', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const [activeStationsMap, setActiveStationsMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = workspaceStorage.getItem('efi_tariff_active_stations_map');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Por defecto todas las estaciones activas
    return {};
  });

  // Obtener lista de estaciones activas para la tarifa actual
  const currentActiveStations = activeStationsMap[selectedTariff] !== undefined
    ? activeStationsMap[selectedTariff]
    : isGobTariff
    ? allStations.filter((st) => {
        const u = st.name.toUpperCase();
        return u.includes('UCLES') || u.includes('TORREMOCHA') || u.includes('ARCOS');
      }).map((st) => st.name)
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
        workspaceStorage.setItem('efi_tariff_active_stations_map', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleSelectAllStations = () => {
    const allNames = allStations.map((st) => st.name);
    setActiveStationsMap((prev) => {
      const updated = { ...prev, [selectedTariff]: allNames };
      try {
        workspaceStorage.setItem('efi_tariff_active_stations_map', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleDeselectAllStations = () => {
    setActiveStationsMap((prev) => {
      const updated = { ...prev, [selectedTariff]: [] };
      try {
        workspaceStorage.setItem('efi_tariff_active_stations_map', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Mapeo Personalizado de Origen de Datos por Estación y Tarifa
  const [stationSourcesMapping, setStationSourcesMapping] = useState<Record<string, CustomSourceConfig>>(() => {
    try {
      const saved = workspaceStorage.getItem('efi_pdf_station_source_mapping_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const saveStationSourcesMapping = (updated: Record<string, CustomSourceConfig>) => {
    setStationSourcesMapping(updated);
    try {
      workspaceStorage.setItem('efi_pdf_station_source_mapping_v1', JSON.stringify(updated));
    } catch (e) {}
  };

  useEffect(() => workspaceStorage.subscribe((key, _before, after) => {
    if (key === 'efi_pdf_station_source_mapping_v1') {
      try { setStationSourcesMapping(JSON.parse(after || '{}')); } catch { /* Keep the last valid mapping. */ }
    }
  }), []);

  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [sourcesModalTariff, setSourcesModalTariff] = useState(selectedTariff);

  const handleAddNewTariff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTariffName.trim()) return;

    const formattedName = newTariffName.trim().toUpperCase();
    if (!newTariffSource || !published?.sources[newTariffSource] || tariffsList.some(t => t.name === formattedName)) return;

    const nextList = [...tariffsList, { name: formattedName, markup: 0 }];
    setTariffsList(nextList);
    setSelectedTariff(formattedName);

    try {
      const savedDeleted = workspaceStorage.getItem('efi_deleted_tariffs_list');
      if (savedDeleted) {
        const deletedList: string[] = JSON.parse(savedDeleted);
        const updatedDeleted = deletedList.filter((n) => n !== formattedName);
        workspaceStorage.setItem('efi_deleted_tariffs_list', JSON.stringify(updatedDeleted));
      }
      workspaceStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(nextList));
      workspaceStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(nextList));
      workspaceStorage.setItem('efi_custom_tariffs_list', JSON.stringify(nextList));
    } catch (e) {}

    setShowAddTariffModal(false);
    setNewTariffName('');
    saveStationSourcesMapping({ ...stationSourcesMapping, [`${formattedName}::__DEFAULT__`]: { sourceType: newTariffSource } });
    setNewTariffSource('');
    setDownloadNotice(`Nueva tarifa añadida: ${formattedName}`);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  const published = workspaceStorage.readJson<SabanaPrices>(SABANA_PRICES_KEY);
  const getStationSource = (station: string, tariff = selectedTariff) => pdfStationSource(tariff, station, stationSourcesMapping, published);
  const getStationPrice = (station: string, _own: boolean, tariff = selectedTariff) =>
    publishedStationPrice(published, selectedDate, getStationSource(station, tariff), station) || { sinIva: NaN, conIva: NaN };
  const hvoSnapshot = workspaceStorage.readJson<HvoPrices>(HVO_PRICES_KEY);
  const hvoReady = hvoSnapshot?.date === selectedDate && [hvoSnapshot.alfajarin.sinIva, hvoSnapshot.alfajarin.conIva, hvoSnapshot.valdemoro.sinIva, hvoSnapshot.valdemoro.conIva].every(Number.isFinite);
  const hvoPrices = {
    alfajarinSinIva: hvoReady ? hvoSnapshot.alfajarin.sinIva.toFixed(3) : '—',
    alfajarinConIva: hvoReady ? hvoSnapshot.alfajarin.conIva.toFixed(3) : '—',
    valdemoroSinIva: hvoReady ? hvoSnapshot.valdemoro.sinIva.toFixed(3) : '—',
    valdemoroConIva: hvoReady ? hvoSnapshot.valdemoro.conIva.toFixed(3) : '—',
  };
  const formatPdfPrice = (price: number) => Number.isFinite(price) ? price.toFixed(3).replace('.', ',') : 'Sin origen';

  // Filtrado por búsqueda y por estación activa para el preview/impresión
  const filteredActiveStations = allStations
    .filter((st) => isStationActive(st.name))
    .filter((st) => st.name.toLowerCase().includes(searchFilter.toLowerCase()));

  // Lista de estaciones filtradas por texto de búsqueda para el preview y documento
  const filteredStations = useMemo(() => {
    return allStations.filter((st) =>
      st.name.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [allStations, searchFilter]);

  // Numeración correlativa consecutiva para las estaciones activas en PDF / impresión
  const activeStationsIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let count = 0;
    for (const st of filteredStations) {
      if (currentActiveStations.includes(st.name)) {
        count++;
        map.set(st.name, count);
      }
    }
    return map;
  }, [filteredStations, currentActiveStations]);

  // Formateador de fecha en orden DIA, MES, AÑO (DD/MM/YYYY)
  const formatDateDDMMYYYY = (isoDate: string): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return isoDate;
  };

  const handlePrintPdf = () => {
    if (filteredActiveStations.some(st => !Number.isFinite(getStationPrice(st.name, st.type === 'PROPIA').sinIva)) || (isHvoIncluded && !hvoReady)) {
      setDownloadNotice('No se puede generar el PDF: revisa los orígenes de precios de esta tarifa.');
      return;
    }
    const cleanTariffName = selectedTariff.replace(/\s+/g, '_').toUpperCase();
    const formattedDate = formatDateDDMMYYYY(targetDate).replace(/\//g, '-');
    const fileName = `${cleanTariffName}_VALIDO_A_PARTIR_DE_${formattedDate}.pdf`;

    const originalTitle = document.title;
    document.title = fileName.replace('.pdf', '');
    window.print();
    document.title = originalTitle;

    setDownloadNotice(fileName);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  // Keep editor state and data effects mounted; render only the visible table.
  if (!isActive) return null;

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
              onClick={handleRestoreAllTariffs}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-750 shadow-md transition-all active:scale-95"
              title="Restaurar catálogo completo oficial con todas las tarifas originales"
            >
              <RotateCcw className="h-4 w-4 text-emerald-400" />
              <span>Restaurar Catálogo ({INITIAL_TARIFFS_LIST.length})</span>
            </button>

            <button
              onClick={() => setShowAddTariffModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/40 shadow-md transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir Nueva Tarifa</span>
            </button>

            <button
              onClick={() => {
                setSourcesModalTariff(selectedTariff);
                setShowSourcesModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-xs font-bold border border-purple-500/40 shadow-md transition-all active:scale-95"
              title="Modificar de dónde salen los datos de cada estación en cada PDF de cada tarifa"
            >
              <Sliders className="h-4 w-4 text-purple-400" />
              <span>Modificar Origen de Datos</span>
            </button>

            <button
              onClick={() => setShowLabelsModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-xl text-xs font-bold border border-orange-500/40 shadow-md transition-all active:scale-95"
              title="Crear y asignar etiquetas (ej. RUTA A2) a estaciones para resaltarlas en los PDFs"
            >
              <Tag className="h-4 w-4 text-orange-400" />
              <span>Etiquetas de Estaciones</span>
              {hasAnyLabels && (
                <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {assignedLabelsList.length}
                </span>
              )}
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
            <span className="text-xs text-slate-500">Precios vinculados a Sábana</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 max-h-64 overflow-y-auto pr-1">
            {tariffsList.map((t) => (
              <div
                key={t.name}
                className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all text-xs font-bold ${
                  selectedTariff === t.name
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedTariff(t.name)}
                  className="flex-1 text-left truncate mr-1 focus:outline-none"
                >
                  {t.name}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteModalState({
                      isOpen: true,
                      tariffName: t.name,
                      step: 1,
                    });
                  }}
                  className={`p-1 rounded-lg transition-all opacity-40 group-hover:opacity-100 ${
                    selectedTariff === t.name
                      ? 'text-slate-950 hover:bg-black/10'
                      : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                  }`}
                  title={`Eliminar tarifa ${t.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
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

      {/* DOCUMENT PREVIEW & PDF CONTAINER (Único cuadro unificado continuo sin cortes) */}
      <div className="printable-document bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-300 space-y-6 print:p-0 print:border-none print:shadow-none print:m-0 print:rounded-none">
        {/* Banner Superior Oficial */}
        <div className="w-full overflow-hidden rounded-xl">
          <img
            src="/area117_header_banner.png?v=2"
            alt="Área 117 - Contigo en la carretera"
            className="w-full h-auto object-cover rounded-xl shadow-sm print:shadow-none print:w-full"
          />
        </div>

        {/* Sub-Header con Fecha de Aplicación y Tarifa */}
        <div className="border-b-2 border-slate-900 pb-3 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 print:hidden">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tarifa:</span>
            <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight">
              {selectedTariff}
            </h1>
          </div>
          <div className="text-right ml-auto">
            <span className="text-xs font-bold text-slate-500 uppercase block">Fecha de Aplicación:</span>
            <span className="text-base font-black text-slate-950 font-mono">
              {formatDateDDMMYYYY(targetDate)}
            </span>
          </div>
        </div>

        {/* HVO Banner Highlights (Opcional por tarifa) */}
        {isHvoIncluded && (
          <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto text-[11px] print:grid-cols-2">
            <div className="bg-amber-50/90 border border-amber-300 rounded-xl px-3 py-2 flex items-center justify-between shadow-sm print:shadow-none">
              <div className="pr-2">
                <span className="font-black text-amber-950 block text-[10px] uppercase leading-tight">
                  HVO ALFAJARÍN
                </span>
                <span className="text-slate-600 text-[9px] block">Alfa Energía</span>
              </div>
              <div className="text-right font-mono shrink-0">
                <span className="text-[11px] font-bold text-amber-950 block leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }} data-testid="pdf-hvo-alfajarinSinIva">
                  {`SIN IVA: ${hvoPrices.alfajarinSinIva.replace('.', ',')}\u00A0€/L`}
                </span>
                <span className="text-[9px] text-amber-800 leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }} data-testid="pdf-hvo-alfajarinConIva">
                  {`CON IVA: ${hvoPrices.alfajarinConIva.replace('.', ',')}\u00A0€/L`}
                </span>
              </div>
            </div>

            <div className="bg-amber-50/90 border border-amber-300 rounded-xl px-3 py-2 flex items-center justify-between shadow-sm print:shadow-none">
              <div className="pr-2">
                <span className="font-black text-amber-950 block text-[10px] uppercase leading-tight">
                  HVO VALDEMORO
                </span>
                <span className="text-slate-600 text-[9px] block">Área 117</span>
              </div>
              <div className="text-right font-mono shrink-0">
                <span className="text-[11px] font-bold text-amber-950 block leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }} data-testid="pdf-hvo-valdemoroSinIva">
                  {`SIN IVA: ${hvoPrices.valdemoroSinIva.replace('.', ',')}\u00A0€/L`}
                </span>
                <span className="text-[9px] text-amber-800 leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }} data-testid="pdf-hvo-valdemoroConIva">
                  {`CON IVA: ${hvoPrices.valdemoroConIva.replace('.', ',')}\u00A0€/L`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Único cuadro continuo con todas las estaciones de la tarifa */}
        <div className="overflow-x-auto border border-slate-300 rounded-xl print:border-none print:overflow-visible">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                <th className="py-2.5 px-3 w-12 min-w-[48px] text-center">Nº</th>
                <th className="py-2.5 px-3 print:hidden text-center w-28 min-w-[110px] bg-slate-800 text-emerald-300">
                  Estación Activa
                </th>
                <th className="py-2.5 px-3 min-w-[140px]">E.E.S.S</th>
                <th className="py-2.5 px-3 w-28 min-w-[90px]">Bandera</th>
                <th className="py-2.5 px-3 min-w-[180px]">Ubicación</th>
                {hasAnyLabels && (
                  <th className="py-2.5 px-3 text-center w-28 min-w-[95px] whitespace-nowrap">
                    Etiqueta
                  </th>
                )}
                <th className="py-2.5 px-3 text-right whitespace-nowrap w-24 min-w-[95px]" style={{ whiteSpace: 'nowrap' }}>Sin IVA</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap w-24 min-w-[95px]" style={{ whiteSpace: 'nowrap' }}>Con IVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {filteredStations.map((st, idx) => {
                const active = isStationActive(st.name);
                const isPropia = st.type === 'PROPIA';
                const prices = getStationPrice(st.name, isPropia);
                const meta = getStationMetadata(st.name, isPropia);
                const printConsecutiveIdx = activeStationsIndexMap.get(st.name) || idx + 1;
                const labelsForStation = getStationLabels(st.name);
                const hasLabel = labelsForStation.length > 0;
                const isLabelActive = active && hasLabel;

                return (
                  <tr
                    key={st.name}
                    className={`transition-colors ${
                      !active
                        ? 'bg-slate-100/60 opacity-40 print:hidden'
                        : isLabelActive
                        ? 'bg-yellow-100 hover:bg-yellow-200/80 font-medium'
                        : 'hover:bg-slate-50'
                    }`}
                    style={
                      isLabelActive
                        ? {
                            backgroundColor: '#FEF9C3',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                          }
                        : undefined
                    }
                  >
                    <td className="py-2 px-3 text-center font-bold text-slate-500 font-mono text-xs">
                      <span className="print:hidden">{idx + 1}</span>
                      <span className="hidden print:inline">{printConsecutiveIdx}</span>
                    </td>

                    {/* Columna Estación Activa con Checkbox Interactivo */}
                    <td className={`py-2 px-3 text-center print:hidden ${isLabelActive ? 'bg-yellow-100/60' : 'bg-slate-50/50'}`}>
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
                      <div className="flex items-center space-x-2">
                        <span>{st.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStationForLabel(st.name);
                            setShowLabelsModal(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors print:hidden"
                          title={`Asignar o editar etiquetas para ${st.name}`}
                        >
                          <Tag className="h-3 w-3" />
                        </button>
                        {(() => {
                          const source = getStationSource(st.name);
                          if (source) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSourcesModalTariff(selectedTariff);
                                  setShowSourcesModal(true);
                                }}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200 transition-colors print:hidden"
                                title={`Origen en Sábana: ${source}. Clic para modificar.`}
                              >
                                <Sliders className="h-2.5 w-2.5 mr-1 text-purple-600" />
                                Sábana
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-300 inline-block">
                        {meta.bandera}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 text-[11px] leading-tight">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          meta.ubicacion.includes('Red de Estaciones')
                            ? `${st.name}, España`
                            : `${st.name}, ${meta.ubicacion}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors block text-[11px] print:text-blue-700"
                        title={`Ver ${st.name} en Google Maps`}
                      >
                        {meta.ubicacion}
                      </a>
                    </td>
                    {hasAnyLabels && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {labelsForStation.length > 0 ? (
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {labelsForStation.map((lbl, lIdx) => (
                              <span
                                key={lIdx}
                                className="inline-block px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white bg-orange-500 border border-orange-600 rounded shadow-sm uppercase print:bg-orange-500 print:text-white print:border-orange-600"
                                style={{
                                  backgroundColor: '#F97316',
                                  color: '#FFFFFF',
                                  borderColor: '#EA580C',
                                  WebkitPrintColorAdjust: 'exact',
                                  printColorAdjust: 'exact',
                                }}
                              >
                                {lbl}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    )}
                    <td data-testid={`pdf-price-${st.name}-sinIva`}
                      className="py-2 px-3 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {`${formatPdfPrice(prices.sinIva)}\u00A0€`}
                    </td>
                    <td data-testid={`pdf-price-${st.name}-conIva`}
                      className={`py-2 px-3 text-right font-mono font-black text-xs whitespace-nowrap ${
                        isLabelActive ? 'text-emerald-800 bg-yellow-200/50' : 'text-emerald-700 bg-emerald-50/50'
                      }`}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {`${formatPdfPrice(prices.conIva)}\u00A0€`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Gestión de Etiquetas de Estaciones */}
      {showLabelsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-orange-400 font-bold text-sm">
                <Tag className="h-5 w-5 text-orange-500" />
                <span>Gestión de Etiquetas de Estaciones</span>
              </div>
              <button
                onClick={() => setShowLabelsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Crea etiquetas (ej: <strong className="text-orange-400">RUTA A2</strong>, <strong className="text-orange-400">RUTA SUR</strong>) y asígnalas a una estación.
              En cada PDF donde la estación esté activa, la fila se coloreará de <strong className="text-amber-300">amarillo claro</strong> y se colocará la pequeña etiqueta en un <strong className="text-orange-400">rectángulo anaranjado</strong> entre la dirección y el precio sin IVA.
            </p>

            {/* Formulario de creación y asignación */}
            <form onSubmit={handleAssignLabel} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-bold">
                    Nombre de la Etiqueta:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: RUTA A2"
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white uppercase font-bold focus:border-orange-400 focus:outline-none placeholder-slate-600"
                    required
                  />
                  {/* Chips con etiquetas existentes para reutilizar rápido */}
                  {existingLabelNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[10px] text-slate-500 font-semibold mr-1">Existentes:</span>
                      {existingLabelNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setNewLabelText(name)}
                          className="text-[10px] bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 px-1.5 py-0.5 rounded border border-orange-500/30 font-bold transition-colors"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-bold">
                    Estación a Asignar:
                  </label>
                  <select
                    value={selectedStationForLabel}
                    onChange={(e) => setSelectedStationForLabel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-bold focus:border-orange-400 focus:outline-none"
                    required
                  >
                    <option value="">-- Seleccionar Estación --</option>
                    {allStations.map((st) => {
                      const existing = getStationLabels(st.name);
                      return (
                        <option key={st.name} value={st.name}>
                          {st.name} {existing.length > 0 ? `(${existing.join(', ')})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  {newLabelText.trim() && (
                    <span className="inline-flex items-center space-x-1.5">
                      <span>Vista previa:</span>
                      <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase text-white bg-orange-500 border border-orange-600 rounded">
                        {newLabelText.trim().toUpperCase()}
                      </span>
                    </span>
                  )}
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center space-x-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Asignar Etiqueta</span>
                </button>
              </div>
            </form>

            {/* Listado de asignaciones actuales */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-60">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Etiquetas Asignadas ({assignedLabelsList.length}):
                </h4>
                {assignedLabelsList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllLabels}
                    className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline flex items-center space-x-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Eliminar todas</span>
                  </button>
                )}
              </div>

              {assignedLabelsList.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No hay etiquetas asignadas aún. Escribe un nombre (ej. RUTA A2) y selecciona una estación arriba para comenzar.
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedLabelsList.map(({ station, label }) => (
                    <div
                      key={`${station}::${label}`}
                      className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase text-white bg-orange-500 border border-orange-600 rounded shadow-sm">
                          {label}
                        </span>
                        <span className="text-slate-200 font-bold">{station}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLabelAssignment(station, label)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title={`Eliminar etiqueta ${label} de ${station}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowLabelsModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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
                  Origen en Sábana:
                </label>
                <select aria-label="Origen de nueva tarifa PDF" value={newTariffSource} onChange={e => setNewTariffSource(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white">
                  <option value="">Selecciona una tarifa de Sábana</option>
                  {published && [...new Map(Object.entries(published.tariffs).map(([name, id]) => [id, { id, name }])).values()].map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
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

      {/* Modal de Doble Confirmación de Eliminación de Tarifa */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            {deleteModalState.step === 1 ? (
              <>
                <div className="flex items-center space-x-3 text-amber-400">
                  <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">¿Eliminar Tarifa?</h3>
                    <p className="text-xs text-slate-400">Paso 1 de 2: Confirmación inicial</p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
                  <p>
                    ¿Estás seguro de que deseas eliminar la tarifa{' '}
                    <span className="text-amber-400 font-bold font-mono">
                      "{deleteModalState.tariffName}"
                    </span>
                    ?
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Esta acción retirará la tarifa del selector de clientes y no estará disponible para imprimir o exportar PDFs.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteModalState({ isOpen: false, tariffName: '', step: 1 })}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModalState((prev) => ({ ...prev, step: 2 }))}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5"
                  >
                    <span>Continuar al Paso 2</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3 text-rose-400">
                  <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                    <ShieldAlert className="h-6 w-6 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Confirmación de Seguridad Final</h3>
                    <p className="text-xs text-rose-400/80">Paso 2 de 2: Acción irreversible</p>
                  </div>
                </div>

                <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-200 space-y-2">
                  <p className="font-bold">
                    ⚠️ ATENCIÓN: Esta acción no se puede deshacer.
                  </p>
                  <p className="text-slate-300 text-[11px]">
                    Se borrará de forma permanente la tarifa{' '}
                    <strong className="text-white font-mono font-bold">"{deleteModalState.tariffName}"</strong> del sistema.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteModalState((prev) => ({ ...prev, step: 1 }))}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Volver atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tariffToDelete = deleteModalState.tariffName;
                      const newTariffs = tariffsList.filter((t) => t.name !== tariffToDelete);
                      setTariffsList(newTariffs);
                      try {
                        const savedDeleted = workspaceStorage.getItem('efi_deleted_tariffs_list');
                        const deletedList: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];
                        if (!deletedList.includes(tariffToDelete)) {
                          deletedList.push(tariffToDelete);
                          workspaceStorage.setItem('efi_deleted_tariffs_list', JSON.stringify(deletedList));
                        }
                        workspaceStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(newTariffs));
                        workspaceStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(newTariffs));
                        workspaceStorage.setItem('efi_custom_tariffs_list', JSON.stringify(newTariffs));
                      } catch (e) {}
                      if (selectedTariff === tariffToDelete && newTariffs.length > 0) {
                        setSelectedTariff(newTariffs[0].name);
                      }
                      setDeleteModalState({ isOpen: false, tariffName: '', step: 1 });
                      setDownloadNotice(`Tarifa eliminada: ${tariffToDelete}`);
                      setTimeout(() => setDownloadNotice(null), 3500);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center space-x-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Sí, Eliminar Definitivamente</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showSourcesModal && <PdfPriceSourcesModal initialTariff={sourcesModalTariff} tariffs={tariffsList} stations={allStations} mapping={stationSourcesMapping} published={published} date={selectedDate} onSave={saveStationSourcesMapping} onClose={() => setShowSourcesModal(false)} />}

      {/* Toast Notice */}
      {downloadNotice && (
        <div role={downloadNotice.startsWith('No se puede') ? 'alert' : 'status'} className={`print:hidden fixed bottom-6 right-6 z-50 ${downloadNotice.startsWith('No se puede') ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'} font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5`}>
          {downloadNotice.startsWith('No se puede') ? <AlertTriangle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          <span>{downloadNotice}</span>
        </div>
      )}
    </div>
  );
}
