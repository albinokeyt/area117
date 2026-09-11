'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS, OFFICIAL_SUGGESTED_SALE_PRICES } from '@/lib/dataSeed';
import { loadSabanaFormulas, reevaluateAllSabanaFormulas } from '@/lib/sabanaFormulaEngine';
import {
  Printer, Download, FileText, Search, Calendar, Check,
  Sparkles, Building2, Store, Fuel, Zap, Eye, ArrowDownToLine,
  Plus, CheckSquare, Square, Trash2, X, Flame, AlertTriangle, ShieldAlert,
  RotateCcw
} from 'lucide-react';

interface PdfGeneratorProps {
  selectedDate: string;
}

const parseNum = (val: string | number | undefined): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = val.toString().replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

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

// Helpers para identificar estaciones con celdas de cálculo especial en Sábana de Precios
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

const isJaviOrange = (stName: string): boolean => {
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

const isCarrerasOrange = (stName: string): boolean => {
  const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
  if (u.includes('VALDEMORO') || u.includes('OPEN')) return false;
  return (
    isJaviOrange(stName) ||
    u.includes('BENAMEJI') ||
    u.includes('IRUN') ||
    u.includes('CAMPANA')
  );
};

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

const isTarifa30Orange = (stName: string): boolean => {
  const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
  return u.includes('ABRERA');
};

const isSurOrange = (stName: string): boolean => {
  const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
  return u.includes('ABRERA');
};

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
    'SANCTI-SPIRITUS',
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

// Catálogo Oficial Completo de Tarifas
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
  { name: 'TARIFA 27 SUR', markup: 0.0270 },
  { name: 'TARIFA 15 SUR', markup: 0.0150 },
  { name: 'TARIFA 75', markup: 0.0380 },
  { name: 'TRANFIRRED GOB', markup: 0.0000 },
];

