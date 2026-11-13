import { PROPIAS_STATIONS } from './dataSeed';

export const EXCEL_MAPPINGS_KEY = 'efi_excel_import_mappings_v1';
export const EXCEL_VALUES_KEY = 'efi_excel_import_values_v1';
export const INITIAL_SHEET = 'CALCULO INICIAL';
export const EXCEL_SCALE = ['auto', 'euros', 'miles'] as const;

export interface ExcelMapping {
  target: string;
  sheet: string;
  cell: string;
  scale: typeof EXCEL_SCALE[number];
  stationCell?: string;
  productCell?: string;
  replaceFormula?: boolean;
}

export const targetId = (...parts: string[]) => parts.map(encodeURIComponent).join('|');
export const excelVariable = (cell: string) => 'EXCEL:' + encodeURIComponent(cell).toUpperCase();
export function validateExcelValues(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 10_000 ||
    Object.entries(value).some(([key, price]) => !/^(STD|SPEC)_/.test(key) || key.length > 500 ||
      typeof price !== 'number' || !Number.isFinite(price) || price < 0)) {
    throw new Error('Los precios importados de Sábana no son válidos.');
  }
}
export const validExcelCell = (cell: string) => {
  const match = /^([A-Z]{1,3})([1-9]\d{0,6})$/.exec(cell);
  if (!match || Number(match[2]) > 1_048_576) return false;
  return [...match[1]].reduce((column, char) => column * 26 + char.charCodeAt(0) - 64, 0) <= 16_384;
};

export function validateExcelMappings(value: unknown): asserts value is ExcelMapping[] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error('El mapa admite hasta 1.000 destinos.');
  const targets = new Set<string>();
  for (const rule of value) {
    if (!rule || typeof rule.target !== 'string' || !rule.target || rule.target.length > 500 || targets.has(rule.target)) {
      throw new Error('Selecciona un destino distinto para cada regla.');
    }
    if (typeof rule.sheet !== 'string' || !rule.sheet.trim() || rule.sheet.length > 31
      || typeof rule.cell !== 'string' || !validExcelCell(rule.cell)
      || !EXCEL_SCALE.includes(rule.scale)
      || [rule.stationCell, rule.productCell].some(cell => cell !== undefined && (typeof cell !== 'string' || !validExcelCell(cell)))
      || (rule.replaceFormula !== undefined && typeof rule.replaceFormula !== 'boolean')) {
      throw new Error('Revisa el nombre de hoja, las celdas y la escala de cada regla.');
    }
    targets.add(rule.target);
  }
}

const fixed = [
  [35, 'BENAVENTE'], [36, 'IRUN ZAISA III'], [40, 'AVILESINA'], [44, 'MERIDA'], [48, 'SAN VICENTE DEL PALACIO'],
  [49, 'WATERY ARANDA'], [51, 'PUERTO DE BARCELONA'], [52, 'GIRONA-CALSINA'], [53, 'FEGOBLAN PONTEVEDRA'],
  [54, 'VEGA DE VALCARCE'], [55, 'HOILA TOLEDO'], [56, 'PETREM FIGUERES'], [57, 'ANDOAIN'], [58, 'TARREGA'],
] as const;
const other = [
  [23, 'ABRERA'], [24, 'VALDEHERRERA'], [25, 'EL CASAR'], [27, 'LA JOYOSA'], [28, 'JUNDIZ NORPETROL'],
  [29, 'OLIVERAL'], [31, 'GUARROMAN'], [32, 'VALDEPEÑAS'], [33, 'OPEN'], [34, 'TJOIL SEVILLA'], [37, 'TARRAGONA'],
  [38, 'LACHAR'], [39, 'LA CAMPANA'], [41, 'GOR'], [42, 'LLERS'], [43, 'DARRO - A92'], [45, 'SANCTI-SPIRITUS'],
  [46, 'MURCIA'], [47, 'NORIOIL'], [50, 'BERA'],
] as const;
const special = [
  'TORREJON', 'ARCOS JALON', 'ALFAJARIN', 'TORREMOCHA', 'MADRID', 'VALDEMORO', 'EL CASAR', 'PAMPLONA',
  'HUMILLADERO', 'UCLES', 'BENAMEJI', 'SORIA ALCUBILLAS', 'RIBA-ROJA', 'PISTA DE SILLA', 'ES REAL DE GANDIA',
  'ES CHIVA', 'ES ALBERIC', 'CATARROJA', 'MANISES - EXOIL', 'JUNDIZ NORPETROL', 'OLIVERAL', 'LLERS', 'GUARROMAN',
  'VALDEPEÑAS', 'BERA', '', 'ABRERA', 'LA CAMPANA', 'IRUN', 'GIRONA-CALSINA', 'OPEN', 'FIGUERES',
];
const postes = [
  'ARCOS', 'ALCUBILLAS', 'ALFAJARIN', 'TORREMOCHA', 'UCLES', 'VALLECAS', 'GANESHA MADRID', 'GANESHA TORREJON',
  'VALDEMORO', 'BENAMEJI', 'HUMILLADERO', 'ES RIBA-ROJA', 'ES PISTA DE SILLA', 'ES REAL DE GANDIA',
];
export const GASOLEO_B_STATIONS = ['UCLES', 'TORREMOCHA', 'ARCOS'];

function rule(parts: string[], cell: string, stationCell?: string, productCell?: string): ExcelMapping {
  return { target: targetId(...parts), sheet: INITIAL_SHEET, cell, scale: 'auto', stationCell, productCell };
}
const purchase = (name: string, cell: string, stationCell: string) => rule(['purchase', name, 'GOA', 'curr'], cell, stationCell);

export const DEFAULT_EXCEL_MAPPINGS: readonly ExcelMapping[] = [
  ...PROPIAS_STATIONS.map(({ name }, i) => purchase(name, 'M' + (i + 2), 'K' + (i + 2))),
  ...fixed.map(([i, name]) => purchase(name, 'H' + i, 'F' + i)),
  ...other.map(([i, name]) => purchase(name, 'M' + i, 'K' + i)),
  rule(['bronco', 'sinIva'], 'B64'),
  rule(['bronco', 'compra'], 'E64'),
  ...special.flatMap((name, i) => name ? [rule(['special', name, 'actualPrice'], 'C' + (i + 30), 'B' + (i + 30))] : []),
  ...postes.flatMap((name, i) => {
    const row = i === 0 ? 1 : i * 2;
    const goa = rule(['postes', name, 'goa'], 'C' + row, 'A' + row, 'B' + row);
    if (i === 0) return [goa];
    return [goa, rule(['postes', name, 'gasolina'], 'C' + (row + 1), 'A' + row, 'B' + (row + 1))];
  }),
  rule(['hvo', 'hvoGeneralBase'], 'B67'),
  rule(['hvo', 'hvoGeneralAddition'], 'C67'),
  rule(['hvo', 'hvoAlfajarinSinIva'], 'E6'),
  rule(['hvo', 'valdemoroTarget'], 'E17'),
  ...GASOLEO_B_STATIONS.flatMap((name, i) => [
    rule(['gasB', name, 'compra'], 'B' + (i + 83), 'A' + (i + 83)),
    rule(['gasB', name, 'poste'], 'E83'),
  ]),
  rule(['sabana', 'MADRID', 'TRAJOTA', 'sinIva'], 'I68'),
];
