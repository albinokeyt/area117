import { PdfSourceConfig, PricePair, SabanaPrices, pdfStationSource, publishedStationPrice, stationKey } from './publishedPrices';

export interface SourceDetails { sinFormula?: string; conFormula?: string; issues: string[] }
export interface SabanaValidationSnapshot extends SabanaPrices {
  details: Record<string, Record<string, SourceDetails>>;
  formulaIssues: { cell: string; message: string }[];
}

// Only the mounted client-side Sábana registers a reader. Captures are computed on
// demand from its live table model, independently of the PDF publication in storage.
let reader: (() => SabanaValidationSnapshot | null) | null = null;
export function registerSabanaValidationReader(next: NonNullable<typeof reader>) {
  reader = next;
  return () => { if (reader === next) reader = null; };
}
export function captureSabanaForValidation() { return reader?.() ?? null; }

export interface PdfValidationRow {
  tariff: string; station: string; active: boolean;
  source: string | null; sourceLabel: string;
  pdf: PricePair | null; expected: PricePair | null;
  status: 'ok' | 'difference' | 'review'; messages: string[];
  sinFormula?: string; conFormula?: string;
}
export interface PdfValidationReport {
  date: string; checkedAt: string; tariffCount: number; stationCount: number;
  rows: PdfValidationRow[]; formulaIssues: SabanaValidationSnapshot['formulaIssues'];
  stale: boolean;
}
export const sameDisplayedPrice = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && a.toFixed(3) === b.toFixed(3);

export function validatePdfPrices(input: {
  date: string; tariffs: { name: string }[]; stations: { name: string }[];
  mapping: Record<string, PdfSourceConfig>; published: SabanaPrices | null;
  live: SabanaValidationSnapshot | null;
  isActive: (tariff: string, station: string) => boolean;
}): PdfValidationReport {
  const { date, tariffs, stations, mapping, published, live, isActive } = input;
  const names = new Map<string, string>();
  Object.entries(live?.tariffs || {}).forEach(([name, source]) => { if (!names.has(source)) names.set(source, /^\d+$/.test(name) ? `TARIFA ${name}` : name); });
  const rows: PdfValidationRow[] = [];
  for (const tariff of tariffs) for (const station of stations) {
    const source = pdfStationSource(tariff.name, station.name, mapping, live);
    const pdfSource = pdfStationSource(tariff.name, station.name, mapping, published);
    const expected = publishedStationPrice(live, date, source, station.name);
    const pdf = publishedStationPrice(published, date, pdfSource, station.name);
    const sourceDetails = source ? live?.details[source] : undefined;
    const details = sourceDetails?.[station.name] || Object.entries(sourceDetails || {}).find(([name]) => stationKey(name) === stationKey(station.name))?.[1];
    const messages: string[] = [];
    let status: PdfValidationRow['status'] = 'ok';
    if (!live || live.date !== date) messages.push('Sábana no está disponible para la fecha de trabajo.');
    else if (!source) messages.push('Esta tarifa no tiene un origen configurado.');
    else if (!live.sources[source]) messages.push(`El origen ${source} no existe en Sábana ni en las reglas de Compras.`);
    else if (!expected) messages.push('Falta un precio válido sin IVA o con IVA para esta estación en el origen.');
    if (!published || published.date !== date) messages.push('Los datos del PDF no están actualizados para la fecha de trabajo.');
    else if (!pdf) messages.push('El PDF no dispone de ambos precios para esta estación.');
    if (details?.issues.length) messages.push(...details.issues);
    if (messages.length) status = 'review';
    if (source !== pdfSource) {
      messages.push(`Origen del PDF: ${pdfSource || 'ninguno'}; origen esperado: ${source || 'ninguno'}.`);
      if (status === 'ok') status = 'difference';
    }
    if (pdf && expected) for (const field of ['sinIva', 'conIva'] as const) {
      if (!sameDisplayedPrice(pdf[field], expected[field])) {
        messages.push(`El precio ${field === 'sinIva' ? 'sin IVA' : 'con IVA'} del PDF difiere del origen.`);
        if (status === 'ok') status = 'difference';
      }
    }
    rows.push({ tariff: tariff.name, station: station.name, active: isActive(tariff.name, station.name), source,
      sourceLabel: source ? names.get(source) || source : 'Sin origen', pdf, expected, status, messages,
      sinFormula: details?.sinFormula, conFormula: details?.conFormula });
  }
  return { date, checkedAt: new Date().toISOString(), tariffCount: tariffs.length, stationCount: stations.length,
    rows, formulaIssues: live?.formulaIssues || [], stale: false };
}
