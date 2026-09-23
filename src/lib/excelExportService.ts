import * as XLSX from 'xlsx';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS, OFFICIAL_SUGGESTED_SALE_PRICES } from './dataSeed';
import {
  getPropiasStations,
  getColaboradoraStations,
  getAllStations,
  getStationExcelCosts,
  getImportStations,
} from './stationsService';
import { loadSabanaFormulas, reevaluateAllSabanaFormulas } from './sabanaFormulaEngine';

export interface PurchaseRowValues {
  prev: string;
  curr: string;
  clh: string;
  porte: string;
  pase: string;
  fin: string;
  prevSale?: string;
  sale: string;
  isCustomSale?: boolean;
}

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

const FIXED_COLLABORATOR_NAMES = [
  'BENAVENTE',
  'IRUN ZAISA III',
  'AVILESINA',
  'MERIDA',
  'SAN VICENTE DEL PALACIO',
  'WATERY ARANDA',
  'PUERTO DE BARCELONA',
  'GIRONA-CALSINA',
  'FEGOBLAN PONTEVEDRA',
  'VEGA DE VALCARCE',
  'HOILA TOLEDO',
  'PETREM FIGUERES',
];

const STANDARD_TARIFFS = [
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

const SPECIAL_TARIFFS = [
  { name: 'Especial Javi', markup: 0.116 },
  { name: 'Especial Carreras', markup: 0.116 },
  { name: 'Especial General C-0', markup: 0.116 },
  { name: 'Especial ROR', markup: 0.132 },
  { name: 'Especial Esteban', markup: 0.132 },
  { name: 'Tarifa 90 Miki', markup: 0.198 },
  { name: 'Tarifa ECOTRANS', markup: 0.158 },
  { name: 'Tarifa 30', markup: 0.138 },
  { name: 'Tarifa 27 Sur', markup: 0.127 },
  { name: 'Tarifa 15 Sur', markup: 0.115 },
];

const parseNum = (val: string | number | undefined): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = val.toString().replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const round3 = (num: number): number => {
  return Math.round(num * 1000) / 1000;
};

export interface GasolinaBroncoRow {
  name: string;
  sinIva: string;
  conIva: string;
  beneficio: string;
  compra: string;
  fecha: string;
}

export function generateAndDownloadCierreWorkbook(
  selectedDate: string,
  validFromDate: string,
  purchases: Record<string, PurchaseRowValues>,
  specialRates: SpecialStationRateRow[],
  bronco?: GasolinaBroncoRow
) {
  const wb = XLSX.utils.book_new();

  // 1. HOJA: CALCULO INICIAL
  const calculoRows: any[][] = [];
  calculoRows.push(['AREA 117 - CIERRE DIARIO Y CALCULO INICIAL DE COMPRAS']);
  calculoRows.push(['Fecha Emision:', selectedDate, 'Precios Validos A Partir De:', validFromDate]);
  calculoRows.push(['Aviso:', 'Cierre diario oficial consolidado para Compras, Postes, Sabana de Precios, PDFs y Clientes, EFI Export']);
  calculoRows.push([]);

  // Cuadro Especial: GASOLINA BRONCO (Filas 3-4 de Cálculo Inicial)
  const broncoData = bronco || {
    name: 'GASOLINA BRONCO',
    sinIva: '1.397',
    conIva: '1.690',
    beneficio: '0.034',
    compra: '1.348',
    fecha: '04/09/2026',
  };

  calculoRows.push(['CUADRO ESPECIAL: GASOLINA BRONCO']);
  calculoRows.push(['PRODUCTO', 'SIN IVA (EUR)', 'CON IVA (EUR)', 'BENEFICIO (EUR)', 'COMPRA (EUR)', 'FECHA']);
  calculoRows.push([
    broncoData.name,
    parseNum(broncoData.sinIva),
    parseNum(broncoData.conIva),
    parseNum(broncoData.beneficio),
    parseNum(broncoData.compra),
    broncoData.fecha,
  ]);
  calculoRows.push([]);

  calculoRows.push([
    'ESTACION',
    'TIPO',
    'PRODUCTO',
    'P. ANT. COMPRA (EUR)',
    'PRECIO COMPRA HOY (EUR)',
    'CLH (TERMINAL)',
    'PORTE (R)',
    'PASE (S)',
    'FINANCIACION (T)',
    'COSTO TOTAL (EUR)',
    'P. VENTA ANT. (EUR)',
    'P. VENTA SUGERIDO (EUR)',
    'MARGEN (EUR)',
  ]);

  const appendStationPurchases = (stations: { name: string; type: string }[], sectionTitle: string) => {
    calculoRows.push([`--- ${sectionTitle} ---`]);
    stations.forEach((st) => {
      const prods = [
        { code: 'GOA', name: 'Gasoleo A (GOA)' },
        { code: 'GASOLINA', name: 'Gasolina 95' },
      ];
      if (purchases[`${st.name}_ADBLUE`]) {
        prods.push({ code: 'ADBLUE', name: 'AdBlue' });
      }

      prods.forEach((prod) => {
        const key = `${st.name}_${prod.code}`;
        const item = purchases[key] || {
          prev: '0.000', curr: '0.000', clh: 'TORREJON', porte: '0.000', pase: '0.000', fin: '0.000', sale: '0.000', prevSale: '0.000'
        };
        const currNum = parseNum(item.curr);
        const porteNum = parseNum(item.porte);
        const paseNum = parseNum(item.pase);
        const finNum = parseNum(item.fin);
        const totalCost = round3(currNum + porteNum + paseNum + finNum);
        const effectiveSale = item.isCustomSale && item.sale ? parseNum(item.sale) : totalCost;
        const prevSale = item.prevSale ? parseNum(item.prevSale) : effectiveSale;
        const margin = round3(effectiveSale - totalCost);
        const clhName = STATION_EXCEL_COSTS[st.name]?.clhName || item.clh || 'TORREJON';

        calculoRows.push([
          st.name,
          st.type,
          prod.name,
          parseNum(item.prev),
          currNum,
          clhName,
          porteNum,
          paseNum,
          finNum,
          totalCost,
          prevSale,
          effectiveSale,
          margin,
        ]);
      });
    });
  };

  appendStationPurchases(PROPIAS_STATIONS, '1. ESTACIONES PROPIAS');

  const fixedCollaborators = FIXED_COLLABORATOR_NAMES
    .map(name => COLABORADORA_STATIONS.find(st => st.name.toUpperCase() === name.toUpperCase() || st.name.toUpperCase().includes(name.toUpperCase())))
    .filter(Boolean) as typeof COLABORADORA_STATIONS;
  appendStationPurchases(fixedCollaborators, '2. ESTACIONES COLABORADORAS FIJAS');

  const remainingCollaborators = COLABORADORA_STATIONS.filter(
    st => !FIXED_COLLABORATOR_NAMES.some(fname => st.name.toUpperCase().includes(fname.toUpperCase()))
  );
  appendStationPurchases(remainingCollaborators, '3. ESTACIONES COLABORADORAS RESTANTES');

  const wsCalculo = XLSX.utils.aoa_to_sheet(calculoRows);
  XLSX.utils.book_append_sheet(wb, wsCalculo, 'CALCULO INICIAL');

  // 2. HOJA: SABANA DE PRECIOS
  const sabanaRows: any[][] = [];
  sabanaRows.push(['SABANA DE PRECIOS Y TARIFAS - AREA 117']);
  sabanaRows.push(['Fecha Emision:', selectedDate, 'Valido A Partir De:', validFromDate]);
  sabanaRows.push([]);

  const sabanaHeader = ['ESTACION', 'TIPO', 'BASE GOA (EUR)'];
  STANDARD_TARIFFS.forEach((t) => {
    sabanaHeader.push(`TARIFA ${t.id} SIN IVA`);
    sabanaHeader.push(`TARIFA ${t.id} CON IVA`);
  });
  SPECIAL_TARIFFS.forEach((st) => {
    sabanaHeader.push(`${st.name} SIN IVA`);
    sabanaHeader.push(`${st.name} CON IVA`);
  });
  sabanaRows.push(sabanaHeader);

  const appendSabanaRows = (stations: { name: string; type: string }[]) => {
    stations.forEach((st) => {
      const key = `${st.name}_GOA`;
      const item = purchases[key];
      let baseGoa = 0;
      if (item) {
        if (item.isCustomSale && item.sale) {
          baseGoa = parseNum(item.sale);
        } else {
          baseGoa = round3(parseNum(item.curr) + parseNum(item.porte) + parseNum(item.pase) + parseNum(item.fin));
        }
      }
      if (baseGoa === 0 && STATION_EXCEL_COSTS[st.name]) {
        const c = STATION_EXCEL_COSTS[st.name];
        baseGoa = round3(c.defaultCurr + c.porte + c.pase + c.fin);
      }

      const row: any[] = [st.name, st.type, baseGoa];
      STANDARD_TARIFFS.forEach((t) => {
        const sinIva = round3(baseGoa + t.markup);
        const conIva = round3(sinIva * 1.21);
        row.push(sinIva, conIva);
      });
      SPECIAL_TARIFFS.forEach((stTariff) => {
        const sinIva = round3(baseGoa + stTariff.markup);
        const conIva = round3(sinIva * 1.21);
        row.push(sinIva, conIva);
      });
      sabanaRows.push(row);
    });
  };

  sabanaRows.push(['--- PROPIAS ---']);
  appendSabanaRows(PROPIAS_STATIONS);
  sabanaRows.push(['--- COLABORADORAS ---']);
  appendSabanaRows(COLABORADORA_STATIONS);

  const wsSabana = XLSX.utils.aoa_to_sheet(sabanaRows);
  XLSX.utils.book_append_sheet(wb, wsSabana, 'SABANA DE PRECIOS');

  // 3. HOJA: POSTES
  const postesRows: any[][] = [];
  postesRows.push(['POSTES DE COMBUSTIBLE - AREA 117']);
  postesRows.push(['Fecha Emision:', selectedDate, 'Valido A Partir De:', validFromDate]);
  postesRows.push([]);

  let postesData: any = null;
  if (typeof window !== 'undefined') {
    try {
      const s = localStorage.getItem('efi_postes_data_v2');
      if (s) postesData = JSON.parse(s);
    } catch (e) {}
  }

  postesRows.push(['1. POSTES ESTACIONES PROPIAS']);
  postesRows.push([
    'ESTACION',
    'PRECIO COMPRA GOA (EUR)',
    'COSTO TOTAL GOA (EUR)',
    'POSTE GOA (EUR)',
    'MARGEN GOA (EUR)',
    'PRECIO COMPRA GASOLINA (EUR)',
    'COSTO TOTAL GASOLINA (EUR)',
    'POSTE GASOLINA (EUR)',
    'MARGEN GASOLINA (EUR)',
  ]);

  const POSTES_PROPIAS_DEF = [
    { name: 'ARCOS', defaultGoa: 1.779, defaultGasolina: 0, gain: 0, hasGas: false },
    { name: 'ALCUBILLAS', defaultGoa: 1.799, defaultGasolina: 1.799, gain: 0.271, hasGas: true },
    { name: 'ALFAJARIN', defaultGoa: 1.799, defaultGasolina: 1.799, gain: 0.271, hasGas: true },
    { name: 'TORREMOCHA', defaultGoa: 1.799, defaultGasolina: 1.799, gain: 0.272, hasGas: true },
    { name: 'UCLES', defaultGoa: 1.799, defaultGasolina: 1.799, gain: 0.284, hasGas: true },
    { name: 'VALLECAS', defaultGoa: 1.699, defaultGasolina: 1.739, gain: 0.212, hasGas: true },
    { name: 'GANESHA MADRID', defaultGoa: 1.749, defaultGasolina: 1.739, gain: 0.212, hasGas: true },
    { name: 'GANESHA TORREJON', defaultGoa: 1.749, defaultGasolina: 1.739, gain: 0.212, hasGas: true },
    { name: 'VALDEMORO', defaultGoa: 1.649, defaultGasolina: 1.649, gain: 0.122, hasGas: true },
    { name: 'BENAMEJI', defaultGoa: 1.839, defaultGasolina: 1.799, gain: 0.274, hasGas: true },
    { name: 'HUMILLADERO', defaultGoa: 1.839, defaultGasolina: 1.799, gain: 0.274, hasGas: true },
    { name: 'ES RIBA-ROJA', defaultGoa: 1.659, defaultGasolina: 1.689, gain: 0.340, hasGas: true },
    { name: 'ES PISTA DE SILLA', defaultGoa: 1.659, defaultGasolina: 1.689, gain: 0.340, hasGas: true },
    { name: 'ES REAL DE GANDIA', defaultGoa: 1.680, defaultGasolina: 1.689, gain: 0.340, hasGas: true },
  ];

  POSTES_PROPIAS_DEF.forEach((pDef) => {
    const pSaved = postesData?.postes?.[pDef.name];
    const posteGoa = pSaved?.goa ? parseNum(pSaved.goa) : pDef.defaultGoa;
    const posteGas = pDef.hasGas ? (pSaved?.gasolina ? parseNum(pSaved.gasolina) : pDef.defaultGasolina) : 0;
    const marginGas = pDef.hasGas ? (pSaved?.gasolinaGain ? parseNum(pSaved.gasolinaGain) : pDef.gain) : 0;

    const goaItem = purchases[`${pDef.name}_GOA`] || purchases[`TORREJON_GOA`];
    const gasItem = purchases[`${pDef.name}_GASOLINA`] || purchases[`TORREJON_GASOLINA`];

    const pCompraGoa = goaItem ? parseNum(goaItem.curr) : 1.200;
    const cTotalGoa = goaItem ? round3(parseNum(goaItem.curr) + parseNum(goaItem.porte) + parseNum(goaItem.pase) + parseNum(goaItem.fin)) : 1.220;
    const tarifa60ConIva = round3((cTotalGoa + 0.080) * 1.21);
    const margenGoa = round3(tarifa60ConIva - posteGoa);

    const pCompraGas = gasItem ? parseNum(gasItem.curr) : 1.320;
    const cTotalGas = gasItem ? round3(parseNum(gasItem.curr) + parseNum(gasItem.porte) + parseNum(gasItem.pase) + parseNum(gasItem.fin)) : 1.340;

    postesRows.push([
      pDef.name,
      pCompraGoa,
      cTotalGoa,
      posteGoa,
      margenGoa,
      pDef.hasGas ? pCompraGas : '-',
      pDef.hasGas ? cTotalGas : '-',
      pDef.hasGas ? posteGas : '-',
      pDef.hasGas ? marginGas : '-',
    ]);
  });

  postesRows.push([]);
  postesRows.push(['2. GASOLEO B (ESPECIFICO POSTES)']);
  postesRows.push(['ESTACION', 'PRECIO COMPRA SIN IVA (EUR)', 'PRECIO TRANSFRIRED (EUR)', 'TRANSFRIRED CON IVA (EUR)', 'PRECIO POSTE GASOLEO B (EUR)']);

  const gasoleoBList = [
    { name: 'UCLES', defaultCompra: 1.0045 },
    { name: 'TORREMOCHA', defaultCompra: 1.0045 },
    { name: 'ARCOS', defaultCompra: 1.0045 },
  ];

  gasoleoBList.forEach((gb) => {
    const savedGb = postesData?.gasoleoBRows?.[gb.name];
    const compra = savedGb?.compra ? parseNum(savedGb.compra) : gb.defaultCompra;
    const transfer = savedGb?.transfer && savedGb.transfer.trim() !== '' ? parseNum(savedGb.transfer) : round3(compra + 0.017);
    const transConIva = round3(transfer * 1.21);
    const posteGb = savedGb?.poste && savedGb.poste.trim() !== '' ? parseNum(savedGb.poste) : round3((compra + 0.035) * 1.21);
    postesRows.push([gb.name, compra, transfer, transConIva, posteGb]);
  });

  postesRows.push([]);
  postesRows.push(['3. POSTES HVO']);
  postesRows.push(['PRODUCTO', 'UBICACION', 'PRECIO SIN IVA (EUR)', 'PRECIO CON IVA (EUR)']);
  postesRows.push(['HVO 100', 'ALFAJARIN', 1.256, round3(1.256 * 1.21)]);
  postesRows.push(['HVO 100', 'VALDEMORO', 1.326, round3(1.326 * 1.21)]);

  const wsPostes = XLSX.utils.aoa_to_sheet(postesRows);
  XLSX.utils.book_append_sheet(wb, wsPostes, 'POSTES');

  // 4. HOJA: TARIFAS ESPECIALES
  const specialRows: any[][] = [];
  specialRows.push(['TARIFAS ESPECIALES (B50:F82) - AREA 117']);
  specialRows.push(['Fecha Emision:', selectedDate, 'Valido A Partir De:', validFromDate]);
  specialRows.push([]);
  specialRows.push(['ESTACION', 'PRECIO REFERENCIA (EUR)', 'PRECIO ACTUAL / ESPECIAL (EUR)', 'PRECIO BASE / COSTE (EUR)']);

  specialRates.forEach((row) => {
    // 1) Precio actual/especial se copia siempre de p. venta sugerido de Gasoleo A
    let act = parseNum(row.actualPrice);
    if (!act || act === 0) {
      const cleanTarget = row.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
      const matchedKey = Object.keys(purchases).find((k) => {
        if (!k.endsWith('_GOA')) return false;
        const baseK = k.replace(/_GOA$/, '').toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
        return baseK === cleanTarget || baseK.includes(cleanTarget) || cleanTarget.includes(baseK);
      });
      if (matchedKey && purchases[matchedKey]) {
        const item = purchases[matchedKey];
        const cTotal = round3(parseNum(item.curr) + parseNum(item.porte) + parseNum(item.pase) + parseNum(item.fin));
        const cleanSt = row.name.toUpperCase().replace(/^ES\s+/, '').trim();
        const officialPrice = OFFICIAL_SUGGESTED_SALE_PRICES[row.name] ?? OFFICIAL_SUGGESTED_SALE_PRICES[cleanSt];
        act = item.sale && parseNum(item.sale) > 0
          ? parseNum(item.sale)
          : (officialPrice !== undefined ? officialPrice : cTotal);
      }
      if (!act || act === 0) {
        const cleanSt = row.name.toUpperCase().replace(/^ES\s+/, '').trim();
        const officialPrice = OFFICIAL_SUGGESTED_SALE_PRICES[row.name] ?? OFFICIAL_SUGGESTED_SALE_PRICES[cleanSt];
        act = officialPrice !== undefined ? officialPrice : 1.320;
      }
    }

    // 2) Precio base / coste se copia siempre de costo total de GOA / 1000 + 0.008
    let base = parseNum(row.basePrice);
    if (!base || base === 0) {
      const cleanTarget = row.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
      const matchedKey = Object.keys(purchases).find((k) => {
        if (!k.endsWith('_GOA')) return false;
        const baseK = k.replace(/_GOA$/, '').toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
        return baseK === cleanTarget || baseK.includes(cleanTarget) || cleanTarget.includes(baseK);
      });
      let cTotal = 1.230;
      if (matchedKey && purchases[matchedKey]) {
        const item = purchases[matchedKey];
        cTotal = round3(parseNum(item.curr) + parseNum(item.porte) + parseNum(item.pase) + parseNum(item.fin));
      } else if (STATION_EXCEL_COSTS[row.name]) {
        const costs = STATION_EXCEL_COSTS[row.name];
        cTotal = round3(costs.defaultCurr + costs.porte + costs.pase + costs.fin);
      }
      base = round3(cTotal > 50 ? (cTotal / 1000) + 0.008 : cTotal + 0.008);
    }

    const ref = row.refPrice ? parseNum(row.refPrice) : round3(act + 0.008);
    specialRows.push([row.name, ref, act, base]);
  });

  const wsSpecial = XLSX.utils.aoa_to_sheet(specialRows);
  XLSX.utils.book_append_sheet(wb, wsSpecial, 'TARIFAS ESPECIALES');

  // 5. HOJA: IMPORTACION_EFI
  const importRows: any[][] = [];
  importRows.push(['CODIGO_ESTACION', 'NOMBRE_ESTACION', 'PRODUCTO', 'PRECIO_SIN_IVA', 'PRECIO_CON_IVA', 'FECHA']);

  PROPIAS_STATIONS.forEach((st) => {
    ['GOA', 'GASOLINA'].forEach((prodCode) => {
      const key = `${st.name}_${prodCode}`;
      const item = purchases[key];
      let pSinIva = 1.195;
      if (item) {
        pSinIva = item.isCustomSale && item.sale ? parseNum(item.sale) : round3(parseNum(item.curr) + parseNum(item.porte) + parseNum(item.pase) + parseNum(item.fin));
      }
      const pConIva = round3(pSinIva * 1.21);
      importRows.push([st.name, st.name, prodCode, pSinIva, pConIva, validFromDate]);
    });
  });

  fixedCollaborators.forEach((st) => {
    const key = `${st.name}_GOA`;
    const item = purchases[key];
    let pSinIva = 1.220;
    if (item) {
      pSinIva = item.isCustomSale && item.sale ? parseNum(item.sale) : round3(parseNum(item.curr) + parseNum(item.porte) + parseNum(item.pase) + parseNum(item.fin));
    }
    const pConIva = round3(pSinIva * 1.21);
    importRows.push([st.name, st.name, 'GOA', pSinIva, pConIva, validFromDate]);
  });

  const wsImport = XLSX.utils.aoa_to_sheet(importRows);
  XLSX.utils.book_append_sheet(wb, wsImport, 'IMPORTACION_EFI');

  // Descarga del archivo .xlsx
  const filename = `CIERRE_DIARIO_AREA117_${selectedDate}_VALIDO_${validFromDate}.xlsx`;
  downloadWorkbookAsXlsx(wb, filename);
}

export function downloadWorkbookAsXlsx(wb: XLSX.WorkBook, filename: string) {
  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al generar XLSX:', err);
    XLSX.writeFile(wb, finalName);
  }
}

