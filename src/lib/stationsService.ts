/**
 * Servicio Central de Catálogo Dinámico de Estaciones de Servicio
 * Permite Crear, Modificar y Eliminar estaciones con propagación en cascada en todo el programa:
 * - Compras (Comp1PurchaseManager)
 * - Sábana de Precios (SabanaPreciosManager)
 * - Postes (PostesManager)
 * - EFI Export (Comp2EfiExporter & excelExportService)
 * - PDFs y Clientes (PdfGeneratorManager)
 */

import {
  PROPIAS_STATIONS as SEED_PROPIAS,
  COLABORADORA_STATIONS as SEED_COLABORADORAS,
  STATION_EXCEL_COSTS as SEED_COSTS,
  OFFICIAL_SUGGESTED_SALE_PRICES as SEED_SUGGESTED_PRICES,
  StationSeed,
  StationExcelData,
} from './dataSeed';

export interface PostesStationDef {
  name: string;
  defaultGoa: string;
  defaultGasolina: string;
  defaultGain: string;
  hasGasolina?: boolean;
}

export interface ImportStationDef {
  id: number;
  name: string;
  isZero: boolean;
}

export interface StationsCatalog {
  version: number;
  propias: StationSeed[];
  colaboradoras: StationSeed[];
  costs: Record<string, StationExcelData>;
  suggestedPrices: Record<string, number>;
  postesStations: PostesStationDef[];
  importStations: ImportStationDef[];
  adblueConfig: Record<string, { defaultBuy: number; defaultSale: number }>;
}

const STORAGE_KEY = 'efi_stations_catalog_v1';

// Catálogo inicial semilla
const INITIAL_POSTES: PostesStationDef[] = [
  { name: 'ARCOS', defaultGoa: '1.779', defaultGasolina: '', defaultGain: '', hasGasolina: false },
  { name: 'ALCUBILLAS', defaultGoa: '1.799', defaultGasolina: '1.799', defaultGain: '0.271', hasGasolina: true },
  { name: 'ALFAJARIN', defaultGoa: '1.799', defaultGasolina: '1.799', defaultGain: '0.271', hasGasolina: true },
  { name: 'TORREMOCHA', defaultGoa: '1.799', defaultGasolina: '1.799', defaultGain: '0.272', hasGasolina: true },
  { name: 'UCLES', defaultGoa: '1.799', defaultGasolina: '1.799', defaultGain: '0.284', hasGasolina: true },
  { name: 'VALLECAS', defaultGoa: '1.709', defaultGasolina: '1.739', defaultGain: '0.212', hasGasolina: true },
  { name: 'GANESHA MADRID', defaultGoa: '1.699', defaultGasolina: '1.739', defaultGain: '0.212', hasGasolina: true },
  { name: 'GANESHA TORREJON', defaultGoa: '1.699', defaultGasolina: '1.739', defaultGain: '0.212', hasGasolina: true },
  { name: 'VALDEMORO', defaultGoa: '1.659', defaultGasolina: '1.649', defaultGain: '0.122', hasGasolina: true },
  { name: 'BENAMEJI', defaultGoa: '1.839', defaultGasolina: '1.799', defaultGain: '0.274', hasGasolina: true },
  { name: 'HUMILLADERO', defaultGoa: '1.839', defaultGasolina: '1.799', defaultGain: '0.274', hasGasolina: true },
  { name: 'ES RIBA-ROJA', defaultGoa: '1.659', defaultGasolina: '1.689', defaultGain: '0.340', hasGasolina: true },
  { name: 'ES PISTA DE SILLA', defaultGoa: '1.659', defaultGasolina: '1.689', defaultGain: '0.340', hasGasolina: true },
  { name: 'ES REAL DE GANDIA', defaultGoa: '1.680', defaultGasolina: '1.689', defaultGain: '0.340', hasGasolina: true },
];

