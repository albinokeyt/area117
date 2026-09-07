export interface StationSeed {
  name: string;
  type: 'PROPIA' | 'COLABORADORA';
  isFixedColaboradora?: boolean;
  order: number;
}

export interface StationExcelData {
  type: 'PROPIA' | 'COLABORADORA';
  clhName: string;
  porte: number;
  pase: number;
  fin: number;
  defaultPrev: number;
  defaultCurr: number;
}

// 19 Estaciones Propias extraídas exactamente de la Hoja "CALCULO INICIAL" (Filas 3 a 21)
export const PROPIAS_STATIONS: StationSeed[] = [
  { name: 'TORREJON', type: 'PROPIA', order: 1 },
  { name: 'ARCOS JALON', type: 'PROPIA', order: 2 },
  { name: 'ALFAJARIN', type: 'PROPIA', order: 3 },
  { name: 'TORREMOCHA', type: 'PROPIA', order: 4 },
  { name: 'MADRID', type: 'PROPIA', order: 5 },
  { name: 'VALLECAS', type: 'PROPIA', order: 6 },
  { name: 'VALDEMORO', type: 'PROPIA', order: 7 },
  { name: 'PAMPLONA', type: 'PROPIA', order: 8 },
  { name: 'HUMILLADERO', type: 'PROPIA', order: 9 },
  { name: 'UCLES', type: 'PROPIA', order: 10 },
  { name: 'BENAMEJI', type: 'PROPIA', order: 11 },
  { name: 'SORIA ALCUBILLAS', type: 'PROPIA', order: 12 },
  { name: 'ES RIBA-ROJA', type: 'PROPIA', order: 13 },
  { name: 'ES PISTA DE SILLA', type: 'PROPIA', order: 14 },
  { name: 'ES REAL DE GANDIA', type: 'PROPIA', order: 15 },
  { name: 'ES CHIVA', type: 'PROPIA', order: 16 },
  { name: 'ES ALBERIC', type: 'PROPIA', order: 17 },
  { name: 'CATARROJA', type: 'PROPIA', order: 18 },
  { name: 'MANISES - EXOIL', type: 'PROPIA', order: 19 },
];

// 34 Estaciones Colaboradoras extraídas exactamente de la Hoja "CALCULO INICIAL" (Filas 25 a 58)
export const COLABORADORA_STATIONS: StationSeed[] = [
  { name: 'ABRERA', type: 'COLABORADORA', isFixedColaboradora: false, order: 20 },
  { name: 'VALDEHERRERA', type: 'COLABORADORA', isFixedColaboradora: false, order: 21 },
  { name: 'EL CASAR', type: 'COLABORADORA', isFixedColaboradora: false, order: 22 },
  { name: 'MONTE REAL', type: 'COLABORADORA', isFixedColaboradora: false, order: 23 },
  { name: 'LA JOYOSA', type: 'COLABORADORA', isFixedColaboradora: false, order: 24 },
  { name: 'JUNDIZ NORPETROL', type: 'COLABORADORA', isFixedColaboradora: false, order: 25 },
  { name: 'OLIVERAL', type: 'COLABORADORA', isFixedColaboradora: false, order: 26 },
  { name: 'GUARROMAN', type: 'COLABORADORA', isFixedColaboradora: false, order: 28 },
  { name: 'VALDEPEÑAS', type: 'COLABORADORA', isFixedColaboradora: false, order: 29 },
  { name: 'OPEN', type: 'COLABORADORA', isFixedColaboradora: false, order: 30 },
  { name: 'TJOIL SEVILLA', type: 'COLABORADORA', isFixedColaboradora: false, order: 31 },
  { name: 'BENAVENTE', type: 'COLABORADORA', isFixedColaboradora: true, order: 32 },
  { name: 'IRUN ZAISA III', type: 'COLABORADORA', isFixedColaboradora: true, order: 33 },
  { name: 'TARRAGONA', type: 'COLABORADORA', isFixedColaboradora: false, order: 34 },
  { name: 'LACHAR', type: 'COLABORADORA', isFixedColaboradora: false, order: 35 },
  { name: 'LA CAMPANA', type: 'COLABORADORA', isFixedColaboradora: false, order: 36 },
  { name: 'AVILESINA', type: 'COLABORADORA', isFixedColaboradora: true, order: 37 },
  { name: 'GOR', type: 'COLABORADORA', isFixedColaboradora: false, order: 38 },
  { name: 'LLERS', type: 'COLABORADORA', isFixedColaboradora: false, order: 39 },
  { name: 'DARRO - A92', type: 'COLABORADORA', isFixedColaboradora: false, order: 40 },
  { name: 'MERIDA', type: 'COLABORADORA', isFixedColaboradora: true, order: 41 },
  { name: 'MURCIA', type: 'COLABORADORA', isFixedColaboradora: false, order: 43 },
  { name: 'NORIOIL', type: 'COLABORADORA', isFixedColaboradora: false, order: 44 },
  { name: 'SAN VICENTE DEL PALACIO', type: 'COLABORADORA', isFixedColaboradora: true, order: 45 },
  { name: 'WATERY ARANDA', type: 'COLABORADORA', isFixedColaboradora: true, order: 46 },
  { name: 'BERA', type: 'COLABORADORA', isFixedColaboradora: false, order: 47 },
  { name: 'PUERTO DE BARCELONA', type: 'COLABORADORA', isFixedColaboradora: true, order: 48 },
  { name: 'GIRONA-CALSINA', type: 'COLABORADORA', isFixedColaboradora: true, order: 49 },
  { name: 'FEGOBLAN PONTEVEDRA', type: 'COLABORADORA', isFixedColaboradora: true, order: 50 },
  { name: 'VEGA DE VALCARCE', type: 'COLABORADORA', isFixedColaboradora: true, order: 51 },
  { name: 'HOILA TOLEDO', type: 'COLABORADORA', isFixedColaboradora: true, order: 52 },
  { name: 'PETREM FIGUERES', type: 'COLABORADORA', isFixedColaboradora: true, order: 53 },
];

