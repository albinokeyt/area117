import { getDefaultStationsCatalog, type StationsCatalog } from './stationsService';
import { SPECIAL_TARIFF_BLOCKS, STANDARD_TARIFFS } from './sabanaTariffDefaults';
import { GASOLEO_B_STATIONS, targetId } from './excelImportMappings';
import { stationKey } from './publishedPrices';
import type { SabanaTariffDef } from '@/components/SabanaTariffManagerModal';
import { DEFAULT_SPECIAL_RATES_B50_F82 } from './purchaseDefaults';

export type ImportState = Record<string, any>;
export type TargetArea = 'Compras' | 'Postes' | 'Sábana de Precios';
export interface ExcelTarget {
  id: string;
  area: TargetArea;
  label: string;
  kind: string;
  name: string;
  field: string;
  product?: string;
  formulaKey?: string;
  formulaAliases?: string[];
  blockName?: string;
  createTariff?: SabanaTariffDef;
}

export const PURCHASE_FIELDS = {
  curr: 'Precio compra hoy', prev: 'Precio anterior de compra', porte: 'Porte', pase: 'Pase',
  fin: 'Financiación', sale: 'Precio de venta sugerido', prevSale: 'Precio anterior de venta',
};
const SPECIAL_FIELDS = { actualPrice: 'Precio Referencia', refPrice: 'Precio Especial Sugerido', basePrice: 'Precio base / coste' };
const BRONCO_FIELDS = { sinIva: 'Sin IVA', conIva: 'Con IVA', compra: 'Compra' };
const HVO_FIELDS = {
  hvoGeneralBase: 'HVO general · Compra base sin IVA',
  hvoGeneralAddition: 'HVO general · Monto a sumar',
  hvoAlfajarinSinIva: 'HVO Alfajarín · Precio sin IVA',
  hvoValdemoroAddition: 'HVO Valdemoro · Monto a sumar',
  valdemoroTarget: 'HVO Valdemoro · Precio objetivo con IVA',
};
export const GASB_FIELDS = { compra: 'Compra sin IVA', transfer: 'Transfrired', poste: 'Precio poste' };
export const importStationKey = (name: string) => stationKey(name.replace(/\bPISTAL\b/i, 'PISTA'));
export const importCatalog = (state: ImportState): StationsCatalog => state.efi_stations_catalog_v1 || getDefaultStationsCatalog();
export const importSpecialRates = (state: ImportState) =>
  state.efi_special_rates_b50_f82_v4 || state.efi_special_rates_b50_f82_v3 || DEFAULT_SPECIAL_RATES_B50_F82;

function tariffs(state: ImportState) {
  const deleted = new Set<string>(state.efi_sabana_deleted_tariffs_v1 || []);
  const mods = state.efi_sabana_modified_tariffs_config_v1 || {};
  const customSpecials: SabanaTariffDef[] = state.efi_sabana_custom_special_tariffs_v1?.length
    ? state.efi_sabana_custom_special_tariffs_v1
    : [10, 20, 30].map(n => ({ id: 'spec_prepago_' + n, name: 'PREPAGO ' + n, markup: 0, blockType: 'special' }));
  const customBlocks: SabanaTariffDef[] = state.efi_sabana_custom_block_tariffs_v1 || [];
  const other: SabanaTariffDef[] = [
    ...STANDARD_TARIFFS.map(t => ({ ...t, blockType: 'standard' as const })),
    ...(state.efi_sabana_custom_standard_tariffs_v1 || []), ...customSpecials, ...customBlocks,
  ];
  const foundTrajota = other.some(t => (mods[t.id]?.name || mods[t.name]?.name || t.name).trim().toUpperCase() === 'TRAJOTA');
  const createTariff: SabanaTariffDef | undefined = foundTrajota ? undefined : {
    id: 'block_talaexpress_trajota', name: 'TRAJOTA', blockType: 'custom_block',
    specialBlockId: customBlocks.find(t => t.customBlockName?.toUpperCase().trim() === 'TALAEXPRESS')?.specialBlockId || 'block_talaexpress',
    customBlockName: 'TALAEXPRESS', markup: 0, isCustom: true,
  };
  if (createTariff && !deleted.has(createTariff.id)) other.push(createTariff);
  return [
    ...other.filter(t => !deleted.has(t.id)).map(t => ({
      name: mods[t.id]?.name || mods[t.name]?.name || t.name,
      id: t.id,
      blockName: t.customBlockName,
      createTariff: t === createTariff ? createTariff : undefined,
      specialBlockId: undefined as string | undefined,
    })),
    ...SPECIAL_TARIFF_BLOCKS.filter(block => block.id !== 'tarifa_75').flatMap(block => block.tariffs.map(t => ({
      name: t.name, id: t.name, blockName: block.title, createTariff: undefined, specialBlockId: block.id,
    }))),
  ];
}

