import * as XLSX from 'xlsx';
import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS } from './dataSeed';

export interface PurchaseRowValues {
  prev: string;
  curr: string;
  clh: string;
  porte: string;
  pase: string;
  fin: string;
  prevSale: string;
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

export function generateAndDownloadCierreWorkbook(
  selectedDate: string,
  validFromDate: string,
  purchases: Record<string, PurchaseRowValues>,
  specialRates: SpecialStationRateRow[]
) {
  const wb = XLSX.utils.book_new();

  // 1. HOJA: CALCULO INICIAL
  const calculoRows: any[][] = [];
  calculoRows.push(['AREA 117 - CIERRE DIARIO Y CALCULO INICIAL DE COMPRAS']);
  calculoRows.push(['Fecha Emision:', selectedDate, 'Precios Validos A Partir De:', validFromDate]);
  calculoRows.push(['Aviso:', 'Cierre diario oficial consolidado para Compras, Postes, Sabana de Precios, PDFs y Clientes, EFI Export']);
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
        act = item.isCustomSale && item.sale ? parseNum(item.sale) : cTotal;
      }
      if (!act || act === 0) {
        const costs = STATION_EXCEL_COSTS[row.name];
        act = costs ? round3(costs.defaultCurr + costs.porte + costs.pase + costs.fin) : 1.230;
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