const INITIAL_IMPORT_STATIONS: ImportStationDef[] = [
  { id: 73, name: 'TORREJON', isZero: false },
  { id: 19, name: 'ARCOS JALON', isZero: false },
  { id: 26, name: 'ALFAJARIN', isZero: false },
  { id: 1, name: 'TORREMOCHA', isZero: false },
  { id: 2, name: 'MADRID', isZero: false },
  { id: 55, name: 'VALLECAS', isZero: false },
  { id: 96, name: 'ES VALDEMORO', isZero: false },
  { id: 9, name: 'PAMPLONA', isZero: false },
  { id: 10, name: 'PAMPLONA', isZero: false },
  { id: 74, name: 'HUMILLADERO', isZero: false },
  { id: 75, name: 'HUMILLADERO', isZero: false },
  { id: 27, name: 'UCLES', isZero: false },
  { id: 72, name: 'BENAMEJI', isZero: false },
  { id: 76, name: 'SORIA ALCUBILLAS', isZero: false },
  { id: 83, name: 'ES RIBA-ROJA', isZero: false },
  { id: 84, name: 'ES PISTA DE SILLA', isZero: false },
  { id: 85, name: 'ES REAL DE GANDIA', isZero: false },
  { id: 87, name: 'ES CHIVA', isZero: false },
  { id: 88, name: 'ES ALBERIC', isZero: false },
  { id: 18, name: 'ABRERA', isZero: false },
  { id: 70, name: 'VALDEHERRERA', isZero: false },
  { id: 23, name: 'EL CASAR', isZero: false },
  { id: 66, name: 'MONTE REAL', isZero: true },
  { id: 8, name: 'LA JOYOSA', isZero: false },
  { id: 82, name: 'JUNDIZ NORPETROL', isZero: false },
  { id: 16, name: 'OLIVERAL', isZero: false },
  { id: 14, name: 'Z.FRANCA', isZero: true },
  { id: 5, name: 'GUARROMAN', isZero: false },
  { id: 41, name: 'VALDEPEÑAS', isZero: false },
  { id: 64, name: 'OPEN', isZero: false },
  { id: 44, name: 'TJOIL SEVILLA', isZero: false },
  { id: 33, name: 'BENAVENTE', isZero: false },
  { id: 34, name: 'IRUN ZAISA III', isZero: false },
  { id: 91, name: 'TARRAGONA ', isZero: false },
  { id: 53, name: 'VILAMALLA', isZero: false },
  { id: 45, name: 'LACHAR', isZero: false },
  { id: 47, name: 'LA CAMPANA', isZero: false },
  { id: 56, name: 'AVILESINA', isZero: false },
  { id: 61, name: 'GOR', isZero: false },
  { id: 60, name: 'LLERS', isZero: false },
  { id: 65, name: 'DARRO - A92', isZero: false },
  { id: 68, name: 'MERIDA', isZero: false },
  { id: 67, name: 'SANCTI-SPIRITUS', isZero: false },
  { id: 77, name: 'MURCIA', isZero: false },
  { id: 78, name: 'NORIOIL', isZero: false },
  { id: 80, name: 'SAN VICENTE DEL PALACIO', isZero: false },
  { id: 81, name: 'WATERY ARANDA', isZero: false },
  { id: 79, name: 'BERA ', isZero: false },
  { id: 71, name: 'PUERTO DE BARCELONA', isZero: false },
  { id: 86, name: 'GIRONA-CALSINA', isZero: false },
  { id: 89, name: 'CATARROJA', isZero: false },
  { id: 90, name: 'MANISES - EXOIL', isZero: false },
  { id: 93, name: 'FEGOBLAN PONTEVEDRA', isZero: false },
  { id: 94, name: 'VEGA DE VALCARCE', isZero: false },
  { id: 95, name: 'HOILA TOLEDO', isZero: false },
  { id: 97, name: 'PETREM TRUCKS FIGUERES', isZero: false },
];

const INITIAL_ADBLUE: Record<string, { defaultBuy: number; defaultSale: number }> = {
  'TORREJON': { defaultBuy: 0.5360, defaultSale: 0.8490 },
  'ARCOS JALON': { defaultBuy: 0.2650, defaultSale: 0.7490 },
  'ALFAJARIN': { defaultBuy: 0.4000, defaultSale: 0.8490 },
  'TORREMOCHA': { defaultBuy: 0.2650, defaultSale: 0.7490 },
  'MADRID': { defaultBuy: 0.5360, defaultSale: 0.8490 },
  'VALLECAS': { defaultBuy: 0.6190, defaultSale: 0.8490 },
  'HUMILLADERO': { defaultBuy: 0.5770, defaultSale: 0.7900 },
  'UCLES': { defaultBuy: 0.3000, defaultSale: 0.7990 },
  'BENAMEJI': { defaultBuy: 0.5360, defaultSale: 0.7990 },
  'SORIA ALCUBILLAS': { defaultBuy: 0.2550, defaultSale: 0.8490 },
};

