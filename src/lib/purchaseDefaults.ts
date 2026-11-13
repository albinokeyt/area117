import type { GasolinaBroncoRow } from './excelExportService';

export const DEFAULT_GASOLINA_BRONCO: GasolinaBroncoRow = {
  name: 'GASOLINA BRONCO',
  sinIva: '1,397',
  conIva: '1,690',
  beneficio: '0,034',
  compra: '1,348',
  fecha: '04/09/2026',
};

// Datos EXACTOS de la Hoja de Cálculo Inicial B50:F82 (Imagen proporcionada por el usuario)
export interface SpecialStationRateRow {
  id: string;
  name: string;
  isBlueBg?: boolean;
  isYellowPrice?: boolean;
  isRedRef?: boolean;
  actualPrice: string;
  refPrice: string;
  basePrice: string;
  isCustomActual?: boolean;
  isCustomRef?: boolean;
  isCustomBase?: boolean;
}

export const DEFAULT_SPECIAL_RATES_B50_F82: SpecialStationRateRow[] = [
  { id: 'torrejon', name: 'TORREJON', isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'arcos_jalon', name: 'ARCOS JALON', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'alfajarin', name: 'ALFAJARIN', isBlueBg: true, isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'torremocha', name: 'TORREMOCHA', isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'madrid', name: 'MADRID', isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'valdemoro', name: 'VALDEMORO', isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'el_casar', name: 'EL CASAR', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'pamplona', name: 'PAMPLONA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'humilladero', name: 'HUMILLADERO', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'ucles', name: 'UCLES', isYellowPrice: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'benameji', name: 'BENAMEJI', isBlueBg: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'soria_alcubillas', name: 'SORIA ALCUBILLAS', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'riba_roja', name: 'RIBA-ROJA', isBlueBg: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'pista_silla', name: 'PISTA DE SILLA', isBlueBg: true, isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'real_gandia', name: 'ES REAL DE GANDIA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'chiva', name: 'ES CHIVA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'alberic', name: 'ES ALBERIC', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'catarroja', name: 'CATARROJA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'manises', name: 'MANISES - EXOIL', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'jundiz', name: 'JUNDIZ NORPETROL', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'oliveral', name: 'OLIVERAL', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'llers', name: 'LLERS', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'guarroman', name: 'GUARROMAN', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'valdepenas', name: 'VALDEPEÑAS', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'bera', name: 'BERA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'abrera', name: 'ABRERA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'la_campana', name: 'LA CAMPANA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'irun', name: 'IRUN', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'girona_calsina', name: 'GIRONA-CALSINA', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'open', name: 'OPEN', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
  { id: 'figueres', name: 'FIGUERES', isRedRef: true, actualPrice: '', refPrice: '', basePrice: '' },
];
