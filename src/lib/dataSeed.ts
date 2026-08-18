export interface StationSeed {
  name: string;
  type: 'PROPIA' | 'COLABORADORA';
  isFixedColaboradora?: boolean;
  order: number;
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
  { name: 'Z.FRANCA', type: 'COLABORADORA', isFixedColaboradora: true, order: 27 },
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
  { name: 'SANCTI-SPIRITUS', type: 'COLABORADORA', isFixedColaboradora: true, order: 42 },
  { name: 'MURCIA', type: 'COLABORADORA', isFixedColaboradora: false, order: 43 },
  { name: 'NORIOIL', type: 'COLABORADORA', isFixedColaboradora: false, order: 44 },
  { name: 'SAN VICENTE DEL PALACIO', type: 'COLABORADORA', isFixedColaboradora: true, order: 45 },
  { name: 'WATERY ARANDA', type: 'COLABORADORA', isFixedColaboradora: true, order: 46 },
  { name: 'BERA', type: 'COLABORADORA', isFixedColaboradora: false, order: 47 },
  { name: 'PUERTO DE BARCELONA', type: 'COLABORADORA', isFixedColaboradora: true, order: 48 },
  { name: 'GIRONA-CALSINA', type: 'COLABORADORA', isFixedColaboradora: false, order: 49 },
  { name: 'FEGOBLAN PONTEVEDRA', type: 'COLABORADORA', isFixedColaboradora: true, order: 50 },
  { name: 'VEGA DE VALCARCE', type: 'COLABORADORA', isFixedColaboradora: true, order: 51 },
  { name: 'HOILA TOLEDO', type: 'COLABORADORA', isFixedColaboradora: true, order: 52 },
  { name: 'PETREM FIGUERES', type: 'COLABORADORA', isFixedColaboradora: true, order: 53 },
];

export const COLABORADORAS_STATIONS = COLABORADORA_STATIONS;

export const PRODUCTS = [
  { code: 'GOA', name: 'Gasóleo A', order: 1 },
  { code: 'GASOLINA', name: 'Gasolina 95', order: 2 },
  { code: 'GOA_PREMIUM', name: 'Gasóleo A Premium (+0.04€)', order: 3 },
  { code: 'HVO', name: 'HVO', order: 4 },
  { code: 'GASOLEO_B', name: 'Gasóleo B', order: 5 },
  { code: 'ADBLUE', name: 'AdBlue', order: 6 },
];

export const TARIFFS = [
  'SABANA DE PRECIOS',
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