export function getDefaultStationsCatalog(): StationsCatalog {
  return {
    version: 1,
    propias: JSON.parse(JSON.stringify(SEED_PROPIAS)),
    colaboradoras: JSON.parse(JSON.stringify(SEED_COLABORADORAS)),
    costs: JSON.parse(JSON.stringify(SEED_COSTS)),
    suggestedPrices: JSON.parse(JSON.stringify(SEED_SUGGESTED_PRICES)),
    postesStations: JSON.parse(JSON.stringify(INITIAL_POSTES)),
    importStations: JSON.parse(JSON.stringify(INITIAL_IMPORT_STATIONS)),
    adblueConfig: JSON.parse(JSON.stringify(INITIAL_ADBLUE)),
  };
}

/**
 * Carga el catálogo actual de estaciones (o el por defecto si no existe)
 */
export function getStationsCatalog(): StationsCatalog {
  if (typeof window === 'undefined') {
    return getDefaultStationsCatalog();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.propias) && Array.isArray(parsed.colaboradoras)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error al cargar catálogo de estaciones:', e);
  }

  const def = getDefaultStationsCatalog();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
  } catch (e) {}
  return def;
}

/**
 * Guarda el catálogo y dispara la actualización reactiva en todos los módulos
 */
export function saveStationsCatalog(catalog: StationsCatalog) {
  if (typeof window === 'undefined') return;

  try {
    catalog.version = (catalog.version || 1) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));

    // Despachar eventos de actualización en cascada
    window.dispatchEvent(new Event('efi_stations_updated'));
    window.dispatchEvent(new Event('efi_compras_updated'));
    window.dispatchEvent(new Event('efi_sabana_updated'));
    window.dispatchEvent(new Event('efi_postes_updated'));
    window.dispatchEvent(new Event('efi_export_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Error al guardar catálogo de estaciones:', e);
  }
}

/**
 * Obtiene la lista actual de estaciones propias
 */
export function getPropiasStations(): StationSeed[] {
  return getStationsCatalog().propias;
}

/**
 * Obtiene la lista actual de estaciones colaboradoras
 */
export function getColaboradoraStations(): StationSeed[] {
  return getStationsCatalog().colaboradoras;
}

/**
 * Obtiene la lista de todas las estaciones combinadas
 */
export function getAllStations(): StationSeed[] {
  const cat = getStationsCatalog();
  return [...cat.propias, ...cat.colaboradoras];
}

/**
 * Obtiene el mapa de costes de estaciones
 */
export function getStationExcelCosts(): Record<string, StationExcelData> {
  return getStationsCatalog().costs;
}

/**
 * Obtiene el mapa de precios de venta sugeridos
 */
export function getOfficialSuggestedSalePrices(): Record<string, number> {
  return getStationsCatalog().suggestedPrices;
}

/**
 * Obtiene la lista de estaciones para Postes
 */
export function getPostesStations(): PostesStationDef[] {
  return getStationsCatalog().postesStations;
}

/**
 * Obtiene la lista de estaciones para el archivo de exportación EFI
 */
export function getImportStations(): ImportStationDef[] {
  return getStationsCatalog().importStations;
}

/**
 * Obtiene la configuración de estaciones con AdBlue
 */
export function getAdblueStationsConfig(): Record<string, { defaultBuy: number; defaultSale: number }> {
  return getStationsCatalog().adblueConfig;
}

/**
 * Parámetros para dar de alta una nueva estación
 */
export interface CreateStationParams {
  name: string;
  type: 'PROPIA' | 'COLABORADORA';
  isFixedColaboradora?: boolean;
  clhName?: string;
  porte?: number;
  pase?: number;
  fin?: number;
  defaultPrev?: number;
  defaultCurr?: number;
  suggestedSalePrice?: number;
  initialBuyPrice?: number;
  // Opciones adicionales
  isPoste?: boolean;
  hasGasolina?: boolean;
  defaultGoaPoste?: string;
  defaultGasolinaPoste?: string;
  defaultGainPoste?: string;
  hasAdblue?: boolean;
  adblueBuyPrice?: number;
  adblueSalePrice?: number;
  importId?: number;
}

