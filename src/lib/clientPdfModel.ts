import type { HvoPrices, PricePair } from './publishedPrices';

export const PDF_EXPORT_NAMES_KEY = 'efi_pdf_export_names_v1';
export const PDF_DOCUMENT_DATE_KEY = 'efi_pdf_document_valid_from';
export type PdfExportNames = Record<string, string>;

const isGasoleoBTariff = (tariff: string) => /GOB|GAS[ÓO]LEO B/i.test(tariff);
export const pdfIncludesHvo = (tariff: string, settings: Record<string, boolean>) => settings[tariff] ?? !isGasoleoBTariff(tariff);
export const pdfStationIsActive = (tariff: string, station: string, settings: Record<string, string[]>) =>
  settings[tariff]?.includes(station) ?? (!isGasoleoBTariff(tariff) || /UCLES|TORREMOCHA|ARCOS/i.test(station));
export interface ClientPdfRow extends PricePair {
  station: string; bandera: string; ubicacion: string; labels: string[];
}
export interface ClientPdfDocument {
  tariff: string; filename: string; validFrom: string; rows: ClientPdfRow[];
  hvo: Pick<HvoPrices, 'alfajarin' | 'valdemoro'> | null;
}

export function pdfValidityDate(iso: string, separator = '/') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Indica una fecha de validez del documento válida.');
  const [year, month, day] = iso.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) throw new Error('Indica una fecha de validez del documento válida.');
  return iso.split('-').reverse().join(separator);
}

export function safePdfName(name: string) {
  return name.normalize('NFC').replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '-')
    .replace(/\s+/g, ' ').replace(/[. ]+$/, '').trim().slice(0, 100).trim();
}

export function clientPdfFilename(tariff: string, index: number, names: PdfExportNames, validFrom: string) {
  if (!Number.isInteger(index) || index < 0) throw new Error('El orden de la tarifa no es válido.');
  const name = safePdfName(names[tariff]?.trim() || tariff) || safePdfName(tariff);
  if (!name) throw new Error('La tarifa necesita un nombre de archivo válido.');
  return `${String(index + 1).padStart(2, '0')} ${name} VALIDA A PARTIR DE ${pdfValidityDate(validFrom, '-')}.pdf`;
}

export function parsePdfExportNames(raw: string | null): PdfExportNames {
  if (!raw) return {};
  const value = JSON.parse(raw);
  assertPdfExportNames(value);
  return value;
}

export function assertPdfExportNames(value: unknown): asserts value is PdfExportNames {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(name => typeof name !== 'string' || name.length > 100)) throw new Error('Los nombres PDF deben ser textos de hasta 100 caracteres por tarifa.');
}

// Keep unrelated remote edits; never silently overwrite another user's change to the same name.
export function mergePdfExportNames(base: PdfExportNames, draft: PdfExportNames, latest: PdfExportNames): PdfExportNames {
  const result = { ...latest };
  for (const tariff of new Set([...Object.keys(base), ...Object.keys(draft)])) {
    const before = base[tariff] || '', desired = draft[tariff]?.trim() || '', remote = latest[tariff] || '';
    if (desired === before) continue;
    if (remote !== before && remote !== desired) throw new Error(`Otro usuario cambió el nombre de ${tariff}. Cierra esta ventana y vuelve a abrirla para revisar el cambio.`);
    if (desired) result[tariff] = desired; else delete result[tariff];
  }
  return result;
}

export function snapshotClientPdfs(input: {
  tariffs: { name: string }[]; allTariffs: { name: string }[]; names: PdfExportNames; validFrom: string;
  stations: { name: string }[]; isActive: (tariff: string, station: string) => boolean;
  price: (tariff: string, station: string) => PricePair | null;
  metadata: (station: string) => { bandera: string; ubicacion: string };
  labels: (station: string) => string[]; includeHvo: (tariff: string) => boolean;
  hvo: HvoPrices | null; pricingDate: string;
}): ClientPdfDocument[] {
  pdfValidityDate(input.validFrom);
  if (!input.tariffs.length) throw new Error('No hay tarifas disponibles para descargar.');
  return input.tariffs.map(tariff => {
    const index = input.allTariffs.findIndex(item => item.name === tariff.name);
    if (index < 0) throw new Error(`La tarifa ${tariff.name} ya no está en el catálogo.`);
    const rows = input.stations.filter(station => input.isActive(tariff.name, station.name)).map(station => {
      const price = input.price(tariff.name, station.name);
      if (!price || !Number.isFinite(price.sinIva) || !Number.isFinite(price.conIva)) throw new Error(`${tariff.name} · ${station.name}: falta un origen de precio sin IVA o con IVA. Revisa Validar tarifas PDF.`);
      return { station: station.name, ...input.metadata(station.name), ...price, labels: [...input.labels(station.name)] };
    });
    const hvo = input.includeHvo(tariff.name) ? input.hvo : null;
    if (input.includeHvo(tariff.name) && (!hvo || hvo.date !== input.pricingDate || ![hvo.alfajarin.sinIva, hvo.alfajarin.conIva, hvo.valdemoro.sinIva, hvo.valdemoro.conIva].every(Number.isFinite))) {
      throw new Error(`${tariff.name}: los precios HVO de Postes no están disponibles para la fecha de trabajo.`);
    }
    return { tariff: tariff.name, filename: clientPdfFilename(tariff.name, index, input.names, input.validFrom), validFrom: input.validFrom,
      rows, hvo: hvo ? { alfajarin: { ...hvo.alfajarin }, valdemoro: { ...hvo.valdemoro } } : null };
  });
}