export const COLABORADORAS_STATIONS = COLABORADORA_STATIONS;

// Datos Fijos extraídos exactamente de las Columnas Q (CLH), R (Porte), S (Pase), T (Financiacion)
export const STATION_EXCEL_COSTS: Record<string, StationExcelData> = {
  // 19 PROPIAS
  'TORREJON': { type: 'PROPIA', clhName: 'TORREJON', porte: 0.0050, pase: 0.0100, fin: 0.0100, defaultPrev: 1.2230, defaultCurr: 1.2350 },
  'ARCOS JALON': { type: 'PROPIA', clhName: 'bilbao', porte: 0.0240, pase: 0.0000, fin: 0.0100, defaultPrev: 1.1950, defaultCurr: 1.2080 },
  'ALFAJARIN': { type: 'PROPIA', clhName: 'ZARAGOZA', porte: 0.0070, pase: 0.0060, fin: 0.0100, defaultPrev: 1.2270, defaultCurr: 1.2300 },
  'TORREMOCHA': { type: 'PROPIA', clhName: 'TORREJON', porte: 0.0100, pase: 0.0000, fin: 0.0100, defaultPrev: 1.2230, defaultCurr: 1.2350 },
  'MADRID': { type: 'PROPIA', clhName: 'TORREJON', porte: 0.0050, pase: 0.0100, fin: 0.0100, defaultPrev: 1.2230, defaultCurr: 1.2350 },
  'VALLECAS': { type: 'PROPIA', clhName: 'TORREJON', porte: 0.0050, pase: 0.0100, fin: 0.0100, defaultPrev: 1.1340, defaultCurr: 1.2400 },
  'VALDEMORO': { type: 'PROPIA', clhName: 'TORREJON', porte: 0.0060, pase: 0.0100, fin: 0.0100, defaultPrev: 1.2200, defaultCurr: 1.2350 },
  'PAMPLONA': { type: 'PROPIA', clhName: 'bilbao', porte: 0.0150, pase: 0.0060, fin: 0.0100, defaultPrev: 1.1950, defaultCurr: 1.1950 },
  'HUMILLADERO': { type: 'PROPIA', clhName: 'cordoba - malaga', porte: 0.0110, pase: 0.0100, fin: 0.0100, defaultPrev: 1.2260, defaultCurr: 1.2300 },
  'UCLES': { type: 'PROPIA', clhName: 'TORREJON', porte: 0.0100, pase: 0.0000, fin: 0.0100, defaultPrev: 1.2230, defaultCurr: 1.2350 },
  'BENAMEJI': { type: 'PROPIA', clhName: 'cordoba - malaga', porte: 0.0110, pase: 0.0100, fin: 0.0100, defaultPrev: 1.2260, defaultCurr: 1.2300 },
  'SORIA ALCUBILLAS': { type: 'PROPIA', clhName: 'bilbao', porte: 0.0240, pase: 0.0000, fin: 0.0100, defaultPrev: 1.1950, defaultCurr: 1.2080 },
  'ES RIBA-ROJA': { type: 'PROPIA', clhName: 'ALBUIXECH', porte: 0.0050, pase: 0.0060, fin: 0.0100, defaultPrev: 1.2150, defaultCurr: 1.2290 },
  'ES PISTA DE SILLA': { type: 'PROPIA', clhName: 'ALBUIXECH', porte: 0.0050, pase: 0.0060, fin: 0.0100, defaultPrev: 1.2150, defaultCurr: 1.2290 },
  'ES REAL DE GANDIA': { type: 'PROPIA', clhName: 'ALBUIXECH', porte: 0.0060, pase: 0.0060, fin: 0.0100, defaultPrev: 1.2150, defaultCurr: 1.2290 },
  'ES CHIVA': { type: 'PROPIA', clhName: 'ALBUIXECH', porte: 0.0060, pase: 0.0060, fin: 0.0100, defaultPrev: 1.2380, defaultCurr: 1.2380 },
  'ES ALBERIC': { type: 'PROPIA', clhName: 'ALBUIXECH', porte: 0.0050, pase: 0.0060, fin: 0.0100, defaultPrev: 1.2280, defaultCurr: 1.2290 },
  'CATARROJA': { type: 'PROPIA', clhName: 'ALBUIXECH', porte: 0.0050, pase: 0.0060, fin: 0.0100, defaultPrev: 1.2280, defaultCurr: 1.2290 },
  'MANISES - EXOIL': { type: 'PROPIA', clhName: 'ALBUIXECH', porte: 0.0050, pase: 0.0060, fin: 0.0100, defaultPrev: 1.2280, defaultCurr: 1.2290 },

  // 34 COLABORADORAS
  'ABRERA': { type: 'COLABORADORA', clhName: 'barcelona', porte: 0.0060, pase: 0.0150, fin: 0.0100, defaultPrev: 1.0480, defaultCurr: 1.0480 },
  'VALDEHERRERA': { type: 'COLABORADORA', clhName: 'zaragoza', porte: 0.0100, pase: 0.0160, fin: 0.0100, defaultPrev: 1.2280, defaultCurr: 1.2280 },
  'EL CASAR': { type: 'COLABORADORA', clhName: 'TORREJON', porte: 0.0090, pase: 0.0120, fin: 0.0100, defaultPrev: 1.2330, defaultCurr: 1.2350 },
  'MONTE REAL': { type: 'COLABORADORA', clhName: 'torrejon', porte: 0.0040, pase: 0.0140, fin: 0.0100, defaultPrev: 1.1150, defaultCurr: 1.1150 },
  'LA JOYOSA': { type: 'COLABORADORA', clhName: 'zaragoza', porte: 0.0070, pase: 0.0180, fin: 0.0100, defaultPrev: 1.2300, defaultCurr: 1.2300 },
  'JUNDIZ NORPETROL': { type: 'COLABORADORA', clhName: 'bilbao', porte: 0.0120, pase: 0.0140, fin: 0.0100, defaultPrev: 1.1950, defaultCurr: 1.1950 },
  'OLIVERAL': { type: 'COLABORADORA', clhName: 'ALBUIXECH', porte: 0.0050, pase: 0.0180, fin: 0.0100, defaultPrev: 1.2280, defaultCurr: 1.2280 },
  'GUARROMAN': { type: 'COLABORADORA', clhName: 'cordoba', porte: 0.0090, pase: 0.0200, fin: 0.0100, defaultPrev: 1.2370, defaultCurr: 1.2370 },
  'VALDEPEÑAS': { type: 'COLABORADORA', clhName: 'alcazar', porte: 0.0080, pase: 0.0140, fin: 0.0100, defaultPrev: 1.2330, defaultCurr: 1.2330 },
  'OPEN': { type: 'COLABORADORA', clhName: 'cordoba', porte: 0.0100, pase: 0.0130, fin: 0.0100, defaultPrev: 1.1270, defaultCurr: 1.1270 },
  'TJOIL SEVILLA': { type: 'COLABORADORA', clhName: 'sevilla', porte: 0.0060, pase: 0.0180, fin: 0.0100, defaultPrev: 1.0600, defaultCurr: 1.0600 },
  'BENAVENTE': { type: 'COLABORADORA', clhName: 'n/a', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
  'IRUN ZAISA III': { type: 'COLABORADORA', clhName: 'n/a', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
  'TARRAGONA': { type: 'COLABORADORA', clhName: 'TARRAGONA', porte: 0.0050, pase: 0.0150, fin: 0.0100, defaultPrev: 1.2000, defaultCurr: 1.2000 },
  'LACHAR': { type: 'COLABORADORA', clhName: 'motril', porte: 0.0080, pase: 0.0210, fin: 0.0100, defaultPrev: 1.2170, defaultCurr: 1.2170 },
  'LA CAMPANA': { type: 'COLABORADORA', clhName: 'cordoba', porte: 0.0090, pase: 0.0150, fin: 0.0100, defaultPrev: 1.1290, defaultCurr: 1.1290 },
  'AVILESINA': { type: 'COLABORADORA', clhName: 'n/a', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
  'GOR': { type: 'COLABORADORA', clhName: 'motril', porte: 0.0070, pase: 0.0210, fin: 0.0100, defaultPrev: 1.2270, defaultCurr: 1.2270 },
  'LLERS': { type: 'COLABORADORA', clhName: 'BARCELONA', porte: 0.0120, pase: 0.0120, fin: 0.0100, defaultPrev: 1.2150, defaultCurr: 1.2150 },
  'DARRO - A92': { type: 'COLABORADORA', clhName: 'motril', porte: 0.0070, pase: 0.0210, fin: 0.0100, defaultPrev: 1.2270, defaultCurr: 1.2270 },
  'MERIDA': { type: 'COLABORADORA', clhName: 'n/a', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
  'MURCIA': { type: 'COLABORADORA', clhName: 'CARTAGENA', porte: 0.0070, pase: 0.0150, fin: 0.0100, defaultPrev: 1.1300, defaultCurr: 1.1300 },
  'NORIOIL': { type: 'COLABORADORA', clhName: 'HUELVA', porte: 0.0200, pase: 0.0150, fin: 0.0100, defaultPrev: 1.0910, defaultCurr: 1.0910 },
  'SAN VICENTE DEL PALACIO': { type: 'COLABORADORA', clhName: 'n/a', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
  'WATERY ARANDA': { type: 'COLABORADORA', clhName: 'n/a', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
  'BERA': { type: 'COLABORADORA', clhName: 'bilbao', porte: 0.0120, pase: 0.0120, fin: 0.0100, defaultPrev: 1.0400, defaultCurr: 1.0400 },
  'PUERTO DE BARCELONA': { type: 'COLABORADORA', clhName: '0', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
  'GIRONA-CALSINA': { type: 'COLABORADORA', clhName: 'barcelona', porte: 0.0130, pase: 0.0150, fin: 0.0100, defaultPrev: 1.5310, defaultCurr: 1.5310 },
  'FEGOBLAN PONTEVEDRA': { type: 'COLABORADORA', clhName: 'n/a', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
  'VEGA DE VALCARCE': { type: 'COLABORADORA', clhName: 'n/a', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
  'HOILA TOLEDO': { type: 'COLABORADORA', clhName: 'n/a', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
  'PETREM FIGUERES': { type: 'COLABORADORA', clhName: 'n/a', porte: 0.0000, pase: 0.0000, fin: 0.0000, defaultPrev: 1.1850, defaultCurr: 1.1850 },
};

export const PRODUCTS = [
  { code: 'GOA', name: 'Gasóleo A', order: 1 },
  { code: 'GASOLINA', name: 'Gasolina 95', order: 2 },
  { code: 'ADBLUE', name: 'AdBlue', order: 3 },
];

export const TARIFFS = [
  'TARIFA 12',
  'TARIFA 18',
  'T18 - PISTA DE SILLA',
  'TARIFA 24',
  'TARIFA 36',
  'T36 - PISTA DE SILLA',
  'ESPECIAL COMPLETO',
  'TARIFA 40',
  'TARIFA 42',
  'TARIFA 45',
  'TARIFA 50',
  'TARIFA 60',
  'T60 - PISTA DE SILLA',
  'AMAEXO',
  'NORIEGA',
  'E100',
  'TARIFA ECO',
  'DORADO',
  'HIQI',
  'NORPETROL 24',
  'ROR',
  'TARJETERA',
  'TAX MOVING 24',
  'TORTUGA',
  'TARIFA 15',
  'TARIFA 27',
  'EXOIL',
  'NORPETROL',
];