export function excelTargets(state: ImportState): ExcelTarget[] {
  const catalog = importCatalog(state);
  const stations = [...catalog.propias, ...catalog.colaboradoras];
  const result: ExcelTarget[] = [];
  const add = (area: TargetArea, parts: string[], label: string, details: Omit<ExcelTarget, 'id' | 'area' | 'label' | 'kind'>) => {
    result.push({ id: targetId(...parts), area, kind: parts[0], label, ...details });
  };
  for (const { name } of stations) {
    const products = ['GOA', 'GASOLINA', ...(catalog.adblueConfig[name] ? ['ADBLUE'] : [])];
    for (const product of products) for (const [field, label] of Object.entries(PURCHASE_FIELDS)) {
      add('Compras', ['purchase', name, product, field], `${name} · ${product} · ${label}`, { name, field, product });
    }
  }
  for (const { name } of importSpecialRates(state)) {
    for (const [field, label] of Object.entries(SPECIAL_FIELDS)) {
      add('Compras', ['special', name, field], `Tarifas Especiales · ${name} · ${label}`, { name, field });
    }
  }
  for (const [field, label] of Object.entries(BRONCO_FIELDS)) {
    add('Compras', ['bronco', field], `Gasolina Bronco · ${label}`, { name: 'Gasolina Bronco', field });
  }
  for (const st of catalog.postesStations) {
    const { name } = st;
    for (const field of st.hasGasolina === false || name === 'ARCOS' ? ['goa'] : ['goa', 'gasolina']) {
      const product = field === 'goa' ? 'GOA' : 'GASOLINA';
      add('Postes', ['postes', name, field], `${name} · ${product}`, { name, field, product, formulaKey: `POSTE_${name}_${product}` });
    }
  }
  const hvoKeys: Record<string, string> = {
    hvoGeneralBase: 'GENERAL_BASE', hvoGeneralAddition: 'GENERAL_ADD', hvoAlfajarinSinIva: 'ALFAJARIN_SIN_IVA',
    hvoValdemoroAddition: 'VALDEMORO_ADD', valdemoroTarget: 'VALDEMORO_ADD',
  };
  for (const [field, label] of Object.entries(HVO_FIELDS)) {
    add('Postes', ['hvo', field], label, { name: label.split(' · ')[0], field, formulaKey: 'POSTE_HVO_' + hvoKeys[field] });
  }
  for (const name of GASOLEO_B_STATIONS) for (const [field, label] of Object.entries(GASB_FIELDS)) {
    add('Postes', ['gasB', name, field], `Gasóleo B · ${name} · ${label}`, { name, field, formulaKey: `POSTE_GASB_${name}_${field.toUpperCase()}` });
  }
  const postes = state.efi_postes_data_v2 || {};
  for (const name of Object.keys(postes.adblue || catalog.adblueConfig)) for (const field of ['compra', 'poste']) {
    add('Postes', ['adblue', name, field], `AdBlue · ${name} · ${field}`, { name, field, formulaKey: `POSTE_ADBLUE_${name}_${field.toUpperCase()}` });
  }
  for (const name of Object.keys(postes.gases || GAS_DEFAULTS)) for (const field of ['sinIva', 'poste']) {
    const code = name.includes('GNC') ? 'GNC' : name.includes('GNL') ? 'GNL' : 'GLP';
    add('Postes', ['gases', name, field], `${name} · ${field === 'sinIva' ? 'Sin IVA' : 'Poste'}`, {
      name, field, formulaKey: `POSTE_GASES_${code}_${field === 'sinIva' ? 'SIN_IVA' : 'POSTE'}`,
    });
  }
  for (const tariff of tariffs(state)) for (const { name } of stations) for (const field of ['sinIva', 'conIva']) {
    const tariffName = tariff.name.toUpperCase().trim();
    const cleanName = name.toUpperCase().replace(/^ES\s+/, '').trim();
    const formulaKey = tariff.specialBlockId ? `SPEC_${tariff.specialBlockId}_${name}_${tariff.name}_${field}`
      : `STD_${name}_T${tariffName}_${field}`;
    const formulaAliases = tariff.specialBlockId ? [] : [
      `STD_${cleanName}_T${tariffName}_${field}`, `TAR_${tariffName}_${name}_${field}`, `TAR_${tariffName}_${cleanName}_${field}`,
      `STD_${name}_T${tariff.id}_${field}`, `STD_${cleanName}_T${tariff.id}_${field}`,
      `STD_${name}_T${tariffName.replace(/\s+/g, '')}_${field}`,
    ].filter(key => key !== formulaKey);
    add('Sábana de Precios', ['sabana', name, tariff.name, field],
      `${tariff.blockName ? tariff.blockName + ' · ' : ''}${tariff.name} · ${name} · ${field === 'sinIva' ? 'Sin IVA' : 'Con IVA'}`,
      { name, field, formulaKey, formulaAliases, blockName: tariff.blockName, createTariff: tariff.createTariff });
  }
  return result;
}

export function matchExcelTarget(rule: ExcelMappingTarget, options: ExcelTarget[]) {
  const exact = options.find(target => target.id === rule.target);
  if (exact) return exact;
  const [kind, name, ...rest] = rule.target.split('|').map(part => { try { return decodeURIComponent(part); } catch { return part; } });
  if (!name || !['purchase', 'special', 'postes', 'gasB', 'adblue', 'sabana'].includes(kind)) return undefined;
  const matches = options.filter(target => {
    if (target.kind !== kind || importStationKey(target.name) !== importStationKey(name)) return false;
    const last = kind === 'purchase' ? [target.product, target.field] : kind === 'sabana'
      ? [decodeURIComponent(target.id.split('|')[2]), target.field] : [target.field];
    return rest.length === last.length && rest.every((item, index) => item === last[index]);
  });
  return matches.length === 1 ? matches[0] : undefined;
}

type ExcelMappingTarget = { target: string };

export const GAS_DEFAULTS: Record<string, { sinIva: string; poste: string }> = {
  'GLP / Autogas': { sinIva: '0,785', poste: '0,949' },
  'GNC (Gas Natural Comprimido)': { sinIva: '0,950', poste: '1,149' },
  'GNL (Gas Natural Licuado)': { sinIva: '0,890', poste: '1,079' },
};