/**
 * Da de alta una nueva estación y la propaga en cascada en todo el programa
 */
export function createStation(params: CreateStationParams): { success: boolean; message: string } {
  const cleanName = params.name.trim().toUpperCase();
  if (!cleanName) {
    return { success: false, message: 'El nombre de la estación no puede estar vacío.' };
  }

  const catalog = getStationsCatalog();
  const allCurrent = [...catalog.propias, ...catalog.colaboradoras];
  if (allCurrent.some((s) => s.name.toUpperCase() === cleanName)) {
    return { success: false, message: `Ya existe una estación con el nombre "${cleanName}".` };
  }

  const nextOrder = allCurrent.length + 1;
  const newStationSeed: StationSeed = {
    name: cleanName,
    type: params.type,
    isFixedColaboradora: params.type === 'COLABORADORA' ? Boolean(params.isFixedColaboradora) : false,
    order: nextOrder,
  };

  if (params.type === 'PROPIA') {
    catalog.propias.push(newStationSeed);
  } else {
    catalog.colaboradoras.push(newStationSeed);
  }

  // Costes logísticos
  const porte = params.porte !== undefined ? params.porte : 0.0050;
  const pase = params.pase !== undefined ? params.pase : 0.0100;
  const fin = params.fin !== undefined ? params.fin : 0.0100;
  const defaultPrev = params.defaultPrev !== undefined ? params.defaultPrev : 1.2000;
  const defaultCurr = params.defaultCurr !== undefined ? params.defaultCurr : 1.2000;
  const clhName = params.clhName ? params.clhName.trim().toUpperCase() : 'TORREJON';

  catalog.costs[cleanName] = {
    type: params.type,
    clhName,
    porte,
    pase,
    fin,
    defaultPrev,
    defaultCurr,
  };

  // Precio de venta sugerido
  catalog.suggestedPrices[cleanName] = params.suggestedSalePrice !== undefined && params.suggestedSalePrice > 0
    ? params.suggestedSalePrice
    : Number((defaultCurr + porte + pase + fin + 0.08).toFixed(4));

  // Postes (si se marca o es propia por defecto)
  const shouldAddPoste = params.isPoste ?? (params.type === 'PROPIA');
  if (shouldAddPoste) {
    if (!catalog.postesStations.some((p) => p.name.toUpperCase() === cleanName)) {
      catalog.postesStations.push({
        name: cleanName,
        defaultGoa: params.defaultGoaPoste || '1.749',
        defaultGasolina: params.defaultGasolinaPoste || (params.hasGasolina ? '1.749' : ''),
        defaultGain: params.defaultGainPoste || '0.250',
        hasGasolina: params.hasGasolina ?? true,
      });
    }
  }

  // EFI Import ID
  let nextImportId = params.importId;
  if (!nextImportId) {
    const existingIds = catalog.importStations.map((s) => s.id);
    nextImportId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 101;
  }
  catalog.importStations.push({
    id: nextImportId,
    name: cleanName,
    isZero: false,
  });

  // AdBlue
  if (params.hasAdblue) {
    catalog.adblueConfig[cleanName] = {
      defaultBuy: params.adblueBuyPrice || 0.4000,
      defaultSale: params.adblueSalePrice || 0.7990,
    };
  }

  // Cascada: Inicializar compra para la fecha actual en localStorage si existe compras
  try {
    const buyPrice = params.initialBuyPrice !== undefined && params.initialBuyPrice > 0 ? params.initialBuyPrice : defaultCurr;
    const today = new Date().toISOString().split('T')[0];
    const sKey = 'efi_purchases_' + today;
    const raw = localStorage.getItem(sKey) || localStorage.getItem('efi_compras_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      const data = parsed.data || parsed;
      const initialEntry = {
        buyPrice: buyPrice,
        manualTotalCost: 0,
        manualMargin: 0,
        manualSalePrice: catalog.suggestedPrices[cleanName],
        prevBuyPrice: defaultPrev,
        prevSalePrice: catalog.suggestedPrices[cleanName],
      };
      data[`${cleanName}_GOA`] = { ...initialEntry };
      data[`${cleanName}_GASOLINA`] = {
        ...initialEntry,
        buyPrice: Number((buyPrice + 0.12).toFixed(4)),
        manualSalePrice: Number((catalog.suggestedPrices[cleanName] + 0.15).toFixed(4)),
      };
      if (params.hasAdblue) {
        data[`${cleanName}_ADBLUE`] = {
          buyPrice: params.adblueBuyPrice || 0.4000,
          manualTotalCost: 0,
          manualMargin: 0,
          manualSalePrice: params.adblueSalePrice || 0.7990,
          prevBuyPrice: params.adblueBuyPrice || 0.4000,
          prevSalePrice: params.adblueSalePrice || 0.7990,
        };
      }
      localStorage.setItem(sKey, JSON.stringify({ validFrom: today, data }));
      localStorage.setItem('efi_compras_data', JSON.stringify({ validFrom: today, data }));
    }
  } catch (e) {
    console.warn('No se pudo inicializar compra previa para la nueva estación:', e);
  }

  saveStationsCatalog(catalog);
  return { success: true, message: `Estación "${cleanName}" creada exitosamente.` };
}

