import * as XLSX from 'xlsx';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS, OFFICIAL_SUGGESTED_SALE_PRICES } from './dataSeed';
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
    const transfer = round3(compra + 0.017);
    const transConIva = round3(transfer * 1.21);
    const posteGb = round3((compra + 0.035) * 1.21);
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
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al generar XLSX:', err);
    XLSX.writeFile(wb, filename);
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
  { id: 67, name: 'SANCTI-SPIRITUS', isZero: true },
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
}

export const IMPORT_TARIFF_METADATA: ImportTariffDef[] = [
  { codeA: 6, name: 'TARIFA 12', key: '12', prod: 1, markup: 0.012 },
  { codeA: 24, name: 'TARIFA 18', key: '18', prod: 1, markup: 0.018 },
  { codeA: 8, name: 'TARIFA 24', key: '24', prod: 1, markup: 0.024 },
  { codeA: 3, name: 'TARIFA 36', key: '36', prod: 1, markup: 0.036 },
  { codeA: 45, name: 'TARIFA 40', key: '40', prod: 1, markup: 0.040 },
  { codeA: 39, name: 'TARIFA 42', key: '42', prod: 1, markup: 0.042 },
  { codeA: 5, name: 'TARIFA 47', key: '47', prod: 1, markup: 0.047 },
  { codeA: 4, name: 'TARIFA 50', key: '50', prod: 1, markup: 0.060 },
  { codeA: 9, name: 'TARIFA 60', key: '60', prod: 1, markup: 0.080 },
  { codeA: 42, name: 'TARIFA 85', key: 'miki', prod: 1, markup: 0.090 },
  { codeA: 50, name: 'TARIFA CARRERAS', key: 'carreras', prod: 1, markup: 0.024 },
  { codeA: 85, name: 'TARIFA JAVI', key: 'javi', prod: 1, markup: 0.024 },
  { codeA: 65, name: 'TARIFA TRANSFRIRED', key: 'transfrired', prod: 1, markup: 0.024 },
  { codeA: 62, name: 'TARIFA ESPECIAL GENERAL', key: 'c0', prod: 1, markup: 0.024 },
  { codeA: 31, name: 'TARIFA ROR', key: 'ror', prod: 1, markup: 0.024 },
  { codeA: 7, name: 'TARIFA ESTEBAN', key: 'esteban', prod: 1, markup: 0.024 },
  // Bloque 17 especial (Gasolina Bronco + Gasóleo B) se inserta aquí
  { codeA: 61, name: 'TARIFA ECOTRANS', key: 'ecotrans', prod: 1, markup: 0.050 },
  { codeA: 86, name: 'TARIFA 30', key: 't30', prod: 1, markup: 0.030 },
  { codeA: 87, name: 'TARIFA 27 SUR', key: 't27', prod: 1, markup: 0.027 },
  { codeA: 88, name: 'TARIFA 15 SUR', key: 't15', prod: 1, markup: 0.015 },
  { codeA: 89, name: 'TARIFA NUEVA', key: 't75', prod: 1, markup: 0.038 },
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
    } catch (e) {}
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
      const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
      const row = specialRates.find((r) => {
        const rNorm = r.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
        return rNorm === cleanTarget || rNorm.includes(cleanTarget) || cleanTarget.includes(rNorm);
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
      const cleanTarget = stName.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
      const row = specialRates.find((r) => {
        const rNorm = r.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').trim();
        return rNorm === cleanTarget || rNorm.includes(cleanTarget) || cleanTarget.includes(rNorm);
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

      const base = getStationBasePrice(sabanaName);
      const defaultSinIva = round3(base + (tDef.markup ?? 0.024));
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

  const rows: (string | number | null)[][] = [];

  // Fila 1: Encabezado idéntico a hoja IMPORTACION
  rows.push(['', 'ESTACION', 'PRODUCTO', 'INICIAL', 'FINAL', 'PVP', 'ESTACION', 'PAGO', 'TARIFA']);

  // Bloques 1 a 16 (T12 a ESTEBAN)
  const first16 = IMPORT_TARIFF_METADATA.slice(0, 16);
  first16.forEach((tDef) => {
    IMPORT_STATIONS_56.forEach((st) => {
      const pvp = getPvpConIva(st, tDef);
      rows.push([tDef.codeA, st.id, tDef.prod, validFrom, validFinal, pvp, st.name, 'MENSUAL', tDef.name]);
    });
    // Fila vacía separadora
    rows.push([null, null, null, null, null, null, null, null, null]);
  });

  // Bloque 17: Bloque especial (3 filas Gasolina Bronco Prod 2 + 3 filas Gasóleo B Transfrired Prod 5)
  const broncoConIva = parseNum(broncoData.conIva) || 1.690;
  const gasoleoBConIva = 1.32858; // Precio estándar Transfrired Gasóleo B con IVA

  // 17.1 Gasolina Bronco (Torrejón, Madrid, Vallecas)
  rows.push([5, 73, 2, validFrom, validFinal, broncoConIva, 'TORREJON ', 'MENSUAL', 'TARIFA 45 GASOLINA']);
  rows.push([5, 2, 2, validFrom, validFinal, broncoConIva, 'MADRID', 'MENSUAL', 'TARIFA 45 GASOLINA']);
  rows.push([5, 55, 2, validFrom, validFinal, broncoConIva, 'VALLECAS ', 'MENSUAL', 'TARIFA 45 GASOLINA']);

  // 17.2 Gasóleo B Transfrired (Torremocha, Uclés, Arcos Jalón)
  rows.push([65, 1, 5, validFrom, validFinal, gasoleoBConIva, 'TORREMOCHA ', null, 'TRANFIRRED GOB']);
  rows.push([65, 27, 5, validFrom, validFinal, gasoleoBConIva, 'UCLES', null, 'TRANFIRRED GOB']);
  rows.push([65, 19, 5, validFrom, validFinal, gasoleoBConIva, 'ARCOS JALON', null, 'TRANFIRRED GOB']);

  // Fila vacía separadora
  rows.push([null, null, null, null, null, null, null, null, null]);

  // Bloques 18 a 22 (ECOTRANS, TARIFA 30, 27 SUR, 15 SUR, TARIFA NUEVA)
  const remainingTariffs = IMPORT_TARIFF_METADATA.slice(16);
  remainingTariffs.forEach((tDef, idx) => {
    IMPORT_STATIONS_56.forEach((st) => {
      const pvp = getPvpConIva(st, tDef);
      rows.push([tDef.codeA, st.id, tDef.prod, validFrom, validFinal, pvp, st.name, 'MENSUAL', tDef.name]);
    });
    // Separador entre bloques salvo después del último
    if (idx < remainingTariffs.length - 1) {
      rows.push([null, null, null, null, null, null, null, null, null]);
    }
  });

  return rows;
}

export function downloadImportacionXlsx(
  selectedDate: string,
  userValidFrom?: string,
  userFinalDate?: string
) {
  const rows = buildImportacionTable(selectedDate, userValidFrom, userFinalDate);
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
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al descargar XLSX de IMPORTACION:', err);
    XLSX.writeFile(wb, filename);
  }
}

export function downloadImportacionCsv(
  selectedDate: string,
  userValidFrom?: string,
  userFinalDate?: string
) {
  const rows = buildImportacionTable(selectedDate, userValidFrom, userFinalDate);
  const csvLines = rows.map((row) =>
    row.map((val) => (val === null || val === undefined ? '' : String(val))).join(';')
  );
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvLines.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `IMPORTACION_EFI_${selectedDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
