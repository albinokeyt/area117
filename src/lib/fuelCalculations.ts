export interface PurchaseEntry {
  stationName: string;
  productCode: string;
  previousPurchasePrice: number;
  currentPurchasePrice: number;
  clh?: number;
  porte?: number;
  pase?: number;
  financiacion?: number;
  salePriceK?: number;
}

export interface PosteEntry {
  stationName: string;
  productCode: string;
  price: number;
  gasolinaMargin?: number;
}

export interface CalculatedPurchase extends PurchaseEntry {
  totalCost: number;
  salePrice: number;
  margin: number;
}

export interface CalculatedPoste extends PosteEntry {
  goaPremiumPrice: number; // GOA + 0.04
  gasolinaGain: number;
}

/**
 * Motor de cálculos principal que simula las fórmulas del Excel
 */
export function calculatePurchaseItem(entry: PurchaseEntry): CalculatedPurchase {
  const clh = entry.clh || 0;
  const porte = entry.porte || 0;
  const pase = entry.pase || 0;
  const financiacion = entry.financiacion || 0;
  
  // Costo total de adquisición
  const totalCost = entry.currentPurchasePrice + clh + porte + pase + financiacion;
  const salePrice = entry.salePriceK ?? (totalCost + 0.02); // Ejemplo de margen o valor de celda formulada K
  const margin = salePrice - totalCost;

  return {
    ...entry,
    totalCost,
    salePrice,
    margin,
  };
}

/**
 * Calcula precios de Poste y GOA Premium (GOA + 0.04€)
 */
export function calculatePosteItem(entry: PosteEntry): CalculatedPoste {
  // GOA Premium = GOA + 0.04
  const goaPremiumPrice = entry.productCode === 'GOA' ? Number((entry.price + 0.04).toFixed(4)) : entry.price;
  const gasolinaGain = entry.gasolinaMargin || 0;

  return {
    ...entry,
    goaPremiumPrice,
    gasolinaGain,
  };
}

/**
 * Cálculo con/sin IVA
 */
export function calculateVat(priceExclVat: number, vatRate: number = 0.21): { exclVat: number; inclVat: number } {
  const exclVat = Number(priceExclVat.toFixed(4));
  const inclVat = Number((exclVat * (1 + vatRate)).toFixed(4));
  return { exclVat, inclVat };
}

/**
 * Generador de filas para exportación EFI DATA OIL (hoja IMPORTACION)
 */
export interface EfiImportRow {
  codigoEstacion: string;
  nombreEstacion: string;
  producto: string;
  precioVentaSinIva: number;
  precioVentaConIva: number;
  fecha: string;
}

export function generateEfiImportRows(
  purchases: CalculatedPurchase[],
  postes: CalculatedPoste[],
  date: string
): EfiImportRow[] {
  const rows: EfiImportRow[] = [];

  for (const p of purchases) {
    const vat = calculateVat(p.salePrice);
    rows.push({
      codigoEstacion: p.stationName.toUpperCase().replace(/\s+/g, '_'),
      nombreEstacion: p.stationName,
      producto: p.productCode,
      precioVentaSinIva: vat.exclVat,
      precioVentaConIva: vat.inclVat,
      fecha: date,
    });
  }

  return rows;
}