/**
 * Modifica una estación existente y propaga los cambios
 */
export function updateStation(
  oldName: string,
  updatedData: Partial<CreateStationParams>
): { success: boolean; message: string } {
  const cleanOld = oldName.trim().toUpperCase();
  const catalog = getStationsCatalog();

  const isPropia = catalog.propias.some((s) => s.name.toUpperCase() === cleanOld);
  const isColab = catalog.colaboradoras.some((s) => s.name.toUpperCase() === cleanOld);

  if (!isPropia && !isColab) {
    return { success: false, message: `No se encontró la estación "${cleanOld}".` };
  }

  const cleanNew = updatedData.name ? updatedData.name.trim().toUpperCase() : cleanOld;
  const isRenaming = cleanNew !== cleanOld;

  if (isRenaming) {
    const allCurrent = [...catalog.propias, ...catalog.colaboradoras];
    if (allCurrent.some((s) => s.name.toUpperCase() === cleanNew)) {
      return { success: false, message: `Ya existe otra estación con el nombre "${cleanNew}".` };
    }
  }

  // 1. Actualizar lista de propias o colaboradoras
  const targetType = updatedData.type || (isPropia ? 'PROPIA' : 'COLABORADORA');

  // Remover de su lista original
  catalog.propias = catalog.propias.filter((s) => s.name.toUpperCase() !== cleanOld);
  catalog.colaboradoras = catalog.colaboradoras.filter((s) => s.name.toUpperCase() !== cleanOld);

  const updatedSeed: StationSeed = {
    name: cleanNew,
    type: targetType,
    isFixedColaboradora: targetType === 'COLABORADORA' ? Boolean(updatedData.isFixedColaboradora) : false,
    order: 99,
  };

  if (targetType === 'PROPIA') {
    catalog.propias.push(updatedSeed);
  } else {
    catalog.colaboradoras.push(updatedSeed);
  }

  // 2. Actualizar costes
  const existingCost = catalog.costs[cleanOld] || {
    type: targetType,
    clhName: 'TORREJON',
    porte: 0.0050,
    pase: 0.0100,
    fin: 0.0100,
    defaultPrev: 1.2000,
    defaultCurr: 1.2000,
  };

  if (isRenaming) {
    delete catalog.costs[cleanOld];
  }

  catalog.costs[cleanNew] = {
    ...existingCost,
    type: targetType,
    clhName: updatedData.clhName !== undefined ? updatedData.clhName.trim().toUpperCase() : existingCost.clhName,
    porte: updatedData.porte !== undefined ? updatedData.porte : existingCost.porte,
    pase: updatedData.pase !== undefined ? updatedData.pase : existingCost.pase,
    fin: updatedData.fin !== undefined ? updatedData.fin : existingCost.fin,
    defaultPrev: updatedData.defaultPrev !== undefined ? updatedData.defaultPrev : existingCost.defaultPrev,
    defaultCurr: updatedData.defaultCurr !== undefined ? updatedData.defaultCurr : existingCost.defaultCurr,
  };

  // 3. Actualizar precio de venta sugerido
  const existingSuggested = catalog.suggestedPrices[cleanOld] || 1.3200;
  if (isRenaming) {
    delete catalog.suggestedPrices[cleanOld];
  }
  catalog.suggestedPrices[cleanNew] = updatedData.suggestedSalePrice !== undefined
    ? updatedData.suggestedSalePrice
    : existingSuggested;

  // 4. Actualizar Postes
  const posteIdx = catalog.postesStations.findIndex((p) => p.name.toUpperCase() === cleanOld);
  if (updatedData.isPoste === false) {
    if (posteIdx >= 0) catalog.postesStations.splice(posteIdx, 1);
  } else if (updatedData.isPoste === true || (updatedData.isPoste === undefined && posteIdx >= 0)) {
    if (posteIdx >= 0) {
      catalog.postesStations[posteIdx].name = cleanNew;
      if (updatedData.defaultGoaPoste) catalog.postesStations[posteIdx].defaultGoa = updatedData.defaultGoaPoste;
      if (updatedData.defaultGasolinaPoste) catalog.postesStations[posteIdx].defaultGasolina = updatedData.defaultGasolinaPoste;
      if (updatedData.defaultGainPoste) catalog.postesStations[posteIdx].defaultGain = updatedData.defaultGainPoste;
      if (updatedData.hasGasolina !== undefined) catalog.postesStations[posteIdx].hasGasolina = updatedData.hasGasolina;
    } else {
      catalog.postesStations.push({
        name: cleanNew,
        defaultGoa: updatedData.defaultGoaPoste || '1.749',
        defaultGasolina: updatedData.defaultGasolinaPoste || '',
        defaultGain: updatedData.defaultGainPoste || '0.250',
        hasGasolina: updatedData.hasGasolina ?? false,
      });
    }
  }

  // 5. Actualizar EFI Import
  const importIdx = catalog.importStations.findIndex((s) => s.name.toUpperCase() === cleanOld);
  if (importIdx >= 0) {
    catalog.importStations[importIdx].name = cleanNew;
    if (updatedData.importId) catalog.importStations[importIdx].id = updatedData.importId;
  } else {
    catalog.importStations.push({
      id: updatedData.importId || 101,
      name: cleanNew,
      isZero: false,
    });
  }

  // 6. Actualizar AdBlue
  if (updatedData.hasAdblue === false) {
    delete catalog.adblueConfig[cleanOld];
    delete catalog.adblueConfig[cleanNew];
  } else if (updatedData.hasAdblue === true) {
    delete catalog.adblueConfig[cleanOld];
    catalog.adblueConfig[cleanNew] = {
      defaultBuy: updatedData.adblueBuyPrice || 0.4000,
      defaultSale: updatedData.adblueSalePrice || 0.7990,
    };
  } else if (catalog.adblueConfig[cleanOld] && isRenaming) {
    catalog.adblueConfig[cleanNew] = catalog.adblueConfig[cleanOld];
    delete catalog.adblueConfig[cleanOld];
  }

  // 7. Cascada de renombramiento en localStorage
  if (isRenaming) {
    try {
      // Renombrar en compras
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('efi_purchases_') || k === 'efi_compras_data')) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              const data = parsed.data || parsed;
              ['GOA', 'GASOLINA', 'ADBLUE'].forEach((prod) => {
                const oldKey = `${cleanOld}_${prod}`;
                const newKey = `${cleanNew}_${prod}`;
                if (data[oldKey] !== undefined) {
                  data[newKey] = data[oldKey];
                  delete data[oldKey];
                }
              });
              localStorage.setItem(k, JSON.stringify(parsed));
            }
          } catch (e) {}
        }
      }

      // Renombrar en postes
      const rawPostes = localStorage.getItem('efi_postes_data_v2');
      if (rawPostes) {
        const parsed = JSON.parse(rawPostes);
        if (parsed.postes && parsed.postes[cleanOld]) {
          parsed.postes[cleanNew] = parsed.postes[cleanOld];
          delete parsed.postes[cleanOld];
          localStorage.setItem('efi_postes_data_v2', JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('Error en la cascada de renombrado local:', e);
    }
  }

  saveStationsCatalog(catalog);
  return { success: true, message: `Estación "${cleanNew}" actualizada exitosamente.` };
}