// =======================================================================
// EXPORTADOR OFICIAL HOJA "IMPORTACION" (1.204 FILAS, 22 BLOQUES)
// =======================================================================

export interface ImportStationDef {
  id: number;
  name: string;
  isZero: boolean;
}

export const IMPORT_STATIONS_56: ImportStationDef[] = [
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

export interface ImportTariffDef {
  codeA: number;
  name: string;
  key: string;
  prod: number;
  markup?: number;
  pago?: string;
}

export interface EfiExportRowOverride {
  pvp?: number;
  initialDate?: string;
  finalDate?: string;
  pago?: string;
  prod?: number;
  codeA?: number;
  sourceType?: string;
  sourceLabel?: string;
  markupDiff?: number;
  manualPriceConIva?: number;
  formulaStr?: string;
  isCustom?: boolean;
}

export interface EfiExportAddedRow {
  id: string;
  codeA: number;
  stationId: number;
  prod: number;
  initialDate: string;
  finalDate: string;
  pvp: number;
  stationName: string;
  pago: string;
  tarifa: string;
  sourceLabel?: string;
}

export function loadEfiExportOverrides(): {
  overrides: Record<string, EfiExportRowOverride>;
  addedRows: EfiExportAddedRow[];
  deletedRows: string[];
  deletedTariffs: string[];
} {
  if (typeof window === 'undefined') {
    return { overrides: {}, addedRows: [], deletedRows: [], deletedTariffs: [] };
  }
  try {
    const ov = localStorage.getItem('efi_export_custom_overrides_v1');
    const ad = localStorage.getItem('efi_export_added_rows_v1');
    const del = localStorage.getItem('efi_export_deleted_rows_v1');
    const delT = localStorage.getItem('efi_export_deleted_tariffs_v1');
    return {
      overrides: ov ? JSON.parse(ov) : {},
      addedRows: ad ? JSON.parse(ad) : [],
      deletedRows: del ? JSON.parse(del) : [],
      deletedTariffs: delT ? JSON.parse(delT) : [],
    };
  } catch (e) {
    return { overrides: {}, addedRows: [], deletedRows: [], deletedTariffs: [] };
  }
}

export const IMPORT_TARIFF_METADATA: ImportTariffDef[] = [
  { codeA: 6, name: 'TARIFA 12', key: '12', prod: 1, markup: 0.012, pago: 'MENSUAL' },
  { codeA: 24, name: 'TARIFA 18', key: '18', prod: 1, markup: 0.018, pago: 'MENSUAL' },
  { codeA: 8, name: 'TARIFA 24', key: '24', prod: 1, markup: 0.024, pago: 'MENSUAL' },
  { codeA: 3, name: 'TARIFA 36', key: '36', prod: 1, markup: 0.036, pago: 'MENSUAL' },
  { codeA: 45, name: 'TARIFA 40', key: '40', prod: 1, markup: 0.040, pago: 'MENSUAL' },
  { codeA: 39, name: 'TARIFA 42', key: '42', prod: 1, markup: 0.042, pago: 'MENSUAL' },
  { codeA: 5, name: 'TARIFA 47', key: '47', prod: 1, markup: 0.047, pago: 'MENSUAL' },
  { codeA: 4, name: 'TARIFA 50', key: '50', prod: 1, markup: 0.060, pago: 'MENSUAL' },
  { codeA: 9, name: 'TARIFA 60', key: '60', prod: 1, markup: 0.080, pago: 'MENSUAL' },
  { codeA: 42, name: 'TARIFA 85', key: 'miki', prod: 1, markup: 0.090, pago: 'MENSUAL' },
  { codeA: 50, name: 'TARIFA CARRERAS', key: 'carreras', prod: 1, markup: 0.024, pago: 'MENSUAL' },
  { codeA: 85, name: 'TARIFA JAVI', key: 'javi', prod: 1, markup: 0.024, pago: 'MENSUAL' },
  { codeA: 65, name: 'TARIFA TRANSFRIRED', key: 'transfrired', prod: 1, markup: 0.024, pago: 'MENSUAL' },
  { codeA: 62, name: 'TARIFA ESPECIAL GENERAL', key: 'c0', prod: 1, markup: 0.024, pago: 'MENSUAL' },
  { codeA: 31, name: 'TARIFA ROR', key: 'ror', prod: 1, markup: 0.024, pago: 'MENSUAL' },
  { codeA: 7, name: 'TARIFA ESTEBAN', key: 'esteban', prod: 1, markup: 0.024, pago: 'MENSUAL' },
  // Bloque 17 especial (Gasolina Bronco + Gasóleo B) se inserta aquí
  { codeA: 61, name: 'TARIFA ECOTRANS', key: 'ecotrans', prod: 1, markup: 0.050, pago: 'MENSUAL' },
  { codeA: 86, name: 'TARIFA 30', key: 't30', prod: 1, markup: 0.030, pago: 'MENSUAL' },
  { codeA: 87, name: 'TARIFA 27 SUR', key: 't27', prod: 1, markup: 0.027, pago: 'MENSUAL' },
  { codeA: 88, name: 'TARIFA 15 SUR', key: 't15', prod: 1, markup: 0.015, pago: 'MENSUAL' },
  { codeA: 89, name: 'TARIFA PREPAGO 10', key: 'prepago10', prod: 1, markup: -0.002, pago: 'PREPAGO' },
  { codeA: 91, name: 'TARIFA PREPAGO 20', key: 'prepago20', prod: 1, markup: 0.008, pago: 'PREPAGO' },
  { codeA: 92, name: 'TARIFA PREPAGO 30', key: 'prepago30', prod: 1, markup: 0.018, pago: 'PREPAGO' },
];

export const resolveSabanaStationName = (importStName: string): string => {
  const trimmed = importStName.trim();
  const allStations = [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];
  const exact = allStations.find((s) => s.name === trimmed);
  if (exact) return exact.name;

  const clean = trimmed.toUpperCase().replace(/^ES\s+/, '').trim();
  const matchWithoutEs = allStations.find(
    (s) => s.name.toUpperCase().replace(/^ES\s+/, '').trim() === clean
  );
  if (matchWithoutEs) return matchWithoutEs.name;

  if (clean.includes('FIGUERES') || clean.includes('PETREM')) return 'PETREM FIGUERES';
  if (clean.includes('VALDEMORO')) return 'VALDEMORO';
  if (clean.includes('TARRAGONA')) return 'TARRAGONA';
  if (clean.includes('BERA')) return 'BERA';

  const sub = allStations.find((s) => {
    const sClean = s.name.toUpperCase().replace(/^ES\s+/, '').trim();
    return sClean.includes(clean) || clean.includes(sClean);
  });
  return sub ? sub.name : trimmed;
};

const formatDateToEs = (dateStr: string): string => {
  if (!dateStr) return '01/08/2025';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export function buildImportacionTable(
  selectedDate: string,
  userValidFrom?: string,
  userFinalDate?: string
): (string | number | null)[][] {
  // 1. Cargar fuentes de datos locales
  let purchasesData: Record<string, any> = {};
  let specialRates: any[] = [];
  let broncoData: any = { conIva: '1.690' };
  let postesData: any = {};
  let customSpecialTariffs: any[] = [];
  let customStandardTariffs: any[] = [];
  let modifiedTariffsConfig: Record<string, any> = {};
  let tariffSourcesMapping: Record<string, any> = {};

  if (typeof window !== 'undefined') {
    try {
      const sDate = localStorage.getItem('efi_purchases_' + selectedDate);
      const sGlob = localStorage.getItem('efi_compras_data');
      if (sDate) purchasesData = JSON.parse(sDate).data || {};
      else if (sGlob) purchasesData = JSON.parse(sGlob).data || {};

      const sp = localStorage.getItem('efi_special_rates_b50_f82_v4') || localStorage.getItem('efi_special_rates_b50_f82_v3');
      if (sp) specialRates = JSON.parse(sp);

      const bDate = localStorage.getItem('efi_purchases_bronco_' + selectedDate);
      const bGlob = localStorage.getItem('efi_compras_gasolina_bronco');
      if (bDate) broncoData = JSON.parse(bDate);
      else if (bGlob) broncoData = JSON.parse(bGlob);

      const pData = localStorage.getItem('efi_postes_data_v2');
      if (pData) postesData = JSON.parse(pData);

      const cSpecRaw = localStorage.getItem('efi_sabana_custom_special_tariffs_v1');
      if (cSpecRaw) {
        try {
          customSpecialTariffs = JSON.parse(cSpecRaw);
        } catch (e) {}
      }

      const cStdRaw = localStorage.getItem('efi_sabana_custom_standard_tariffs_v1');
      if (cStdRaw) {
        try {
          customStandardTariffs = JSON.parse(cStdRaw);
        } catch (e) {}
      }

      const modRaw = localStorage.getItem('efi_sabana_modified_tariffs_config_v1');
      if (modRaw) {
        try {
          modifiedTariffsConfig = JSON.parse(modRaw);
        } catch (e) {}
      }

      const smRaw = localStorage.getItem('efi_sabana_tariff_source_mapping_v1');
      if (smRaw) {
        try {
          tariffSourcesMapping = JSON.parse(smRaw);
        } catch (e) {}
      }
    } catch (e) {}
  }

  // Si no existen tarifas especiales personalizadas guardadas, garantizar las 3 predeterminadas
  if (!customSpecialTariffs || customSpecialTariffs.length === 0) {
    customSpecialTariffs = [
      { id: 'spec_prepago_10', name: 'PREPAGO 10', markup: -0.002, blockType: 'special', isCustom: true },
      { id: 'spec_prepago_20', name: 'PREPAGO 20', markup: 0.008, blockType: 'special', isCustom: true },
      { id: 'spec_prepago_30', name: 'PREPAGO 30', markup: 0.018, blockType: 'special', isCustom: true },
    ];
  }

  // Cargar fórmulas de Sábana y reevaluarlas reactivamente con Compras y Tarifas Especiales
  const rawSabanaFormulas = typeof window !== 'undefined' ? loadSabanaFormulas(selectedDate) : {};
  const resolvedSabanaFormulas = reevaluateAllSabanaFormulas(
    rawSabanaFormulas,
    selectedDate,
    purchasesData,
    specialRates
  );

  const validFrom = formatDateToEs(userValidFrom || selectedDate || '2025-08-01');
  const validFinal = formatDateToEs(userFinalDate || '2025-08-20');

  // Obtener P. Venta Sugerido de Compras para cada estación con resolución idéntica a Sábana
  const getStationBasePrice = (stName: string): number => {
    let item = purchasesData[`${stName}_GOA`];
    const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    if (!item?.sale) {
      const matchedKey = Object.keys(purchasesData).find((k) => {
        if (!k.endsWith('_GOA')) return false;
        const baseK = k.replace(/_GOA$/, '').toUpperCase().replace(/^ES\s+/, '').trim();
        return baseK === cleanTarget || baseK.includes(cleanTarget) || cleanTarget.includes(baseK);
      });
      if (matchedKey) {
        item = purchasesData[matchedKey];
      }
    }
    if (item?.sale && item.sale.trim() !== '' && item.sale !== '0' && item.sale !== '0.000') {
      const val = parseFloat(item.sale.toString().replace(',', '.'));
      if (!isNaN(val) && val > 0) return val;
    }
    if (OFFICIAL_SUGGESTED_SALE_PRICES[cleanTarget] !== undefined) {
      return OFFICIAL_SUGGESTED_SALE_PRICES[cleanTarget];
    }
    if (OFFICIAL_SUGGESTED_SALE_PRICES[stName] !== undefined) {
      return OFFICIAL_SUGGESTED_SALE_PRICES[stName];
    }
    const matchedOfficialKey = Object.keys(OFFICIAL_SUGGESTED_SALE_PRICES).find((k) => {
      const baseK = k.toUpperCase().replace(/^ES\s+/, '').trim();
      return baseK === cleanTarget || baseK.includes(cleanTarget) || cleanTarget.includes(baseK);
    });
    if (matchedOfficialKey) {
      return OFFICIAL_SUGGESTED_SALE_PRICES[matchedOfficialKey];
    }
    const costs = STATION_EXCEL_COSTS[stName] || STATION_EXCEL_COSTS[cleanTarget] || {
      porte: 0.0050,
      pase: 0.0100,
      fin: 0.0100,
      defaultCurr: 1.2000,
    };
    return Number((costs.defaultCurr + costs.porte + costs.pase + costs.fin).toFixed(4));
  };

  // Obtener Precio Referencia de Tarifas Especiales de Compras
  const getSpecialRateRefPrice = (stName: string): number => {
    if (specialRates && specialRates.length > 0) {
      const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
      const stCleanId = stName.toLowerCase().replace(/^es\s+/, '').replace(/[^a-z0-9]/g, '');
      const row = specialRates.find((r) => {
        if (!r || !r.name) return false;
        const rNorm = r.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
        if (rNorm === cleanTarget || rNorm.includes(cleanTarget) || cleanTarget.includes(rNorm)) return true;
        const rId = (r.id || '').toLowerCase().replace(/[-_]/g, '');
        if (rId && stCleanId && (rId === stCleanId || rId.includes(stCleanId) || stCleanId.includes(rId))) return true;
        return false;
      });
      if (row) {
        if (row.isCustomRef && row.refPrice && row.refPrice.trim() !== '') {
          const p = parseFloat(row.refPrice.toString().replace(',', '.'));
          if (!isNaN(p) && p > 0) return p;
        }
        if (row.refPrice && row.refPrice.trim() !== '') {
          const p = parseFloat(row.refPrice.toString().replace(',', '.'));
          if (!isNaN(p) && p > 0) return p;
        }
        if (row.isCustomActual && row.actualPrice && row.actualPrice.trim() !== '') {
          const act = parseFloat(row.actualPrice.toString().replace(',', '.'));
          if (!isNaN(act) && act > 0) return Number((act + 0.0080).toFixed(3));
        }
      }
    }
    const baseSale = getStationBasePrice(stName);
    return Number((baseSale + 0.0080).toFixed(3));
  };

  // Obtener Precio Actual / Especial de Tarifas Especiales de Compras
  const getSpecialRateActualPrice = (stName: string): number => {
    if (specialRates && specialRates.length > 0) {
      const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
      const stCleanId = stName.toLowerCase().replace(/^es\s+/, '').replace(/[^a-z0-9]/g, '');
      const row = specialRates.find((r) => {
        if (!r || !r.name) return false;
        const rNorm = r.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
        if (rNorm === cleanTarget || rNorm.includes(cleanTarget) || cleanTarget.includes(rNorm)) return true;
        const rId = (r.id || '').toLowerCase().replace(/[-_]/g, '');
        if (rId && stCleanId && (rId === stCleanId || rId.includes(stCleanId) || stCleanId.includes(rId))) return true;
        return false;
      });
      if (row && row.isCustomActual && row.actualPrice && row.actualPrice.trim() !== '') {
        const p = parseFloat(row.actualPrice.toString().replace(',', '.'));
        if (!isNaN(p) && p > 0) return p;
      }
    }
    return getStationBasePrice(stName);
  };

  const isJaviOrange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('TORREJON') ||
      u.includes('ARCOS') ||
      u.includes('ALFAJARIN') ||
      u.includes('TORREMOCHA') ||
      u.includes('MADRID') ||
      u.includes('VALDEMORO') ||
      u.includes('PAMPLONA') ||
      u.includes('HUMILLADERO') ||
      u.includes('UCLES') ||
      u.includes('RIBA-ROJA') ||
      u.includes('PISTA DE SILLA') ||
      u.includes('REAL DE GANDIA') ||
      u.includes('CHIVA') ||
      u.includes('ALBERIC') ||
      u.includes('CATARROJA') ||
      u.includes('MANISES') ||
      u.includes('ABRERA') ||
      u.includes('CASAR') ||
      u.includes('JUNDIZ') ||
      u.includes('OLIVERAL') ||
      u.includes('GUARROMAN') ||
      u.includes('VALDEPE') ||
      u.includes('LLERS') ||
      u.includes('BERA') ||
      u.includes('GIRONA') ||
      u.includes('FIGUERES')
    );
  };

  const isCarrerasOrange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    if (u.includes('VALDEMORO') || u.includes('OPEN')) return false;
    return (
      isJaviOrange(stName) ||
      u.includes('BENAMEJI') ||
      u.includes('IRUN') ||
      u.includes('CAMPANA')
    );
  };

  const isTransfriredOrange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('TORREJON') ||
      u.includes('ARCOS') ||
      u.includes('ALFAJARIN') ||
      u.includes('TORREMOCHA') ||
      u.includes('MADRID') ||
      u.includes('HUMILLADERO') ||
      u.includes('UCLES') ||
      u.includes('RIBA-ROJA') ||
      u.includes('PISTA DE SILLA') ||
      u.includes('REAL DE GANDIA') ||
      u.includes('CHIVA') ||
      u.includes('ALBERIC') ||
      u.includes('CATARROJA') ||
      u.includes('MANISES') ||
      u.includes('ABRERA') ||
      u.includes('CASAR') ||
      u.includes('JUNDIZ') ||
      u.includes('OLIVERAL') ||
      u.includes('GUARROMAN') ||
      u.includes('VALDEPE') ||
      u.includes('GIRONA') ||
      u.includes('FIGUERES')
    );
  };

  const isC0Orange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('TORREJON') ||
      u.includes('ARCOS') ||
      u.includes('ALFAJARIN') ||
      u.includes('TORREMOCHA') ||
      u.includes('MADRID') ||
      u.includes('VALDEMORO') ||
      u.includes('PAMPLONA') ||
      u.includes('HUMILLADERO') ||
      u.includes('UCLES') ||
      u.includes('BENAMEJI') ||
      u.includes('ALCUBILLAS') ||
      u.includes('RIBA-ROJA') ||
      u.includes('PISTA DE SILLA') ||
      u.includes('REAL DE GANDIA') ||
      u.includes('CHIVA') ||
      u.includes('ALBERIC') ||
      u.includes('CATARROJA') ||
      u.includes('MANISES') ||
      u.includes('ABRERA') ||
      u.includes('CASAR') ||
      u.includes('JUNDIZ') ||
      u.includes('OLIVERAL') ||
      u.includes('GUARROMAN') ||
      u.includes('VALDEPE') ||
      u.includes('OPEN') ||
      u.includes('IRUN') ||
      u.includes('CAMPANA') ||
      u.includes('LLERS') ||
      u.includes('BERA') ||
      u.includes('GIRONA') ||
      u.includes('FIGUERES')
    );
  };

  const isRorOrange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('ALFAJARIN') ||
      u.includes('TORREMOCHA') ||
      u.includes('CATARROJA') ||
      u.includes('MANISES') ||
      u.includes('ABRERA')
    );
  };

  const isEstebanGreen = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('PUERTO DE BARCELONA') ||
      u.includes('GIRONA') ||
      u.includes('FEGOBLAN') ||
      u.includes('VEGA DE VALCARCE') ||
      u.includes('HOILA TOLEDO')
    );
  };

  const isEstebanOrange = (stName: string): boolean => {
    if (isEstebanGreen(stName)) return false;
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return (
      u.includes('ARCOS') ||
      u.includes('ALFAJARIN') ||
      u.includes('TORREMOCHA') ||
      u.includes('MADRID') ||
      u.includes('PAMPLONA') ||
      u.includes('UCLES') ||
      u.includes('ALCUBILLAS') ||
      u.includes('RIBA-ROJA') ||
      u.includes('PISTA DE SILLA') ||
      u.includes('REAL DE GANDIA') ||
      u.includes('CHIVA') ||
      u.includes('ALBERIC') ||
      u.includes('CATARROJA') ||
      u.includes('MANISES') ||
      u.includes('CASAR') ||
      u.includes('OLIVERAL') ||
      u.includes('GUARROMAN') ||
      u.includes('BERA') ||
      u.includes('FIGUERES')
    );
  };

  const isTarifa30Orange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return u.includes('ABRERA');
  };

  const isSurOrange = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    return u.includes('ABRERA');
  };

  const isSurGreen = (stName: string): boolean => {
    const u = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    const greenList = [
      'VALDEHERRERA',
      'LA JOYOSA',
      'JUNDIZ NORPETROL',
      'OLIVERAL',
      'TJOIL SEVILLA',
      'BENAVENTE',
      'IRUN ZAISA III',
      'TARRAGONA',
      'AVILESINA',
      'LLERS',
      'MERIDA',
      'SANCTI-SPIRITUS',
      'MURCIA',
      'NORIOIL',
      'SAN VICENTE DEL PALACIO',
      'WATERY ARANDA',
      'BERA',
      'PUERTO DE BARCELONA',
      'GIRONA-CALSINA',
      'FEGOBLAN PONTEVEDRA',
      'VEGA DE VALCARCE',
      'HOILA TOLEDO',
    ];
    return greenList.some((g) => u.includes(g) || g.includes(u));
  };

  // Helper para resolver orígenes de datos personalizados configurados en Sábana de Precios
  const resolveCustomSourceValue = (
    sourceType: string,
    stName: string,
    isPropia?: boolean,
    manualVal?: number
  ): number => {
    const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').trim();
    const baseSale = getStationBasePrice(stName);

    switch (sourceType) {
      case 'COMPRAS_VENTA_SUGERIDO':
        return baseSale;
      case 'COMPRAS_BRONCO': {
        const b = purchasesData[`${stName}_GASOLINA`] || purchasesData[`${stName}_BRONCO`] ||
                  purchasesData[`${cleanTarget}_GASOLINA`] || purchasesData[`${cleanTarget}_BRONCO`];
        const val = b?.sale ? parseFloat(b.sale.replace(',', '.')) : (parseNum(broncoData.sinIva) || 1.265);
        return isNaN(val) ? 1.265 : val;
      }
      case 'COMPRAS_MEDIO': {
        const item = purchasesData[`${stName}_GOA`] || purchasesData[`${cleanTarget}_GOA`];
        const val = item?.avg ? parseFloat(item.avg.replace(',', '.')) : (baseSale - 0.0425);
        return isNaN(val) ? baseSale : val;
      }
      case 'COMPRAS_MINIMO': {
        const item = purchasesData[`${stName}_GOA`] || purchasesData[`${cleanTarget}_GOA`];
        const val = item?.min ? parseFloat(item.min.replace(',', '.')) : (baseSale - 0.05);
        return isNaN(val) ? baseSale : val;
      }
      case 'COMPRAS_ESPECIAL_REF':
        return getSpecialRateRefPrice(stName);
      case 'COMPRAS_ESPECIAL_ACTUAL':
        return getSpecialRateActualPrice(stName);
      case 'POSTE_GOA': {
        try {
          const row = postesData?.gasoleoARows?.[cleanTarget] || postesData?.gasoleoARows?.[stName] ||
                      postesData?.propiasPvpRows?.[stName]?.gasoleoA || postesData?.propiasPvpRows?.[cleanTarget]?.gasoleoA;
          const pvpStr = row?.conIva || (typeof row === 'string' ? row : '');
          if (pvpStr && pvpStr.trim() !== '') {
            const p = parseFloat(pvpStr.replace(',', '.'));
            if (!isNaN(p) && p > 0) return Number((p / 1.21).toFixed(3));
          }
        } catch (e) {}
        return Number((baseSale + 0.05).toFixed(3));
      }
      case 'POSTE_G95': {
        try {
          const row = postesData?.gasolina95Rows?.[cleanTarget] || postesData?.gasolina95Rows?.[stName] ||
                      postesData?.propiasPvpRows?.[stName]?.gasolina95 || postesData?.propiasPvpRows?.[cleanTarget]?.gasolina95;
          const pvpStr = row?.conIva || (typeof row === 'string' ? row : '');
          if (pvpStr && pvpStr.trim() !== '') {
            const p = parseFloat(pvpStr.replace(',', '.'));
            if (!isNaN(p) && p > 0) return Number((p / 1.21).toFixed(3));
          }
        } catch (e) {}
        return Number((baseSale + 0.09).toFixed(3));
      }
      case 'SABANA_TAR_12':
        return Number((baseSale + 0.012).toFixed(3));
      case 'SABANA_TAR_18':
        return Number((baseSale + 0.018).toFixed(3));
      case 'SABANA_TAR_24':
        return Number((baseSale + 0.024).toFixed(3));
      case 'SABANA_TAR_36':
        return Number((baseSale + 0.036).toFixed(3));
      case 'SABANA_TAR_40':
        return Number((baseSale + 0.040).toFixed(3));
      case 'SABANA_TAR_42':
        return Number((baseSale + 0.042).toFixed(3));
      case 'SABANA_TAR_47':
        return Number((baseSale + 0.047).toFixed(3));
      case 'SABANA_TAR_50':
        return Number((baseSale + 0.060).toFixed(3));
      case 'SABANA_TAR_60':
        return Number((baseSale + 0.080).toFixed(3));
      case 'SABANA_ECOTRANS':
        return Number((baseSale + 0.050).toFixed(3));
      case 'MANUAL':
        return manualVal ?? 1.200;
      default:
        return baseSale;
    }
  };

  // Obtener el precio CON IVA exacto de las columnas de Tarifas Especiales Personalizadas de Sábana de Precios
  const getSpecialCustomTariffConIva = (st: ImportStationDef, tariffKey: string, defaultMarkup: number): number => {
    const sabanaName = resolveSabanaStationName(st.name);
    const cleanTarget = sabanaName.toUpperCase().replace(/^ES\s+/, '').trim();
    const stClean = st.name.toUpperCase().replace(/^ES\s+/, '').trim();
    const num = tariffKey === 'prepago10' ? '10' : tariffKey === 'prepago20' ? '20' : tariffKey === 'prepago30' ? '30' : '';
    const isPrepago = num === '10' || num === '20' || num === '30';

    // 1. Buscar en customSpecialTariffs la tarifa correspondiente
    const customTariffDef = customSpecialTariffs.find((t) => {
      const n = (t.name || '').toUpperCase().trim();
      const norm = n.replace(/^TARIFA\s+/, '').trim();
      return (
        norm === `PREPAGO ${num}` ||
        norm === `PREPAGO${num}` ||
        (norm.includes('PREPAGO') && norm.includes(num)) ||
        t.id === `spec_prepago_${num}` ||
        t.id === `prepago_${num}` ||
        t.id === tariffKey
      );
    });

    const cleanTariff = customTariffDef?.name
      ? customTariffDef.name.toUpperCase().trim()
      : `PREPAGO ${num}`;
    const cleanTariffNoSpace = cleanTariff.replace(/\s+/g, '');
    const normNoTariff = cleanTariff.replace(/^TARIFA\s+/, '').trim();
    const tariffId = customTariffDef?.id || tariffKey;

    // 0. Copia directa exacta desde la tabla Tarifas Especiales Personalizadas de Sábana de Precios
    if (typeof window !== 'undefined') {
      try {
        const rawDate = localStorage.getItem(`efi_sabana_custom_special_table_cache_${selectedDate}`);
        const rawGlobal = localStorage.getItem('efi_sabana_custom_special_table_cache_v1');
        const liveCache: Record<string, number> = rawDate ? JSON.parse(rawDate) : rawGlobal ? JSON.parse(rawGlobal) : {};

        const directKeys = [
          `${cleanTariff}::${st.name}`,
          `${cleanTariff}::${sabanaName}`,
          `${cleanTariff}::${cleanTarget}`,
          `${cleanTariff}::${stClean}`,
          `${cleanTariff}::ES ${cleanTarget}`,
          `TARIFA ${cleanTariff}::${st.name}`,
          `TARIFA ${cleanTariff}::${sabanaName}`,
          `TARIFA ${cleanTariff}::${cleanTarget}`,
          `TARIFA ${cleanTariff}::${stClean}`,
          `TARIFA ${cleanTariff}::ES ${cleanTarget}`,
          `TARIFA ${normNoTariff}::${st.name}`,
          `TARIFA ${normNoTariff}::${sabanaName}`,
          `TARIFA ${normNoTariff}::${cleanTarget}`,
          `TARIFA ${normNoTariff}::${stClean}`,
          `TARIFA ${normNoTariff}::ES ${cleanTarget}`,
          `${normNoTariff}::${st.name}`,
          `${normNoTariff}::${sabanaName}`,
          `${normNoTariff}::${cleanTarget}`,
          `${normNoTariff}::${stClean}`,
          `${normNoTariff}::ES ${cleanTarget}`,
          `${cleanTariffNoSpace}::${st.name}`,
          `${cleanTariffNoSpace}::${sabanaName}`,
          `${cleanTariffNoSpace}::${cleanTarget}`,
          `${cleanTariffNoSpace}::${stClean}`,
          `${cleanTariffNoSpace}::ES ${cleanTarget}`,
          `PREPAGO ${num}::${st.name}`,
          `PREPAGO ${num}::${sabanaName}`,
          `PREPAGO ${num}::${cleanTarget}`,
          `PREPAGO ${num}::${stClean}`,
          `PREPAGO ${num}::ES ${cleanTarget}`,
          `TARIFA PREPAGO ${num}::${st.name}`,
          `TARIFA PREPAGO ${num}::${sabanaName}`,
          `TARIFA PREPAGO ${num}::${cleanTarget}`,
          `TARIFA PREPAGO ${num}::${stClean}`,
          `TARIFA PREPAGO ${num}::ES ${cleanTarget}`,
          `PREPAGO${num}::${st.name}`,
          `PREPAGO${num}::${sabanaName}`,
          `PREPAGO${num}::${cleanTarget}`,
          `PREPAGO${num}::${stClean}`,
          `PREPAGO${num}::ES ${cleanTarget}`,
          `TARIFA PREPAGO${num}::${st.name}`,
          `TARIFA PREPAGO${num}::${sabanaName}`,
          `TARIFA PREPAGO${num}::${cleanTarget}`,
          `TARIFA PREPAGO${num}::${stClean}`,
          `TARIFA PREPAGO${num}::ES ${cleanTarget}`,
        ];

        for (const dk of directKeys) {
          if (liveCache[dk] !== undefined && typeof liveCache[dk] === 'number' && liveCache[dk] > 0) {
            return liveCache[dk];
          }
        }

        const rawFull = localStorage.getItem('efi_sabana_custom_special_table_full_v1');
        if (rawFull) {
          const fullLive = JSON.parse(rawFull);
          for (const dk of directKeys) {
            if (fullLive[dk]?.conIva !== undefined && typeof fullLive[dk].conIva === 'number' && fullLive[dk].conIva > 0) {
              return fullLive[dk].conIva;
            }
          }
        }
      } catch (e) {}
    }

    // Margen efectivo considerando modificaciones de configuración
    const mod = modifiedTariffsConfig[tariffId] ||
                modifiedTariffsConfig[cleanTariff] ||
                modifiedTariffsConfig[cleanTariffNoSpace] ||
                (customTariffDef ? modifiedTariffsConfig[customTariffDef.name] : null);
    const effectiveMarkup = mod?.markup !== undefined
      ? mod.markup
      : (customTariffDef?.markup !== undefined ? customTariffDef.markup : defaultMarkup);

    // 2. Verificar fórmulas personalizadas en Sábana de Precios (CON IVA prioritario, luego SIN IVA * 1.21)
    const formulaConKeys = [
      `STD_${st.name}_T${cleanTariff}_conIva`,
      `STD_${stClean}_T${cleanTariff}_conIva`,
      `TAR_${cleanTariff}_${st.name}_conIva`,
      `TAR_${cleanTariff}_${stClean}_conIva`,
      `STD_${sabanaName}_T${cleanTariff}_conIva`,
      `STD_${cleanTarget}_T${cleanTariff}_conIva`,
      `TAR_${cleanTariff}_${sabanaName}_conIva`,
      `TAR_${cleanTariff}_${cleanTarget}_conIva`,
      `STD_${sabanaName}_T${cleanTariffNoSpace}_conIva`,
      `STD_${cleanTarget}_T${cleanTariffNoSpace}_conIva`,
      `TAR_${cleanTariffNoSpace}_${sabanaName}_conIva`,
      `TAR_${cleanTariffNoSpace}_${cleanTarget}_conIva`,
      `STD_${st.name}_T${cleanTariffNoSpace}_conIva`,
      `TAR_${cleanTariffNoSpace}_${st.name}_conIva`,
      `STD_${sabanaName}_T${cleanTariffNoSpace.toLowerCase()}_conIva`,
      `TAR_${cleanTariffNoSpace.toLowerCase()}_${sabanaName}_conIva`,
      `STD_${cleanTarget}_T${cleanTariffNoSpace.toLowerCase()}_conIva`,
      `TAR_${cleanTariffNoSpace.toLowerCase()}_${cleanTarget}_conIva`,
      `SPEC_${customTariffDef?.specialBlockId || 'custom'}_${sabanaName}_${cleanTariff}_conIva`,
      `SPEC_${customTariffDef?.specialBlockId || 'custom'}_${st.name}_${cleanTariff}_conIva`,
      `SPEC_${customTariffDef?.specialBlockId || 'custom'}_${cleanTarget}_${cleanTariff}_conIva`,
    ];

    for (const k of formulaConKeys) {
      if (resolvedSabanaFormulas[k]?.evaluatedValue !== undefined) {
        return resolvedSabanaFormulas[k].evaluatedValue;
      }
    }

    const formulaSinKeys = [
      `STD_${st.name}_T${cleanTariff}_sinIva`,
      `STD_${stClean}_T${cleanTariff}_sinIva`,
      `TAR_${cleanTariff}_${st.name}_sinIva`,
      `TAR_${cleanTariff}_${stClean}_sinIva`,
      `STD_${sabanaName}_T${cleanTariff}_sinIva`,
      `STD_${cleanTarget}_T${cleanTariff}_sinIva`,
      `TAR_${cleanTariff}_${sabanaName}_sinIva`,
      `TAR_${cleanTariff}_${cleanTarget}_sinIva`,
      `STD_${sabanaName}_T${cleanTariffNoSpace}_sinIva`,
      `STD_${cleanTarget}_T${cleanTariffNoSpace}_sinIva`,
      `TAR_${cleanTariffNoSpace}_${sabanaName}_sinIva`,
      `TAR_${cleanTariffNoSpace}_${cleanTarget}_sinIva`,
      `STD_${st.name}_T${cleanTariffNoSpace}_sinIva`,
      `TAR_${cleanTariffNoSpace}_${st.name}_sinIva`,
      `STD_${sabanaName}_T${cleanTariffNoSpace.toLowerCase()}_sinIva`,
      `TAR_${cleanTariffNoSpace.toLowerCase()}_${sabanaName}_sinIva`,
      `STD_${cleanTarget}_T${cleanTariffNoSpace.toLowerCase()}_sinIva`,
      `TAR_${cleanTariffNoSpace.toLowerCase()}_${cleanTarget}_sinIva`,
      `SPEC_${customTariffDef?.specialBlockId || 'custom'}_${sabanaName}_${cleanTariff}_sinIva`,
      `SPEC_${customTariffDef?.specialBlockId || 'custom'}_${st.name}_${cleanTariff}_sinIva`,
      `SPEC_${customTariffDef?.specialBlockId || 'custom'}_${cleanTarget}_${cleanTariff}_sinIva`,
    ];

    for (const k of formulaSinKeys) {
      if (resolvedSabanaFormulas[k]?.evaluatedValue !== undefined) {
        return round3(resolvedSabanaFormulas[k].evaluatedValue * 1.21);
      }
    }

    // 3. Origen de datos personalizado configurado en tariffSourcesMapping
    const propiasList = typeof window !== 'undefined' ? getPropiasStations() : PROPIAS_STATIONS;
    const isPropia = propiasList.some((p) => {
      const pName = p.name.toUpperCase().replace(/^ES\s+/, '').trim();
      return p.name === sabanaName || p.name === st.name || pName === cleanTarget;
    });

    const sourceCandidates = isPrepago
      ? [
          `${cleanTariff}::${st.name}`,
          `${cleanTariff}::${sabanaName}`,
          `${cleanTariff}::${stClean}`,
          `${cleanTariff}::${cleanTarget}`,
          `PREPAGO ${num}::${st.name}`,
          `PREPAGO ${num}::${sabanaName}`,
          `PREPAGO ${num}::${stClean}`,
          `PREPAGO ${num}::${cleanTarget}`,
          customTariffDef?.name ? `${customTariffDef.name}::${sabanaName}` : null,
          customTariffDef?.name ? `${customTariffDef.name}::${st.name}` : null,
        ].filter(Boolean) as string[]
      : [
          `${cleanTariff}::${st.name}`,
          `${cleanTariff}::${sabanaName}`,
          `${cleanTariff}::${stClean}`,
          `${cleanTariff}::${cleanTarget}`,
          `${cleanTariffNoSpace}::${st.name}`,
          `${cleanTariffNoSpace}::${sabanaName}`,
          `${cleanTariffNoSpace}::${cleanTarget}`,
          customTariffDef?.name ? `${customTariffDef.name}::${sabanaName}` : null,
          customTariffDef?.name ? `${customTariffDef.name}::${st.name}` : null,
          `${cleanTariff}::__DEFAULT__`,
          `${cleanTariffNoSpace}::__DEFAULT__`,
          customTariffDef?.name ? `${customTariffDef.name}::__DEFAULT__` : null,
        ].filter(Boolean) as string[];

    let customCfg: any = null;
    for (const srcKey of sourceCandidates) {
      if (tariffSourcesMapping[srcKey]?.sourceType && tariffSourcesMapping[srcKey].sourceType !== 'DEFAULT') {
        customCfg = tariffSourcesMapping[srcKey];
        break;
      }
    }

    if (customCfg && customCfg.sourceType && customCfg.sourceType !== 'DEFAULT') {
      const baseVal = resolveCustomSourceValue(customCfg.sourceType, sabanaName, isPropia, customCfg.manualPriceSinIva);
      const diff = customCfg.markupDiff ?? effectiveMarkup;
      const defaultSinIva = Number((baseVal + diff).toFixed(3));
      return round3(defaultSinIva * 1.21);
    }

    // 4. Cálculo predeterminado idéntico a Sábana de Precios
    const basePrice = getStationBasePrice(sabanaName);
    const defaultSinIva = Number((basePrice + effectiveMarkup).toFixed(3));
    return round3(defaultSinIva * 1.21);
  };

  // Función definitiva que obtiene el precio CON IVA exacto de Sábana de Precios para cada estación y tarifa
  const getPvpConIva = (st: ImportStationDef, tDef: ImportTariffDef): number => {
    if (st.isZero) return 0;

    const sabanaName = resolveSabanaStationName(st.name);

    // CASO A: Tarifas Estándar (12, 18, 24, 36, 40, 42, 47, 50, 60)
    const isStandard = ['12', '18', '24', '36', '40', '42', '47', '50', '60'].includes(tDef.key);
    if (isStandard) {
      const conKey = `STD_${sabanaName}_T${tDef.key}_conIva`;
      if (resolvedSabanaFormulas[conKey]?.evaluatedValue !== undefined) {
        return resolvedSabanaFormulas[conKey].evaluatedValue;
      }
      const legConKey = `TAR_${tDef.key}_${sabanaName}_conIva`;
      if (resolvedSabanaFormulas[legConKey]?.evaluatedValue !== undefined) {
        return resolvedSabanaFormulas[legConKey].evaluatedValue;
      }
      const sinKey = `STD_${sabanaName}_T${tDef.key}_sinIva`;
      if (resolvedSabanaFormulas[sinKey]?.evaluatedValue !== undefined) {
        return round3(resolvedSabanaFormulas[sinKey].evaluatedValue * 1.21);
      }
      const legSinKey = `TAR_${tDef.key}_${sabanaName}_sinIva`;
      if (resolvedSabanaFormulas[legSinKey]?.evaluatedValue !== undefined) {
        return round3(resolvedSabanaFormulas[legSinKey].evaluatedValue * 1.21);
      }

      let effectiveMarkup = tDef.markup ?? 0.024;
      try {
        if (typeof window !== 'undefined') {
          const modRaw = localStorage.getItem('efi_sabana_modified_tariffs_config_v1');
          if (modRaw) {
            const modMap = JSON.parse(modRaw);
            const mod = modMap[tDef.key] || modMap[tDef.name];
            if (mod?.markup !== undefined) effectiveMarkup = mod.markup;
          }
        }
      } catch (e) {}

      const base = getStationBasePrice(sabanaName);
      const defaultSinIva = round3(base + effectiveMarkup);
      return round3(defaultSinIva * 1.21);
    }

    // CASO B: Tarifas Especiales (javi, carreras, transfrired, c0, ror, esteban, miki, ecotrans, t30, t27, t15, t75)
    let specBlockId = '';
    let specTariffTitle = '';
    let defaultSinIva = 0;

    const basePrice = getStationBasePrice(sabanaName);

    if (tDef.key === 'javi') {
      specBlockId = 'los_javi';
      specTariffTitle = 'Especial Javi';
      if (isJaviOrange(sabanaName)) {
        defaultSinIva = getSpecialRateRefPrice(sabanaName);
      } else if (sabanaName.toUpperCase().includes('PUERTO DE BARCELONA')) {
        const f24 = resolvedSabanaFormulas['STD_PUERTO DE BARCELONA_T24_sinIva'] || resolvedSabanaFormulas['TAR_24_PUERTO DE BARCELONA_sinIva'];
        defaultSinIva = f24 ? f24.evaluatedValue : round3(basePrice + 0.024);
      } else {
        defaultSinIva = round3(basePrice + 0.024);
      }
    } else if (tDef.key === 'carreras') {
      specBlockId = 'los_javi';
      specTariffTitle = 'Especial Carreras';
      if (isCarrerasOrange(sabanaName)) {
        defaultSinIva = getSpecialRateRefPrice(sabanaName);
      } else if (sabanaName.toUpperCase().includes('PUERTO DE BARCELONA')) {
        const f18 = resolvedSabanaFormulas['STD_PUERTO DE BARCELONA_T18_sinIva'] || resolvedSabanaFormulas['TAR_18_PUERTO DE BARCELONA_sinIva'];
        defaultSinIva = f18 ? f18.evaluatedValue : round3(basePrice + 0.018);
      } else {
        defaultSinIva = round3(basePrice + 0.018);
      }
    } else if (tDef.key === 'transfrired') {
      specBlockId = 'transfrired';
      specTariffTitle = 'Especial Transfrired';
      defaultSinIva = isTransfriredOrange(sabanaName)
        ? getSpecialRateRefPrice(sabanaName)
        : round3(basePrice + 0.024);
    } else if (tDef.key === 'c0') {
      specBlockId = 'c0_general';
      specTariffTitle = 'Especial General C-0';
      defaultSinIva = isC0Orange(sabanaName)
        ? getSpecialRateRefPrice(sabanaName)
        : round3(basePrice + 0.024);
    } else if (tDef.key === 'ror') {
      specBlockId = 'ror_esteban';
      specTariffTitle = 'Especial ROR';
      defaultSinIva = isRorOrange(sabanaName)
        ? getSpecialRateRefPrice(sabanaName)
        : round3(basePrice + 0.024);
    } else if (tDef.key === 'esteban') {
      specBlockId = 'ror_esteban';
      specTariffTitle = 'Especial Esteban';
      if (isEstebanGreen(sabanaName)) {
        const t24 = resolvedSabanaFormulas[`STD_${sabanaName}_T24_sinIva`] || resolvedSabanaFormulas[`TAR_24_${sabanaName}_sinIva`];
        defaultSinIva = t24 ? t24.evaluatedValue : round3(basePrice + 0.024);
      } else if (isEstebanOrange(sabanaName)) {
        defaultSinIva = getSpecialRateRefPrice(sabanaName);
      } else {
        defaultSinIva = round3(basePrice + 0.024);
      }
    } else if (tDef.key === 'miki') {
      specBlockId = 'miki_ecotrans_tarifa30';
      specTariffTitle = 'Tarifa 90 Miki';
      defaultSinIva = round3(basePrice + 0.090);
    } else if (tDef.key === 'ecotrans') {
      specBlockId = 'miki_ecotrans_tarifa30';
      specTariffTitle = 'Tarifa ECOTRANS';
      defaultSinIva = round3(basePrice + 0.050);
    } else if (tDef.key === 't30') {
      specBlockId = 'miki_ecotrans_tarifa30';
      specTariffTitle = 'Tarifa 30';
      defaultSinIva = isTarifa30Orange(sabanaName)
        ? getSpecialRateActualPrice(sabanaName)
        : round3(basePrice + 0.030);
    } else if (tDef.key === 't27') {
      specBlockId = 'sur_benito';
      specTariffTitle = 'Tarifa 27 Sur';
      if (isSurOrange(sabanaName)) {
        defaultSinIva = getSpecialRateRefPrice(sabanaName);
      } else if (isSurGreen(sabanaName)) {
        defaultSinIva = round3(basePrice + 0.036);
      } else {
        defaultSinIva = round3(basePrice + 0.027);
      }
    } else if (tDef.key === 't15') {
      specBlockId = 'sur_benito';
      specTariffTitle = 'Tarifa 15 Sur';
      if (isSurOrange(sabanaName)) {
        defaultSinIva = getSpecialRateRefPrice(sabanaName);
      } else if (isSurGreen(sabanaName)) {
        defaultSinIva = round3(basePrice + 0.024);
      } else {
        defaultSinIva = round3(basePrice + 0.015);
      }
    } else if (tDef.key === 'prepago10') {
      return getSpecialCustomTariffConIva(st, 'prepago10', -0.002);
    } else if (tDef.key === 'prepago20') {
      return getSpecialCustomTariffConIva(st, 'prepago20', 0.008);
    } else if (tDef.key === 'prepago30') {
      return getSpecialCustomTariffConIva(st, 'prepago30', 0.018);
    } else if (tDef.key === 't75') {
      specBlockId = 'tarifa_75';
      specTariffTitle = 'Tarifa 75';
      defaultSinIva = round3(basePrice + 0.038);
    }

    if (specBlockId && specTariffTitle) {
      const conKey = `SPEC_${specBlockId}_${sabanaName}_${specTariffTitle}_conIva`;
      if (resolvedSabanaFormulas[conKey]?.evaluatedValue !== undefined) {
        return resolvedSabanaFormulas[conKey].evaluatedValue;
      }
      const sinKey = `SPEC_${specBlockId}_${sabanaName}_${specTariffTitle}_sinIva`;
      if (resolvedSabanaFormulas[sinKey]?.evaluatedValue !== undefined) {
        return round3(resolvedSabanaFormulas[sinKey].evaluatedValue * 1.21);
      }
    }

    return round3(defaultSinIva * 1.21);
  };

  const { overrides, addedRows, deletedRows, deletedTariffs } = loadEfiExportOverrides();

  const rows: (string | number | null)[][] = [];

  // Fila 1: Encabezado idéntico a hoja IMPORTACION
  rows.push(['', 'ESTACION', 'PRODUCTO', 'INICIAL', 'FINAL', 'PVP', 'ESTACION', 'PAGO', 'TARIFA']);

  // Helper para insertar fila validando eliminaciones y sobreescrituras
  const appendRowIfActive = (
    codeA: number,
    stationId: number,
    prod: number,
    defaultDateInit: string,
    defaultDateEnd: string,
    defaultPvp: number,
    stationName: string,
    defaultPago: string,
    tarifaName: string
  ) => {
    if (deletedTariffs.includes(tarifaName)) return;

    const rowKey1 = `${tarifaName}::${stationId}`;
    const rowKey2 = `${tarifaName}::${stationId}::${prod}`;
    const rowKey3 = `${tarifaName}::${stationName.trim()}::${prod}`;

    const cleanTariffNoTariff = tarifaName.replace(/^TARIFA\s+/, '').trim();
    const altKey1 = `${cleanTariffNoTariff}::${stationId}`;
    const altKey2 = `${cleanTariffNoTariff}::${stationId}::${prod}`;
    const altKey3 = `${cleanTariffNoTariff}::${stationName.trim()}::${prod}`;

    if (
      deletedRows.includes(rowKey1) || deletedRows.includes(rowKey2) || deletedRows.includes(rowKey3) ||
      deletedRows.includes(altKey1) || deletedRows.includes(altKey2) || deletedRows.includes(altKey3)
    ) {
      return;
    }

    const ov = overrides[rowKey2] || overrides[rowKey1] || overrides[rowKey3] ||
               overrides[altKey2] || overrides[altKey1] || overrides[altKey3];

    const finalCodeA = ov?.codeA ?? codeA;
    const finalProd = ov?.prod ?? prod;
    const finalDateInit = ov?.initialDate ? formatDateToEs(ov.initialDate) : defaultDateInit;
    const finalDateEnd = ov?.finalDate ? formatDateToEs(ov.finalDate) : defaultDateEnd;
    let finalPvp = ov?.pvp !== undefined ? ov.pvp : defaultPvp;
    const finalPago = ov?.pago !== undefined ? ov.pago : defaultPago;

    const isPrepagoTariff =
      tarifaName.toUpperCase().includes('PREPAGO') ||
      codeA === 89 || codeA === 91 || codeA === 92;

    // Si para prepago existe un override residual o viejo con 1.802 o 1.770, descartarlo para que rija la copia exacta de Sábana de Precios
    if (isPrepagoTariff && (finalPvp === 1.802 || finalPvp === 1.770)) {
      finalPvp = defaultPvp;
    }

    rows.push([
      finalCodeA,
      stationId,
      finalProd,
      finalDateInit,
      finalDateEnd,
      finalPvp,
      stationName,
      finalPago,
      tarifaName
    ]);
  };

  const effectiveImportStations = typeof window !== 'undefined' ? getImportStations() : IMPORT_STATIONS_56;

  // Bloques 1 a 16 (T12 a ESTEBAN)
  const first16 = IMPORT_TARIFF_METADATA.slice(0, 16);
  first16.forEach((tDef) => {
    effectiveImportStations.forEach((st) => {
      const pvp = getPvpConIva(st, tDef);
      appendRowIfActive(tDef.codeA, st.id, tDef.prod, validFrom, validFinal, pvp, st.name, tDef.pago || 'MENSUAL', tDef.name);
    });
  });

  // Helper para obtener el precio Transfrired con IVA de Gasóleo B desde el cuadro de Postes
  const getGasoleoBTransfriredConIva = (stName: string): number => {
    let key = 'UCLES';
    const u = stName.toUpperCase();
    if (u.includes('TORREMOCHA')) key = 'TORREMOCHA';
    else if (u.includes('ARCOS')) key = 'ARCOS';
    else if (u.includes('UCLES')) key = 'UCLES';

    const row = postesData?.gasoleoBRows?.[key] || postesData?.gasoleoBRows?.[stName.trim()];
    if (row) {
      let transferNum = 0;
      if (row.transfer && row.transfer.trim() !== '') {
        transferNum = parseNum(row.transfer);
      } else if (row.compra && row.compra.trim() !== '') {
        transferNum = Number((parseNum(row.compra) + 0.017).toFixed(3));
      }
      if (transferNum > 0) {
        return Number((transferNum * 1.21).toFixed(3));
      }
    }
    return 1.439;
  };

  // Bloque 17: Bloque especial (3 filas Gasolina Bronco Prod 2 + 3 filas Gasóleo B Transfrired Prod 5)
  const broncoConIva = parseNum(broncoData.conIva) || 1.690;
  const torremochaConIva = getGasoleoBTransfriredConIva('TORREMOCHA');
  const uclesConIva = getGasoleoBTransfriredConIva('UCLES');
  const arcosConIva = getGasoleoBTransfriredConIva('ARCOS JALON');

  // 17.1 Gasolina Bronco (Torrejón, Madrid, Vallecas)
  appendRowIfActive(5, 73, 2, validFrom, validFinal, broncoConIva, 'TORREJON', 'MENSUAL', 'TARIFA 45 GASOLINA');
  appendRowIfActive(5, 2, 2, validFrom, validFinal, broncoConIva, 'MADRID', 'MENSUAL', 'TARIFA 45 GASOLINA');
  appendRowIfActive(5, 55, 2, validFrom, validFinal, broncoConIva, 'VALLECAS', 'MENSUAL', 'TARIFA 45 GASOLINA');

  // 17.2 Gasóleo B Transfrired (Torremocha, Uclés, Arcos Jalón)
  appendRowIfActive(65, 1, 5, validFrom, validFinal, torremochaConIva, 'TORREMOCHA', '', 'TRANFIRRED GOB');
  appendRowIfActive(65, 27, 5, validFrom, validFinal, uclesConIva, 'UCLES', '', 'TRANFIRRED GOB');
  appendRowIfActive(65, 19, 5, validFrom, validFinal, arcosConIva, 'ARCOS JALON', '', 'TRANFIRRED GOB');

  // Bloques 18 a 25 (ECOTRANS, TARIFA 30, 27 SUR, 15 SUR, PREPAGO 10, PREPAGO 20, PREPAGO 30)
  const remainingTariffs = IMPORT_TARIFF_METADATA.slice(16);
  remainingTariffs.forEach((tDef) => {
    effectiveImportStations.forEach((st) => {
      const pvp = getPvpConIva(st, tDef);
      appendRowIfActive(tDef.codeA, st.id, tDef.prod, validFrom, validFinal, pvp, st.name, tDef.pago || 'MENSUAL', tDef.name);
    });
  });

  // Bloque: Filas personalizadas añadidas por el usuario
  if (addedRows && addedRows.length > 0) {
    addedRows.forEach((ar) => {
      appendRowIfActive(
        ar.codeA,
        ar.stationId,
        ar.prod,
        formatDateToEs(ar.initialDate || validFrom),
        formatDateToEs(ar.finalDate || validFinal),
        ar.pvp,
        ar.stationName,
        ar.pago,
        ar.tarifa
      );
    });
  }

  // Integración dinámica de tarifas creadas en Sábana de Precios
  try {
    if (typeof window !== 'undefined') {
      const cStdRaw = localStorage.getItem('efi_sabana_custom_standard_tariffs_v1');
      const cSpecRaw = localStorage.getItem('efi_sabana_custom_special_tariffs_v1');
      const modRaw = localStorage.getItem('efi_sabana_modified_tariffs_config_v1');
      const smRaw = localStorage.getItem('efi_sabana_tariff_source_mapping_v1');

      const cStd: any[] = cStdRaw ? JSON.parse(cStdRaw) : [];
      const cSpec: any[] = cSpecRaw ? JSON.parse(cSpecRaw) : [];
      const modConfig: Record<string, any> = modRaw ? JSON.parse(modRaw) : {};
      const sourceMap: Record<string, any> = smRaw ? JSON.parse(smRaw) : {};
      const allCustom = [...cStd, ...cSpec];

      allCustom.forEach((cTariff, idx) => {
        const cleanName = cTariff.name.toUpperCase().trim();
        const cleanNoTariff = cleanName.replace(/^TARIFA\s+/, '').trim();
        // Omitir tarifas Prepago ya que se integran en los bloques oficiales 89, 91 y 92 con tipo PAGO: PREPAGO
        if (
          cleanNoTariff === 'PREPAGO 10' || cleanNoTariff === 'PREPAGO 20' || cleanNoTariff === 'PREPAGO 30' ||
          cleanNoTariff === 'PREPAGO10' || cleanNoTariff === 'PREPAGO20' || cleanNoTariff === 'PREPAGO30' ||
          (cleanNoTariff.startsWith('PREPAGO') && (cleanNoTariff.endsWith('10') || cleanNoTariff.endsWith('20') || cleanNoTariff.endsWith('30')))
        ) {
          return;
        }

        const tariffName = cleanName.startsWith('TARIFA') ? cleanName : `TARIFA ${cleanName}`;
        if (deletedTariffs.includes(tariffName)) return;

        const mod = modConfig[cTariff.id] || modConfig[cTariff.name];
        const markup = mod?.markup !== undefined ? mod.markup : (cTariff.markup ?? 0.024);
        const customSrc = sourceMap[`${cTariff.name}::__DEFAULT__`] || sourceMap[`${cleanName}::__DEFAULT__`];

        effectiveImportStations.forEach((st) => {
          if (st.isZero) return;
          const sabanaName = resolveSabanaStationName(st.name);

          let base = getStationBasePrice(sabanaName);
          if (customSrc && customSrc.sourceType && customSrc.sourceType !== 'DEFAULT') {
            if (customSrc.sourceType === 'COMPRAS_VENTA_SUGERIDO') {
              base = getStationBasePrice(sabanaName);
            } else if (customSrc.sourceType === 'COMPRAS_BRONCO') {
              base = parseNum(broncoData.sinIva) || 1.397;
            } else if (customSrc.sourceType === 'COMPRAS_MEDIO' || customSrc.sourceType === 'COMPRAS_PRECIO_COMPRA') {
              const b = purchasesData[`${sabanaName}_GOA`]?.buy || purchasesData[`${st.name}_GOA`]?.buy;
              base = parseNum(b) || 1.200;
            } else if (customSrc.sourceType === 'POSTE_GOA') {
              const p = postesData?.propiasPvpRows?.[sabanaName]?.gasoleoA || postesData?.propiasPvpRows?.[st.name]?.gasoleoA;
              if (p) base = round3(parseNum(p) / 1.21);
            } else if (customSrc.sourceType === 'MANUAL' && customSrc.manualPriceSinIva !== undefined) {
              base = customSrc.manualPriceSinIva;
            }
          }

          const conKey1 = `STD_${sabanaName}_T${cTariff.name}_conIva`;
          const sinKey1 = `STD_${sabanaName}_T${cTariff.name}_sinIva`;
          const conKey2 = `SPEC_${cTariff.specialBlockId || 'custom'}_${sabanaName}_${cTariff.name}_conIva`;
          const sinKey2 = `SPEC_${cTariff.specialBlockId || 'custom'}_${sabanaName}_${cTariff.name}_sinIva`;

          let pvp = round3((base + markup) * 1.21);
          if (resolvedSabanaFormulas[conKey1]?.evaluatedValue !== undefined) {
            pvp = resolvedSabanaFormulas[conKey1].evaluatedValue;
          } else if (resolvedSabanaFormulas[conKey2]?.evaluatedValue !== undefined) {
            pvp = resolvedSabanaFormulas[conKey2].evaluatedValue;
          } else if (resolvedSabanaFormulas[sinKey1]?.evaluatedValue !== undefined) {
            pvp = round3(resolvedSabanaFormulas[sinKey1].evaluatedValue * 1.21);
          } else if (resolvedSabanaFormulas[sinKey2]?.evaluatedValue !== undefined) {
            pvp = round3(resolvedSabanaFormulas[sinKey2].evaluatedValue * 1.21);
          }

          appendRowIfActive(
            95 + idx,
            st.id,
            1,
            validFrom,
            validFinal,
            pvp,
            st.name,
            'MENSUAL',
            tariffName
          );
        });
      });
    }
  } catch (e) {}

  return rows;
}

