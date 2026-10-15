export interface PricePair { sinIva: number; conIva: number }
export interface SabanaPrices {
  date: string;
  sources: Record<string, Record<string, PricePair>>;
  tariffs: Record<string, string>;
}
export interface HvoPrices { date: string; alfajarin: PricePair; valdemoro: PricePair }
export const SABANA_PRICES_KEY = 'efi_sabana_prices_v1';
export const HVO_PRICES_KEY = 'efi_postes_hvo_prices_v1';
export const SABANA_PRICES_EVENT = 'efi_sabana_prices_updated';
export const HVO_PRICES_EVENT = 'efi_postes_hvo_prices_updated';
export interface PdfSourceConfig { sourceType: string; manualPriceSinIva?: number }

export const normalizePriceName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toUpperCase().replace(/\s+/g, ' ').trim();

export function pdfTariffSource(tariff: string, published?: SabanaPrices | null): string | null {
  const name = normalizePriceName(tariff);
  if (published?.tariffs[name]) return published.tariffs[name];
  const aliases: Record<string, string> = {
    AMAEXO: 'SABANA_T36', E100: 'SABANA_T36', 'E-100': 'SABANA_T36',
    HIQI: 'SABANA_T36', TARJETERA: 'SABANA_T36', TORTUGA: 'SABANA_T36',
    'NORPETROL 24': 'SABANA_T24', 'TAX MOVING 24': 'SABANA_T24', VRIO: 'SABANA_T24',
    DORADO: 'SABANA_ESTEBAN', ESTEBAN: 'SABANA_ESTEBAN', ROR: 'SABANA_ROR',
    'ESPECIAL COMPLETO': 'SABANA_C0', 'C-0 GENERAL': 'SABANA_C0',
    ECO: 'SABANA_ECOTRANS', 'TARIFA ECO': 'SABANA_ECOTRANS', ECOTRANS: 'SABANA_ECOTRANS',
    'LOS JAVI': 'SABANA_JAVI', CARRERAS: 'SABANA_CARRERAS', TRANSFRIRED: 'SABANA_TRANSFRIRED',
    'MIKI 90': 'SABANA_MIKI', BENITO: 'SABANA_T12',
    'TARIFA 27 SUR': 'SABANA_T27_SUR', 'TARIFA 15 SUR': 'SABANA_T15_SUR', 'TARIFA 75': 'SABANA_T75',
    'TARIFA 30': 'SABANA_T30', T30: 'SABANA_T30',
  };
  if (aliases[name]) return aliases[name];
  const standard = name.match(/^(?:TARIFA\s*|T\s*)(12|18|24|36|40|42|45|47|50|60)(?:\b|\s*-)/);
  return standard ? `SABANA_T${standard[1]}` : null;
}

function stationKey(name: string) {
  const key = normalizePriceName(name).replace(/^(ES|GANESHA)\s+/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  return ({ ARCOS: 'ARCOS JALON', ALCUBILLAS: 'SORIA ALCUBILLAS', MANISES: 'MANISES EXOIL' } as Record<string, string>)[key] || key;
}

export function publishedStationPrice(published: SabanaPrices | null, date: string, source: string | null, station: string): PricePair | null {
  if (!published || published.date !== date || !source) return null;
  const rows = published.sources[source];
  if (!rows) return null;
  const price = rows[station] || Object.entries(rows).find(([name]) => stationKey(name) === stationKey(station))?.[1];
  return price && Number.isFinite(price.sinIva) && Number.isFinite(price.conIva) ? price : null;
}

export function pdfStationSource(tariff: string, station: string, mapping: Record<string, PdfSourceConfig>, published: SabanaPrices | null) {
  const clean = station.toUpperCase().replace(/^ES\s+/, '').trim();
  const configured = mapping[`${tariff}::${station}`] || mapping[`${tariff}::${clean}`] || mapping[`${tariff}::__DEFAULT__`];
  return configured?.sourceType?.startsWith('SABANA_') ? configured.sourceType : pdfTariffSource(tariff, published);
}