/**
 * Elimina una estación y realiza la limpieza en cascada en todo el programa
 */
export function deleteStation(stationName: string): { success: boolean; message: string } {
  const cleanName = stationName.trim().toUpperCase();
  const catalog = getStationsCatalog();

  const totalBefore = catalog.propias.length + catalog.colaboradoras.length;
  catalog.propias = catalog.propias.filter((s) => s.name.toUpperCase() !== cleanName);
  catalog.colaboradoras = catalog.colaboradoras.filter((s) => s.name.toUpperCase() !== cleanName);

  if (catalog.propias.length + catalog.colaboradoras.length === totalBefore) {
    return { success: false, message: `No se encontró la estación "${cleanName}".` };
  }

  // Eliminar de costes y sugeridos
  delete catalog.costs[cleanName];
  delete catalog.suggestedPrices[cleanName];
  delete catalog.adblueConfig[cleanName];

  // Eliminar de postes e import
  catalog.postesStations = catalog.postesStations.filter((p) => p.name.toUpperCase() !== cleanName);
  catalog.importStations = catalog.importStations.filter((i) => i.name.toUpperCase() !== cleanName);

  // Cascada de eliminación en todo el almacenamiento local
  try {
    // 1. Limpiar compras (efi_purchases_* y efi_compras_data)
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('efi_purchases_') || k === 'efi_compras_data')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            const data = parsed.data || parsed;
            ['GOA', 'GASOLINA', 'ADBLUE'].forEach((prod) => {
              delete data[`${cleanName}_${prod}`];
            });
            localStorage.setItem(k, JSON.stringify(parsed));
          }
        } catch (e) {}
      }
    }

    // 2. Limpiar tarifas especiales de compras (efi_special_rates_*)
    ['efi_special_rates_b50_f82_v4', 'efi_special_rates_b50_f82_v3'].forEach((spKey) => {
      const rawSp = localStorage.getItem(spKey);
      if (rawSp) {
        try {
          const arr: any[] = JSON.parse(rawSp);
          const filtered = arr.filter((r) => !String(r.stationName || '').toUpperCase().includes(cleanName));
          localStorage.setItem(spKey, JSON.stringify(filtered));
        } catch (e) {}
      }
    });

    // 3. Limpiar postes (efi_postes_data_v2)
    const rawPostes = localStorage.getItem('efi_postes_data_v2');
    if (rawPostes) {
      try {
        const parsed = JSON.parse(rawPostes);
        if (parsed.postes) {
          delete parsed.postes[cleanName];
          localStorage.setItem('efi_postes_data_v2', JSON.stringify(parsed));
        }
      } catch (e) {}
    }

    // 4. Limpiar fórmulas personalizadas de sábana que apunten a esa estación
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sabana_custom_formulas_')) {
        try {
          const rawF = localStorage.getItem(k);
          if (rawF) {
            const formulas = JSON.parse(rawF);
            let changed = false;
            Object.keys(formulas).forEach((fKey) => {
              if (fKey.toUpperCase().includes(cleanName)) {
                delete formulas[fKey];
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem(k, JSON.stringify(formulas));
            }
          }
        } catch (e) {}
      }
    }

    // 5. Limpiar sobreescrituras en EFI export
    const rawEfiOver = localStorage.getItem('efi_export_custom_overrides_v1');
    if (rawEfiOver) {
      try {
        const overrides = JSON.parse(rawEfiOver);
        let changed = false;
        Object.keys(overrides).forEach((oKey) => {
          if (oKey.toUpperCase().includes(cleanName)) {
            delete overrides[oKey];
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem('efi_export_custom_overrides_v1', JSON.stringify(overrides));
        }
      } catch (e) {}
    }

    // 6. Limpiar orígenes personalizados de PDFs
    const rawPdf = localStorage.getItem('efi_pdf_custom_station_sources_v1');
    if (rawPdf) {
      try {
        const pdfSources = JSON.parse(rawPdf);
        let changed = false;
        Object.keys(pdfSources).forEach((pKey) => {
          if (pKey.toUpperCase().includes(cleanName)) {
            delete pdfSources[pKey];
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem('efi_pdf_custom_station_sources_v1', JSON.stringify(pdfSources));
        }
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Error en la cascada de eliminación:', e);
  }

  saveStationsCatalog(catalog);
  return { success: true, message: `Estación "${cleanName}" eliminada correctamente en todo el sistema.` };
}

/**
 * Restablece todas las estaciones al catálogo semilla por defecto
 */
export function resetStationsToDefault(): { success: boolean; message: string } {
  const def = getDefaultStationsCatalog();
  saveStationsCatalog(def);
  return { success: true, message: 'Catálogo de estaciones restablecido a los valores iniciales.' };
}