export function PdfGeneratorManager({ selectedDate }: PdfGeneratorProps) {
  const [tariffsList, setTariffsList] = useState<{ name: string; markup: number }[]>(() => {
    try {
      const savedDeleted = localStorage.getItem('efi_deleted_tariffs_list');
      const deletedList: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];

      const saved = localStorage.getItem('efi_custom_tariffs_catalog_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((t: any) => t && t.name && !deletedList.includes(t.name))
            .map((t: any) => t.name === 'AMAEXO' ? { ...t, markup: 0.0360 } : t);
        }
      }
      const initial = INITIAL_TARIFFS_LIST.filter((t) => !deletedList.includes(t.name));
      localStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(initial));
      localStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(initial));
      localStorage.setItem('efi_custom_tariffs_list', JSON.stringify(initial));
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

  const [postesRefreshTrigger, setPostesRefreshTrigger] = useState(0);

  useEffect(() => {
    const handlePostesUpdate = () => {
      setPostesRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener('efi_postes_updated', handlePostesUpdate);
    window.addEventListener('efi_compras_updated', handlePostesUpdate);
    window.addEventListener('efi_sabana_updated', handlePostesUpdate);
    window.addEventListener('efi_valid_date_changed', handlePostesUpdate);
    window.addEventListener('storage', handlePostesUpdate);

    return () => {
      window.removeEventListener('efi_postes_updated', handlePostesUpdate);
      window.removeEventListener('efi_compras_updated', handlePostesUpdate);
      window.removeEventListener('efi_sabana_updated', handlePostesUpdate);
      window.removeEventListener('efi_valid_date_changed', handlePostesUpdate);
      window.removeEventListener('storage', handlePostesUpdate);
    };
  }, []);

  // Sincronizar catálogo inicial si no existe, respetando permanentemente las tarifas eliminadas
  useEffect(() => {
    try {
      const savedDeleted = localStorage.getItem('efi_deleted_tariffs_list');
      const deletedList: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];

      const saved = localStorage.getItem('efi_custom_tariffs_catalog_v5');
      if (!saved) {
        const initial = INITIAL_TARIFFS_LIST.filter((t) => !deletedList.includes(t.name));
        setTariffsList(initial);
        localStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(initial));
        localStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(initial));
        localStorage.setItem('efi_custom_tariffs_list', JSON.stringify(initial));
      } else {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed
            .filter((t: any) => t && t.name && !deletedList.includes(t.name))
            .map((t: any) => t.name === 'AMAEXO' ? { ...t, markup: 0.0360 } : t);
          setTariffsList(filtered);
          localStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(filtered));
          localStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(filtered));
          localStorage.setItem('efi_custom_tariffs_list', JSON.stringify(filtered));
        }
      }
    } catch (e) {}
  }, []);

  // Proteger ante Cierre de Día: las tarifas eliminadas NUNCA deben reaparecer al cerrar el día
  useEffect(() => {
    const handleCierreDia = () => {
      try {
        const savedDeleted = localStorage.getItem('efi_deleted_tariffs_list');
        const deletedList: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];

        setTariffsList((prev) => {
          const filtered = prev.filter((t) => !deletedList.includes(t.name));
          localStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(filtered));
          localStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(filtered));
          localStorage.setItem('efi_custom_tariffs_list', JSON.stringify(filtered));
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
      localStorage.removeItem('efi_deleted_tariffs_list');
      localStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(INITIAL_TARIFFS_LIST));
      localStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(INITIAL_TARIFFS_LIST));
      localStorage.setItem('efi_custom_tariffs_list', JSON.stringify(INITIAL_TARIFFS_LIST));
    } catch (e) {}
    setDownloadNotice(`Catálogo completo oficial restaurado (${INITIAL_TARIFFS_LIST.length} Tarifas)`);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

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
      const savedDeleted = localStorage.getItem('efi_deleted_tariffs_list');
      if (savedDeleted) {
        const deletedList: string[] = JSON.parse(savedDeleted);
        const updatedDeleted = deletedList.filter((n) => n !== formattedName);
        localStorage.setItem('efi_deleted_tariffs_list', JSON.stringify(updatedDeleted));
      }
      localStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(nextList));
      localStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(nextList));
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

  // Contexto reactivo de Compras, Tarifas Especiales y Sábana de Precios
  const sabanaContext = useMemo(() => {
    let purchasesData: Record<string, any> = {};
    let specialRates: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const sDate = localStorage.getItem('efi_purchases_' + targetDate);
        const sGlob = localStorage.getItem('efi_compras_data');
        if (sDate) purchasesData = JSON.parse(sDate).data || {};
        else if (sGlob) purchasesData = JSON.parse(sGlob).data || {};

        const sp = localStorage.getItem('efi_special_rates_b50_f82_v4') || localStorage.getItem('efi_special_rates_b50_f82_v3');
        if (sp) specialRates = JSON.parse(sp);
      } catch (e) {}
    }

    const rawSabanaFormulas = typeof window !== 'undefined' ? {
      ...loadSabanaFormulas(selectedDate),
      ...loadSabanaFormulas(targetDate),
    } : {};
    const resolvedSabanaFormulas = reevaluateAllSabanaFormulas(
      rawSabanaFormulas,
      targetDate,
      purchasesData,
      specialRates
    );

    const getStationBasePrice = (stName: string): number => {
      let item = purchasesData[`${stName}_GOA`];
      const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').trim();
      if (!item?.sale) {
        const matchedKey = Object.keys(purchasesData).find((k) => {
          if (!k.endsWith('_GOA')) return false;
          const baseK = k.replace(/_GOA$/, '').toUpperCase().replace(/^ES\s+/, '').trim();
          return baseK === cleanTarget || baseK.includes(cleanTarget) || cleanTarget.includes(baseK);
        });
        if (matchedKey) {
          item = purchasesData[matchedKey];
        }
      }
      if (item?.sale && item.sale.trim() !== '' && item.sale !== '0' && item.sale !== '0.000') {
        const val = parseFloat(item.sale.toString().replace(',', '.'));
        if (!isNaN(val) && val > 0) return val;
      }
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
      const costs = STATION_EXCEL_COSTS[stName] || STATION_EXCEL_COSTS[cleanTarget] || {
        porte: 0.0050,
        pase: 0.0100,
        fin: 0.0100,
        defaultCurr: 1.2000,
      };
      return Number((costs.defaultCurr + costs.porte + costs.pase + costs.fin).toFixed(4));
    };

    const getSpecialRateRefPrice = (stName: string): number => {
      if (specialRates && specialRates.length > 0) {
        const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
        const row = specialRates.find((r) => {
          const rNorm = r.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
          return rNorm === cleanTarget || rNorm.includes(cleanTarget) || cleanTarget.includes(rNorm);
        });
        if (row) {
          if (row.isCustomRef && row.refPrice && row.refPrice.trim() !== '') {
            const p = parseFloat(row.refPrice.toString().replace(',', '.'));
            if (!isNaN(p) && p > 0) return p;
          }
          if (row.refPrice && row.refPrice.trim() !== '') {
            const p = parseFloat(row.refPrice.toString().replace(',', '.'));
            if (!isNaN(p) && p > 0) return p;
          }
          if (row.isCustomActual && row.actualPrice && row.actualPrice.trim() !== '') {
            const act = parseFloat(row.actualPrice.toString().replace(',', '.'));
            if (!isNaN(act) && act > 0) return Number((act + 0.0080).toFixed(3));
          }
        }
      }
      const baseSale = getStationBasePrice(stName);
      return Number((baseSale + 0.0080).toFixed(3));
    };

    const getSpecialRateActualPrice = (stName: string): number => {
      if (specialRates && specialRates.length > 0) {
        const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
        const row = specialRates.find((r) => {
          const rNorm = r.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
          return rNorm === cleanTarget || rNorm.includes(cleanTarget) || cleanTarget.includes(rNorm);
        });
        if (row && row.isCustomActual && row.actualPrice && row.actualPrice.trim() !== '') {
          const p = parseFloat(row.actualPrice.toString().replace(',', '.'));
          if (!isNaN(p) && p > 0) return p;
        }
      }
      return getStationBasePrice(stName);
    };

    return {
      purchasesData,
      specialRates,
      resolvedSabanaFormulas,
      getStationBasePrice,
      getSpecialRateRefPrice,
      getSpecialRateActualPrice,
    };
  }, [targetDate, selectedDate, postesRefreshTrigger]);

  // Obtener precios exactos de la Sábana de Precios / Compras para cada estación
  const getStationPrice = (stName: string, isPropia: boolean) => {
    // Si la tarifa corresponde a Gasóleo B (ej. TRANFIRRED GOB)
    if (isGobTariff) {
      let gbKey = '';
      const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
      if (u.includes('TORREMOCHA')) gbKey = 'TORREMOCHA';
      else if (u.includes('ARCOS')) gbKey = 'ARCOS';
      else if (u.includes('UCLES')) gbKey = 'UCLES';

      if (gbKey) {
        try {
          const savedPostes = localStorage.getItem('efi_postes_data_v2');
          if (savedPostes) {
            const parsed = JSON.parse(savedPostes);
            const row = parsed.gasoleoBRows?.[gbKey];
            if (row) {
              const transferNum = row.transfer && row.transfer.trim() !== ''
                ? parseNum(row.transfer)
                : Number((parseNum(row.compra || '1.172') + 0.017).toFixed(3));
              const conIva = Number((transferNum * 1.21).toFixed(3));
              const sinIva = Number(transferNum.toFixed(3));
              return { sinIva, conIva };
            }
          }
        } catch (e) {}
        return { sinIva: 1.189, conIva: 1.439 };
      }
      return { sinIva: 0, conIva: 0 };
    }

    const selUpper = selectedTariff.toUpperCase().trim();
    const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    const basePrice = sabanaContext.getStationBasePrice(stName);

    // 1. ESPECIAL COMPLETO / C-0 GENERAL -> Cuadro Tarifa C-0 (Especial General) de Sábana de Precios
    if (
      selUpper === 'ESPECIAL COMPLETO' ||
      selUpper === 'C-0 GENERAL' ||
      selUpper.includes('ESPECIAL COMPLETO') ||
      selUpper.includes('C-0') ||
      selUpper.includes('C0')
    ) {
      const specBlockId = 'c0_general';
      const specTariffTitle = 'Especial General C-0';

      const customSinIvaKey1 = `SPEC_${specBlockId}_${stName}_${specTariffTitle}_sinIva`;
      const customSinIvaKey2 = `SPEC_${specBlockId}_${cleanTarget}_${specTariffTitle}_sinIva`;
      const customConIvaKey1 = `SPEC_${specBlockId}_${stName}_${specTariffTitle}_conIva`;
      const customConIvaKey2 = `SPEC_${specBlockId}_${cleanTarget}_${specTariffTitle}_conIva`;

      const formulaSinIva = sabanaContext.resolvedSabanaFormulas[customSinIvaKey1] || sabanaContext.resolvedSabanaFormulas[customSinIvaKey2];
      const formulaConIva = sabanaContext.resolvedSabanaFormulas[customConIvaKey1] || sabanaContext.resolvedSabanaFormulas[customConIvaKey2];

      let sinIva: number;
      if (formulaSinIva) {
        sinIva = Number(formulaSinIva.evaluatedValue.toFixed(3));
      } else {
        sinIva = isC0Orange(stName)
          ? sabanaContext.getSpecialRateRefPrice(stName)
          : Number((basePrice + 0.024).toFixed(3));
      }

      let conIva: number;
      if (formulaConIva) {
        conIva = Number(formulaConIva.evaluatedValue.toFixed(3));
      } else {
        conIva = Number((sinIva * 1.21).toFixed(3));
      }

      return { sinIva, conIva };
    }

    // 2. Otras Tarifas Especiales vinculadas a Sábana de Precios
    let specBlockId = '';
    let specTariffTitle = '';
    let defaultSinIva: number | null = null;

    if (selUpper.includes('TRANSFRIRED')) {
      specBlockId = 'transfrired';
      specTariffTitle = 'Especial Transfrired';
      defaultSinIva = isTransfriredOrange(stName)
        ? sabanaContext.getSpecialRateRefPrice(stName)
        : Number((basePrice + 0.024).toFixed(3));
    } else if (selUpper.includes('LOS JAVI') || (selUpper.includes('JAVI') && !selUpper.includes('CARRERAS'))) {
      specBlockId = 'los_javi';
      specTariffTitle = 'Especial Javi';
      if (isJaviOrange(stName)) {
        defaultSinIva = sabanaContext.getSpecialRateRefPrice(stName);
      } else if (stName.toUpperCase().includes('PUERTO DE BARCELONA')) {
        const f24 = sabanaContext.resolvedSabanaFormulas['STD_PUERTO DE BARCELONA_T24_sinIva'] || sabanaContext.resolvedSabanaFormulas['TAR_24_PUERTO DE BARCELONA_sinIva'];
        defaultSinIva = f24 ? f24.evaluatedValue : Number((basePrice + 0.024).toFixed(3));
      } else {
        defaultSinIva = Number((basePrice + 0.024).toFixed(3));
      }
    } else if (selUpper.includes('CARRERAS')) {
      specBlockId = 'los_javi';
      specTariffTitle = 'Especial Carreras';
      if (isCarrerasOrange(stName)) {
        defaultSinIva = sabanaContext.getSpecialRateRefPrice(stName);
      } else if (stName.toUpperCase().includes('PUERTO DE BARCELONA')) {
        const f18 = sabanaContext.resolvedSabanaFormulas['STD_PUERTO DE BARCELONA_T18_sinIva'] || sabanaContext.resolvedSabanaFormulas['TAR_18_PUERTO DE BARCELONA_sinIva'];
        defaultSinIva = f18 ? f18.evaluatedValue : Number((basePrice + 0.018).toFixed(3));
      } else {
        defaultSinIva = Number((basePrice + 0.018).toFixed(3));
      }
    } else if (selUpper === 'ROR' || selUpper.includes('ESPECIAL ROR')) {
      specBlockId = 'ror_esteban';
      specTariffTitle = 'Especial ROR';
      defaultSinIva = isRorOrange(stName)
        ? sabanaContext.getSpecialRateRefPrice(stName)
        : Number((basePrice + 0.024).toFixed(3));
    } else if (selUpper === 'ESTEBAN' || selUpper.includes('ESPECIAL ESTEBAN')) {
      specBlockId = 'ror_esteban';
      specTariffTitle = 'Especial Esteban';
      if (isEstebanGreen(stName)) {
        const t24 = sabanaContext.resolvedSabanaFormulas[`STD_${stName}_T24_sinIva`] || sabanaContext.resolvedSabanaFormulas[`TAR_24_${stName}_sinIva`];
        defaultSinIva = t24 ? t24.evaluatedValue : Number((basePrice + 0.024).toFixed(3));
      } else if (isEstebanOrange(stName)) {
        defaultSinIva = sabanaContext.getSpecialRateRefPrice(stName);
      } else {
        defaultSinIva = Number((basePrice + 0.024).toFixed(3));
      }
    } else if (selUpper.includes('MIKI') || selUpper.includes('MILO')) {
      specBlockId = 'miki_ecotrans_tarifa30';
      specTariffTitle = 'Tarifa 90 Miki';
      defaultSinIva = Number((basePrice + 0.090).toFixed(3));
    } else if (selUpper.includes('ECOTRANS')) {
      specBlockId = 'miki_ecotrans_tarifa30';
      specTariffTitle = 'Tarifa ECOTRANS';
      defaultSinIva = Number((basePrice + 0.050).toFixed(3));
    } else if (selUpper === 'TARIFA 30' || selUpper === 'T30' || (selUpper.includes('30') && !selUpper.includes('SUR'))) {
      specBlockId = 'miki_ecotrans_tarifa30';
      specTariffTitle = 'Tarifa 30';
      defaultSinIva = isTarifa30Orange(stName)
        ? sabanaContext.getSpecialRateActualPrice(stName)
        : Number((basePrice + 0.030).toFixed(3));
    } else if (selUpper.includes('27 SUR') || selUpper.includes('27SUR')) {
      specBlockId = 'sur_benito';
      specTariffTitle = 'Tarifa 27 Sur';
      if (isSurOrange(stName)) {
        defaultSinIva = sabanaContext.getSpecialRateRefPrice(stName);
      } else if (isSurGreen(stName)) {
        defaultSinIva = Number((basePrice + 0.036).toFixed(3));
      } else {
        defaultSinIva = Number((basePrice + 0.027).toFixed(3));
      }
    } else if (selUpper.includes('15 SUR') || selUpper.includes('15SUR')) {
      specBlockId = 'sur_benito';
      specTariffTitle = 'Tarifa 15 Sur';
      if (isSurOrange(stName)) {
        defaultSinIva = sabanaContext.getSpecialRateRefPrice(stName);
      } else if (isSurGreen(stName)) {
        defaultSinIva = Number((basePrice + 0.024).toFixed(3));
      } else {
        defaultSinIva = Number((basePrice + 0.015).toFixed(3));
      }
    } else if (selUpper.includes('75')) {
      specBlockId = 'tarifa_75';
      specTariffTitle = 'Tarifa 75';
      defaultSinIva = Number((basePrice + 0.038).toFixed(3));
    }

    if (specBlockId && specTariffTitle && defaultSinIva !== null) {
      const customSinIvaKey1 = `SPEC_${specBlockId}_${stName}_${specTariffTitle}_sinIva`;
      const customSinIvaKey2 = `SPEC_${specBlockId}_${cleanTarget}_${specTariffTitle}_sinIva`;
      const customConIvaKey1 = `SPEC_${specBlockId}_${stName}_${specTariffTitle}_conIva`;
      const customConIvaKey2 = `SPEC_${specBlockId}_${cleanTarget}_${specTariffTitle}_conIva`;

      const formulaSinIva = sabanaContext.resolvedSabanaFormulas[customSinIvaKey1] || sabanaContext.resolvedSabanaFormulas[customSinIvaKey2];
      const formulaConIva = sabanaContext.resolvedSabanaFormulas[customConIvaKey1] || sabanaContext.resolvedSabanaFormulas[customConIvaKey2];

      const sinIva = formulaSinIva ? Number(formulaSinIva.evaluatedValue.toFixed(3)) : defaultSinIva;
      const conIva = formulaConIva ? Number(formulaConIva.evaluatedValue.toFixed(3)) : Number((sinIva * 1.21).toFixed(3));
      return { sinIva, conIva };
    }

    // 3. Tarifas Estándar (12, 18, 24, 36, 40, 42, 45, 47, 50, 60 y variantes PISTA DE SILLA)
    const stdTariffMatch = selUpper.match(/\b(12|18|24|36|40|42|45|47|50|60)\b/);
    if (stdTariffMatch) {
      const stdNum = stdTariffMatch[1];
      const STANDARD_MARKUPS: Record<string, number> = {
        '12': 0.0120,
        '18': 0.0180,
        '24': 0.0240,
        '36': 0.0360,
        '40': 0.0400,
        '42': 0.0420,
        '45': 0.0450,
        '47': 0.0470,
        '50': 0.0600,
        '60': 0.0800,
      };

      const stdKey1 = `STD_${stName}_T${stdNum}_sinIva`;
      const stdKey2 = `STD_${cleanTarget}_T${stdNum}_sinIva`;
      const stdKey3 = `TAR_${stdNum}_${stName}_sinIva`;
      const stdKey4 = `TAR_${stdNum}_${cleanTarget}_sinIva`;
      const formulaSinIva = sabanaContext.resolvedSabanaFormulas[stdKey1] ||
                            sabanaContext.resolvedSabanaFormulas[stdKey2] ||
                            sabanaContext.resolvedSabanaFormulas[stdKey3] ||
                            sabanaContext.resolvedSabanaFormulas[stdKey4];

      const conKey1 = `STD_${stName}_T${stdNum}_conIva`;
      const conKey2 = `STD_${cleanTarget}_T${stdNum}_conIva`;
      const conKey3 = `TAR_${stdNum}_${stName}_conIva`;
      const conKey4 = `TAR_${stdNum}_${cleanTarget}_conIva`;
      const formulaConIva = sabanaContext.resolvedSabanaFormulas[conKey1] ||
                            sabanaContext.resolvedSabanaFormulas[conKey2] ||
                            sabanaContext.resolvedSabanaFormulas[conKey3] ||
                            sabanaContext.resolvedSabanaFormulas[conKey4];

      const defaultMarkup = STANDARD_MARKUPS[stdNum] ?? currentMarkup;
      const sinIva = formulaSinIva
        ? Number(formulaSinIva.evaluatedValue.toFixed(3))
        : Number((basePrice + defaultMarkup).toFixed(3));

      const conIva = formulaConIva
        ? Number(formulaConIva.evaluatedValue.toFixed(3))
        : Number((sinIva * 1.21).toFixed(3));

      return { sinIva, conIva };
    }

    // 4. Tarifa BENITO
    if (selUpper === 'BENITO' || selUpper.includes('BENITO')) {
      const benitoSinKey1 = `SPEC_sur_benito_${stName}_Especial Benito_sinIva`;
      const benitoSinKey2 = `SPEC_sur_benito_${cleanTarget}_Especial Benito_sinIva`;
      const benitoConKey1 = `SPEC_sur_benito_${stName}_Especial Benito_conIva`;
      const benitoConKey2 = `SPEC_sur_benito_${cleanTarget}_Especial Benito_conIva`;
      const t12SinKey = `STD_${stName}_T12_sinIva`;
      const t12ConKey = `STD_${stName}_T12_conIva`;

      const formulaSinIva = sabanaContext.resolvedSabanaFormulas[benitoSinKey1] ||
                            sabanaContext.resolvedSabanaFormulas[benitoSinKey2] ||
                            sabanaContext.resolvedSabanaFormulas[t12SinKey];
      const formulaConIva = sabanaContext.resolvedSabanaFormulas[benitoConKey1] ||
                            sabanaContext.resolvedSabanaFormulas[benitoConKey2] ||
                            sabanaContext.resolvedSabanaFormulas[t12ConKey];

      const sinIva = formulaSinIva
        ? Number(formulaSinIva.evaluatedValue.toFixed(3))
        : Number((basePrice + 0.0120).toFixed(3));
      const conIva = formulaConIva
        ? Number(formulaConIva.evaluatedValue.toFixed(3))
        : Number((sinIva * 1.21).toFixed(3));

      return { sinIva, conIva };
    }

    // 5. Tarifa AMAEXO -> Se alimenta directamente de la Tarifa 36 (Sin IVA y Con IVA) de la Sábana de Precios
    if (selUpper === 'AMAEXO' || selUpper.includes('AMAEXO')) {
      const t36SinKey1 = `STD_${stName}_T36_sinIva`;
      const t36SinKey2 = `STD_${cleanTarget}_T36_sinIva`;
      const t36SinKey3 = `TAR_36_${stName}_sinIva`;
      const t36SinKey4 = `TAR_36_${cleanTarget}_sinIva`;

      const t36ConKey1 = `STD_${stName}_T36_conIva`;
      const t36ConKey2 = `STD_${cleanTarget}_T36_conIva`;
      const t36ConKey3 = `TAR_36_${stName}_conIva`;
      const t36ConKey4 = `TAR_36_${cleanTarget}_conIva`;

      const formulaSinIva = sabanaContext.resolvedSabanaFormulas[t36SinKey1] ||
                            sabanaContext.resolvedSabanaFormulas[t36SinKey2] ||
                            sabanaContext.resolvedSabanaFormulas[t36SinKey3] ||
                            sabanaContext.resolvedSabanaFormulas[t36SinKey4];

      const formulaConIva = sabanaContext.resolvedSabanaFormulas[t36ConKey1] ||
                            sabanaContext.resolvedSabanaFormulas[t36ConKey2] ||
                            sabanaContext.resolvedSabanaFormulas[t36ConKey3] ||
                            sabanaContext.resolvedSabanaFormulas[t36ConKey4];

      const sinIva = formulaSinIva
        ? Number(formulaSinIva.evaluatedValue.toFixed(3))
        : Number((basePrice + 0.0360).toFixed(3));

      const conIva = formulaConIva
        ? Number(formulaConIva.evaluatedValue.toFixed(3))
        : Number((sinIva * 1.21).toFixed(3));

      return { sinIva, conIva };
    }

    // 6. Búsqueda de cualquier otra fórmula personalizada en Sábana para tarifas de clientes o agregadas
    const tariffClean = selUpper.replace(/\s+/g, '_');
    const genericSinKey1 = `STD_${stName}_${tariffClean}_sinIva`;
    const genericSinKey2 = `STD_${cleanTarget}_${tariffClean}_sinIva`;
    const genericSinKey3 = `SPEC_${stName}_${tariffClean}_sinIva`;
    const genericSinKey4 = `SPEC_${cleanTarget}_${tariffClean}_sinIva`;

    const genericConKey1 = `STD_${stName}_${tariffClean}_conIva`;
    const genericConKey2 = `STD_${cleanTarget}_${tariffClean}_conIva`;
    const genericConKey3 = `SPEC_${stName}_${tariffClean}_conIva`;
    const genericConKey4 = `SPEC_${cleanTarget}_${tariffClean}_conIva`;

    const formulaSinIva = sabanaContext.resolvedSabanaFormulas[genericSinKey1] ||
                          sabanaContext.resolvedSabanaFormulas[genericSinKey2] ||
                          sabanaContext.resolvedSabanaFormulas[genericSinKey3] ||
                          sabanaContext.resolvedSabanaFormulas[genericSinKey4];

    const formulaConIva = sabanaContext.resolvedSabanaFormulas[genericConKey1] ||
                          sabanaContext.resolvedSabanaFormulas[genericConKey2] ||
                          sabanaContext.resolvedSabanaFormulas[genericConKey3] ||
                          sabanaContext.resolvedSabanaFormulas[genericConKey4];

    const sinIva = formulaSinIva
      ? Number(formulaSinIva.evaluatedValue.toFixed(3))
      : Number((basePrice + currentMarkup).toFixed(3));

    const conIva = formulaConIva
      ? Number(formulaConIva.evaluatedValue.toFixed(3))
      : Number((sinIva * 1.21).toFixed(3));

    return { sinIva, conIva };
  };

  // Precios dinámicos de HVO desde Postes sincronizados al momento
  const hvoPrices = useMemo(() => {
    try {
      const saved = localStorage.getItem('efi_postes_data_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        const base = parseNum(parsed.hvoGeneralBase ?? '1.285');
        const add = parseNum(parsed.hvoGeneralAddition ?? '0.243');
        const genSinIva = base + add;

        // Alfajarín: toma hvoAlfajarinSinIva si existe y es > 0, de lo contrario HVO General
        const alfaSinIva = parsed.hvoAlfajarinSinIva && parseNum(parsed.hvoAlfajarinSinIva) > 0
          ? parseNum(parsed.hvoAlfajarinSinIva)
          : genSinIva;
        const alfaConIva = Number((alfaSinIva * 1.21).toFixed(4));

        // Valdemoro: GOA Poste Valdemoro (con IVA) + monto a sumar
        const valAdd = parseNum(parsed.hvoValdemoroAddition ?? '0.07');
        const valGoa = parseNum(parsed.postes?.['VALDEMORO']?.goa || parsed.postes?.['ES VALDEMORO']?.goa || '1.659');
        const valConIva = Number((valGoa + valAdd).toFixed(4));
        const valSinIva = Number((valConIva / 1.21).toFixed(4));

        return {
          alfajarinSinIva: alfaSinIva.toFixed(3),
          alfajarinConIva: alfaConIva.toFixed(3),
          valdemoroSinIva: valSinIva.toFixed(3),
          valdemoroConIva: valConIva.toFixed(3),
        };
      }
    } catch (e) {}
    return {
      alfajarinSinIva: '1.528',
      alfajarinConIva: '1.849',
      valdemoroSinIva: '1.429',
      valdemoroConIva: '1.729',
    };
  }, [postesRefreshTrigger]);

  // Filtrado por búsqueda y por estación activa para el preview/impresión
  const filteredActiveStations = allStations
    .filter((st) => isStationActive(st.name))
    .filter((st) => st.name.toLowerCase().includes(searchFilter.toLowerCase()));

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

      {/* DOCUMENT PREVIEW & PDF CONTAINER */}
      <div className="printable-document bg-white text-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-300 space-y-6 print:p-0 print:border-none print:shadow-none print:m-0">
        
        {/* Banner Superior Oficial en la Primera Hoja */}
        <div className="w-full overflow-hidden rounded-xl">
          <img
            src="/area117_header_banner.png"
            alt="Área 117 - Contigo en la carretera"
            className="w-full h-auto object-cover rounded-xl shadow-sm print:shadow-none print:w-full"
          />
        </div>

        {/* Sub-Header con Fecha de Aplicación y Nombre de Tarifa (visible en pantalla, oculto en PDF) */}
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
                <span className="text-[11px] font-bold text-amber-950 block leading-tight">
                  SIN IVA: {hvoPrices.alfajarinSinIva.replace('.', ',')} €/L
                </span>
                <span className="text-[9px] text-amber-800 leading-tight">
                  CON IVA: {hvoPrices.alfajarinConIva.replace('.', ',')} €/L
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
                <span className="text-[11px] font-bold text-amber-950 block leading-tight">
                  SIN IVA: {hvoPrices.valdemoroSinIva.replace('.', ',')} €/L
                </span>
                <span className="text-[9px] text-amber-800 leading-tight">
                  CON IVA: {hvoPrices.valdemoroConIva.replace('.', ',')} €/L
                </span>
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
                <th className="py-2.5 px-3 text-right">Con IVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {allStations
                .filter((st) => st.name.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((st, idx) => {
                  const active = isStationActive(st.name);
                  const isPropia = st.type === 'PROPIA';
                  const prices = getStationPrice(st.name, isPropia);
                  const meta = getStationMetadata(st.name, isPropia);

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
                      <td className="py-2 px-3 text-slate-700 text-[11px]">
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
                        const savedDeleted = localStorage.getItem('efi_deleted_tariffs_list');
                        const deletedList: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];
                        if (!deletedList.includes(tariffToDelete)) {
                          deletedList.push(tariffToDelete);
                          localStorage.setItem('efi_deleted_tariffs_list', JSON.stringify(deletedList));
                        }
                        localStorage.setItem('efi_custom_tariffs_catalog_v5', JSON.stringify(newTariffs));
                        localStorage.setItem('efi_custom_tariffs_list_v3', JSON.stringify(newTariffs));
                        localStorage.setItem('efi_custom_tariffs_list', JSON.stringify(newTariffs));
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
