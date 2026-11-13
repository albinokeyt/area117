// Tarifas Estándar (Columnas B a T en el Excel)
export const STANDARD_TARIFFS = [
  { id: '12', name: '12', colTitle: '12 SIN IVA', markup: 0.0120 },
  { id: '18', name: '18', colTitle: '18 SIN IVA', markup: 0.0180 },
  { id: '24', name: '24', colTitle: '24 SIN IVA', markup: 0.0240 },
  { id: '36', name: '36', colTitle: '36 SIN IVA', markup: 0.0360 },
  { id: '40', name: '40', colTitle: '40 SIN IVA', markup: 0.0400 },
  { id: '42', name: '42', colTitle: '42 SIN IVA', markup: 0.0420 },
  { id: '47', name: '47', colTitle: '47 SIN IVA', markup: 0.0470 },
  { id: '50', name: '50', colTitle: '50 SIN IVA', markup: 0.0600 },
  { id: '60', name: '60', colTitle: '60 SIN IVA', markup: 0.0800 },
];

// Estructura de Tarifas Especiales Solicitadas
export interface SpecialTariffGroupDef {
  id: string;
  title: string;
  description: string;
  columnsRange: string;
  tariffs: { name: string; markup: number }[];
  borderTheme: string;
  badgeTheme: string;
}

export const SPECIAL_TARIFF_BLOCKS: SpecialTariffGroupDef[] = [
  {
    id: 'los_javi',
    title: 'Tarifa Especial Los Javi & Carreras',
    description: 'Tarifas preferenciales asignadas para flotas Los Javi y Carreras',
    columnsRange: 'Cols T:Y',
    tariffs: [
      { name: 'Especial Javi', markup: 0.116 },
      { name: 'Especial Carreras', markup: 0.116 },
    ],
    borderTheme: 'border-blue-500/30',
    badgeTheme: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  {
    id: 'transfrired',
    title: 'Tarifa Especial Transfrired',
    description: 'Tarifas preferenciales asignadas para flota Transfrired',
    columnsRange: 'Cols Z:AB',
    tariffs: [
      { name: 'Especial Transfrired', markup: 0.116 },
    ],
    borderTheme: 'border-green-500/30',
    badgeTheme: 'bg-green-500/15 text-green-300 border-green-500/30',
  },
  {
    id: 'c0_general',
    title: 'Tarifa C-0 (Especial General)',
    description: 'Tarifa matriz general de convenio C-0 para transporte de carga',
    columnsRange: 'Cols AF:AH',
    tariffs: [
      { name: 'Especial General C-0', markup: 0.116 },
    ],
    borderTheme: 'border-emerald-500/30',
    badgeTheme: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'ror_esteban',
    title: 'Tarifa Especial ROR & Esteban',
    description: 'Tarifas especiales para transporte internacional ROR y flota Esteban',
    columnsRange: 'Cols AJ:AN',
    tariffs: [
      { name: 'Especial ROR', markup: 0.132 },
      { name: 'Especial Esteban', markup: 0.132 },
    ],
    borderTheme: 'border-cyan-500/30',
    badgeTheme: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'miki_ecotrans_tarifa30',
    title: 'Tarifa 90 Miki / Milo, ECOTRANS & Tarifa 30',
    description: 'Tarifas corporativas ECOTRANS, flota 90 Miki / Milo y Tarifa 30',
    columnsRange: 'Cols AP:AW',
    tariffs: [
      { name: 'Tarifa 90 Miki', markup: 0.090 },
      { name: 'Tarifa ECOTRANS', markup: 0.050 },
      { name: 'Tarifa 30', markup: 0.030 },
    ],
    borderTheme: 'border-amber-500/30',
    badgeTheme: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'sur_benito',
    title: 'Tarifas Sur (Benito: 27 Sur & 15 Sur)',
    description: 'Convenios específicos zona Sur: Tarifa 27 Sur y Tarifa 15 Sur',
    columnsRange: 'Cols AZ:BE',
    tariffs: [
      { name: 'Tarifa 27 Sur', markup: 0.027 },
      { name: 'Tarifa 15 Sur', markup: 0.015 },
    ],
    borderTheme: 'border-purple-500/30',
    badgeTheme: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
];
