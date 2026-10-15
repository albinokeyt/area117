import { workspaceStorage } from './workspaceStorage';
import { SABANA_PRICES_KEY, SabanaPrices, pdfTariffSource, publishedStationPrice, normalizePriceName, stationKey } from './publishedPrices';
import { getPurchaseItemSalePrice, getFreshestPurchasesData, loadPostesFormulas, reevaluateAllPostesFormulas } from './sabanaFormulaEngine';
import { getStationExcelCosts } from './stationsService';

export const money = (value: unknown): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(number) ? number : null;
};
const round = (value: number) => Number(value.toFixed(3));
export const stationIdentity = stationKey;
const livePurchase = (purchases: Record<string, any>, station: string) => purchases[`${station}_GOA`] || Object.entries(purchases).find(([key]) => key.endsWith('_GOA') && stationIdentity(key.slice(0, -4)) === stationIdentity(station))?.[1];
export interface LivePriceContext {
  date: string;
  purchases: Record<string, any>;
  specialRates: readonly any[];
  postes: any;
  bronco: any;
  published: SabanaPrices | null;
  postesFormulas?: Record<string, { evaluatedValue: number }>;
  customSources?: Record<string, string>;
}
export function getLivePriceContext(date: string): LivePriceContext {
  const customSources: Record<string, string> = {};
  for (const [key, prefix] of [['efi_sabana_custom_standard_tariffs_v1', 'STD'], ['efi_sabana_custom_special_tariffs_v1', 'SPEC'], ['efi_sabana_custom_block_tariffs_v1', 'SPEC']]) {
    for (const t of workspaceStorage.readJson<any[]>(key) || []) {
      customSources[`SABANA_CUSTOM_${prefix}_${String(t.id || t.name).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] = prefix === 'STD' ? `SABANA_T${t.id}` : `SABANA_CUSTOM:${t.id}`;
    }
  }
  return { date, purchases: getFreshestPurchasesData(date),
    specialRates: workspaceStorage.readJson<any[]>('efi_special_rates_b50_f82_v4') || workspaceStorage.readJson<any[]>('efi_special_rates_b50_f82_v3') || [],
    postes: workspaceStorage.readJson('efi_postes_data_v2') || {},
    bronco: workspaceStorage.readJson('efi_compras_gasolina_bronco') || workspaceStorage.readJson(`efi_purchases_bronco_${date}`) || {},
    published: workspaceStorage.readJson<SabanaPrices>(SABANA_PRICES_KEY),
    postesFormulas: reevaluateAllPostesFormulas(loadPostesFormulas(date), date), customSources };
}
export function sabanaSourceForEfiTariff(tariff: string, published: SabanaPrices | null): string | null {
  const exact = pdfTariffSource(tariff, published);
  if (exact) return exact;
  const name = normalizePriceName(tariff).replace(/^TARIFA\s+/, '');
  const aliases: Record<string, string> = { JAVI: 'SABANA_JAVI', CARRERAS: 'SABANA_CARRERAS', TRANSFRIRED: 'SABANA_TRANSFRIRED', 'ESPECIAL GENERAL': 'SABANA_C0', ROR: 'SABANA_ROR', ESTEBAN: 'SABANA_ESTEBAN', '85': 'SABANA_MIKI', '27 SUR': 'SABANA_T27_SUR', '15 SUR': 'SABANA_T15_SUR' };
  return aliases[name] || pdfTariffSource(name, published);
}
export function liveSpecialPrice(context: Pick<LivePriceContext, 'purchases' | 'specialRates'>, station: string, reference: boolean): number {
  const row = context.specialRates.find(r => r?.name && stationIdentity(r.name) === stationIdentity(station));
  const sale = getPurchaseItemSalePrice(livePurchase(context.purchases, station), station, getStationExcelCosts()[station]);
  const actual = row?.isCustomActual ? money(row.actualPrice) ?? sale : sale;
  if (!reference) return actual;
  return row?.isCustomRef ? money(row.refPrice) ?? round(actual > 0 ? actual + .008 : actual) : round(actual > 0 ? actual + .008 : actual);
}
/** Resolve a saved reference against today's source. Missing explicit sources stay missing. */
export function resolveLivePrice(source: string, station: string, context: LivePriceContext, defaultPrice?: number | null): number | null {
  if (source === 'DEFAULT') return defaultPrice ?? null;
  if (source.startsWith('SABANA_')) {
    const id = context.customSources?.[source] || ({ SABANA_T27: 'SABANA_T27_SUR', SABANA_T15: 'SABANA_T15_SUR' } as Record<string, string>)[source] || source;
    return publishedStationPrice(context.published, context.date, id, station)?.conIva ?? null;
  }
  const hasSpecial = !!livePurchase(context.purchases, station) || context.specialRates.some(row => stationIdentity(row.name || '') === stationIdentity(station) && (row.isCustomRef || row.isCustomActual));
  if ((source.startsWith('ESPECIAL_') || source.startsWith('COMPRAS_ESPECIAL_')) && !hasSpecial) return null;
  if (source === 'ESPECIAL_REF' || source === 'COMPRAS_ESPECIAL_REF') return round(liveSpecialPrice(context, station, true) * 1.21);
  if (source === 'ESPECIAL_ACTUAL' || source === 'COMPRAS_ESPECIAL_ACTUAL') return round(liveSpecialPrice(context, station, false) * 1.21);
  if (source === 'COMPRAS_VENTA_SUGERIDO') {
    if (!livePurchase(context.purchases, station)) return null;
    const price = getPurchaseItemSalePrice(livePurchase(context.purchases, station), station, getStationExcelCosts()[station]);
    return round(price * 1.21);
  }
  if (source === 'COMPRAS_PRECIO_COMPRA' || source === 'COMPRAS_MEDIO' || source === 'COMPRAS_MINIMO') {
    const price = money(livePurchase(context.purchases, station)?.curr);
    return price === null ? null : round(price * 1.21);
  }
  if (source === 'COMPRAS_BRONCO') return money(context.bronco.conIva);
  const postesProduct = ({ POSTES_GOA: 'GOA', POSTE_GOA: 'GOA', POSTES_GAS95: 'GASOLINA', POSTE_G95: 'GASOLINA' } as Record<string, string>)[source];
  if (postesProduct) {
    const field = postesProduct === 'GOA' ? 'goa' : 'gasolina';
    const entry = Object.entries(context.postes.postes || {}).find(([name]) => stationIdentity(name) === stationIdentity(station));
    const formula = Object.entries(context.postesFormulas || {}).find(([key]) => key.startsWith('POSTE_') && key.endsWith(`_${postesProduct}`) && stationIdentity(key.slice(6, -postesProduct.length - 1)) === stationIdentity(station));
    return money(formula?.[1].evaluatedValue ?? (entry?.[1] as any)?.[field]);
  }
  if (source === 'POSTES_GOB') {
    const entry = Object.entries(context.postes.gasoleoBRows || {}).find(([name]) => stationIdentity(name) === stationIdentity(station));
    if (!entry) return null;
    const [name, row] = entry as [string, any];
    const formulas = context.postesFormulas || {};
    const compra = money(formulas[`POSTE_GASB_${name}_COMPRA`]?.evaluatedValue ?? row.compra);
    if (compra === null) return null;
    const modified: string[] = context.postes.modified || [];
    const transferModified = modified.includes(`gasb_transfer_${name}`) || modified.includes(`gasb_${name}`) || modified.includes(`gasb_compra_${name}`);
    const transfer = money(formulas[`POSTE_GASB_${name}_TRANSFER`]?.evaluatedValue) ?? (transferModified ? money(row.transfer) : null) ?? round(compra + .017);
    return money(formulas[`POSTE_GASB_${name}_TRANSFER_CON_IVA`]?.evaluatedValue) ?? round(transfer * 1.21);
  }
  return null;
}