export function downloadImportacionXlsx(
  selectedDate: string,
  userValidFrom?: string,
  userFinalDate?: string,
  customRows?: (string | number | null)[][]
) {
  const rows = customRows && customRows.length > 0
    ? customRows
    : buildImportacionTable(selectedDate, userValidFrom, userFinalDate);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Anchos de columnas ajustados profesionalmente
  ws['!cols'] = [
    { wch: 8 },  // CodeA
    { wch: 12 }, // ESTACION ID
    { wch: 10 }, // PRODUCTO
    { wch: 12 }, // INICIAL
    { wch: 12 }, // FINAL
    { wch: 12 }, // PVP
    { wch: 26 }, // ESTACION NOMBRE
    { wch: 12 }, // PAGO
    { wch: 24 }, // TARIFA
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'IMPORTACION');

  const filename = `IMPORTACION_EFI_${selectedDate}.xlsx`;
  downloadWorkbookAsXlsx(wb, filename);
}

export function downloadImportacionCsv(
  selectedDate: string,
  userValidFrom?: string,
  userFinalDate?: string,
  customRows?: (string | number | null)[][]
) {
  const rows = customRows && customRows.length > 0
    ? customRows
    : buildImportacionTable(selectedDate, userValidFrom, userFinalDate);
  const csvLines = rows.map((row) =>
    row.map((val) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'number') {
        return val.toFixed(3).replace('.', ',');
      }
      return String(val);
    }).join(';')
  );
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvLines.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `IMPORTACION_EFI_${selectedDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
