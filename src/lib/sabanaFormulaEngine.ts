import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS, OFFICIAL_SUGGESTED_SALE_PRICES } from "./dataSeed";
import { getAllStations, getStationExcelCosts } from "./stationsService";

export interface CellFormula {
  rawFormula: string;
  evaluatedValue: number;
  updatedAt: string;
  description?: string;
}

export interface ProgramCellVariable {
  token: string;
  windowId: "compras" | "postes" | "especial" | "sabana" | "bronco";
  windowName: string;
  groupName: string;
  stationName?: string;
  fieldLabel: string;
  currentValue: number;
}

const round3 = (val: number): number => Math.round(val * 1000) / 1000;

const parseNum = (val: any): number => {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = val.toString().replace(",", ".").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export function getProgramVariables(
  selectedDate: string,
  livePurchases?: Record<string, any>,
  liveSpecialRates?: any[],
  liveSabanaFormulas?: Record<string, CellFormula>
): {
  list: ProgramCellVariable[];
  map: Record<string, number>;
} {
  const list: ProgramCellVariable[] = [];
  const map: Record<string, number> = {};

  const addVar = (
    windowId: ProgramCellVariable["windowId"],
    windowName: string,
    groupName: string,
    token: string,
    fieldLabel: string,
    currentValue: number,
    stationName?: string
  ) => {
    const val = round3(currentValue);
    list.push({
      token,
      windowId,
      windowName,
      groupName,
      stationName,
      fieldLabel,
      currentValue: val,
    });
    map[token] = val;
    map[token.toUpperCase()] = val;
  };

  // 1. COMPRAS
  let purchasesData: Record<string, any> = {};
  if (livePurchases && typeof livePurchases === "object" && Object.keys(livePurchases).length > 0) {
    purchasesData = livePurchases;
  } else {
    try {
      const sDate = localStorage.getItem("efi_purchases_" + selectedDate);
      const sGlob = localStorage.getItem("efi_compras_data");
      if (sDate) purchasesData = JSON.parse(sDate).data || {};
      else if (sGlob) purchasesData = JSON.parse(sGlob).data || {};
    } catch (e) {}
  }

  // Tarifas Especiales (Compras)
  let specialRates: any[] = [];
  if (Array.isArray(liveSpecialRates) && liveSpecialRates.length > 0) {
    specialRates = liveSpecialRates;
  } else {
    try {
      const sp = localStorage.getItem("efi_special_rates_b50_f82_v4") || localStorage.getItem("efi_special_rates_b50_f82_v3");
      if (sp) specialRates = JSON.parse(sp);
    } catch (e) {}
  }

  const allStations = typeof window !== 'undefined' ? getAllStations() : [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];
  const stationCosts = typeof window !== 'undefined' ? getStationExcelCosts() : STATION_EXCEL_COSTS;
  allStations.forEach((st) => {
    const keyGoa = st.name + "_GOA";
    const itemGoa = purchasesData[keyGoa];
    const costs = stationCosts[st.name] || {
      porte: 0.005,
      pase: 0.01,
      fin: 0.01,
      defaultPrev: 1.2,
      defaultCurr: 1.2,
    };

    const currGoa = itemGoa ? parseNum(itemGoa.curr) : costs.defaultCurr;
    const porte = itemGoa ? parseNum(itemGoa.porte) : costs.porte;
    const pase = itemGoa ? parseNum(itemGoa.pase) : costs.pase;
    const fin = itemGoa ? parseNum(itemGoa.fin) : costs.fin;
    const totalCostGoa = round3(currGoa + porte + pase + fin);
    const cleanTarget = st.name.toUpperCase().replace(/^ES\s+/, '').trim();
    const defaultSug = OFFICIAL_SUGGESTED_SALE_PRICES[st.name] ?? OFFICIAL_SUGGESTED_SALE_PRICES[cleanTarget] ?? totalCostGoa;
    const pVentaGoa = itemGoa?.sale ? parseNum(itemGoa.sale) : defaultSug;
    const pAntGoa = itemGoa ? parseNum(itemGoa.prev) : costs.defaultPrev;

    const group = st.type === "PROPIA" ? "Estaciones Propias" : "Estaciones Colaboradoras";
    const normName = st.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

    addVar("compras", "Compras", group, "COMPRAS:" + normName + ":COSTO_TOTAL", "Costo Total GOA (" + st.name + ")", totalCostGoa, st.name);
    addVar("compras", "Compras", group, "COMPRAS:" + normName + ":P_VENTA", "P. Venta Sugerido GOA (" + st.name + ")", pVentaGoa, st.name);
    addVar("compras", "Compras", group, "COMPRAS:" + normName + ":COMPRA_HOY", "Precio Compra Hoy (" + st.name + ")", currGoa, st.name);
    addVar("compras", "Compras", group, "COMPRAS:" + normName + ":P_ANT_COMPRA", "P. Ant. Compra (" + st.name + ")", pAntGoa, st.name);
    addVar("compras", "Compras", group, "COMPRAS:" + normName + ":PORTE", "Porte (R) (" + st.name + ")", porte, st.name);
    addVar("compras", "Compras", group, "COMPRAS:" + normName + ":PASE", "Pase (S) (" + st.name + ")", pase, st.name);
    addVar("compras", "Compras", group, "COMPRAS:" + normName + ":FINANCIACION", "Financiacion (T) (" + st.name + ")", fin, st.name);

    // Gasolina 95
    const keyGas = st.name + "_GASOLINA";
    const itemGas = purchasesData[keyGas];
    const currGas = itemGas ? parseNum(itemGas.curr) : costs.defaultCurr + 0.12;
    const totalCostGas = round3(currGas + porte + pase + fin);
    const pVentaGas = itemGas?.isCustomSale && itemGas.sale ? parseNum(itemGas.sale) : totalCostGas;
    addVar("compras", "Compras", group, "COMPRAS:" + normName + ":GASOLINA_COSTO", "Costo Total Gasolina 95 (" + st.name + ")", totalCostGas, st.name);
    addVar("compras", "Compras", group, "COMPRAS:" + normName + ":GASOLINA_VENTA", "P. Venta Sugerido Gasolina (" + st.name + ")", pVentaGas, st.name);
  });

  // 2. GASOLINA BRONCO
  let broncoData: any = {
    sinIva: "1.397",
    conIva: "1.690",
    beneficio: "0.034",
    compra: "1.348",
  };
  try {
    const bDate = localStorage.getItem("efi_purchases_bronco_" + selectedDate);
    const bGlob = localStorage.getItem("efi_compras_gasolina_bronco");
    if (bDate) broncoData = JSON.parse(bDate);
    else if (bGlob) broncoData = JSON.parse(bGlob);
  } catch (e) {}

  addVar("bronco", "Gasolina Bronco", "Cuadro Especial Bronco", "BRONCO:CON_IVA", "Bronco Con IVA", parseNum(broncoData.conIva));
  addVar("bronco", "Gasolina Bronco", "Cuadro Especial Bronco", "BRONCO:SIN_IVA", "Bronco Sin IVA", parseNum(broncoData.sinIva));
  addVar("bronco", "Gasolina Bronco", "Cuadro Especial Bronco", "BRONCO:COMPRA", "Bronco Compra", parseNum(broncoData.compra));
  addVar("bronco", "Gasolina Bronco", "Cuadro Especial Bronco", "BRONCO:BENEFICIO", "Bronco Beneficio", parseNum(broncoData.beneficio));

  // 3. POSTES
  let postesStorage: any = {};
  try {
    const s = localStorage.getItem("efi_postes_data_v2");
    if (s) postesStorage = JSON.parse(s);
  } catch (e) {}

  let postesFormulas: Record<string, CellFormula> = {};
  try {
    const pfDate = localStorage.getItem(`efi_postes_custom_formulas_${selectedDate}`);
    const pfGlob = localStorage.getItem('efi_postes_custom_formulas_global');
    if (pfDate) postesFormulas = JSON.parse(pfDate) || {};
    else if (pfGlob) postesFormulas = JSON.parse(pfGlob) || {};
  } catch (e) {}

  const defaultPostesProp: Record<string, { goa: number; gas: number; gain: number }> = {
    "ARCOS": { goa: 1.702, gas: 0, gain: 0 },
    "ALCUBILLAS": { goa: 1.799, gas: 1.799, gain: 0.271 },
    "ALFAJARIN": { goa: 1.799, gas: 1.799, gain: 0.271 },
    "TORREMOCHA": { goa: 1.799, gas: 1.799, gain: 0.272 },
    "UCLES": { goa: 1.799, gas: 1.799, gain: 0.284 },
    "VALLECAS": { goa: 1.699, gas: 1.739, gain: 0.212 },
    "MADRID": { goa: 1.749, gas: 1.739, gain: 0.212 },
    "VALDEMORO": { goa: 1.649, gas: 1.649, gain: 0.122 },
    "BENAMEJI": { goa: 1.839, gas: 1.799, gain: 0.274 },
    "HUMILLADERO": { goa: 1.839, gas: 1.799, gain: 0.274 },
    "ES RIBA-ROJA": { goa: 1.659, gas: 1.689, gain: 0.340 },
    "ES PISTA DE SILLA": { goa: 1.659, gas: 1.689, gain: 0.340 },
    "ES REAL DE GANDIA": { goa: 1.680, gas: 1.689, gain: 0.340 },
  };

  Object.entries(defaultPostesProp).forEach(([stName, def]) => {
    const saved = postesStorage?.postes?.[stName];
    const rawGoa = saved?.goa ? parseNum(saved.goa) : def.goa;
    const goaFormula = postesFormulas[`POSTE_${stName}_GOA`];
    const goa = goaFormula ? goaFormula.evaluatedValue : rawGoa;

    const rawGas = saved?.gasolina ? parseNum(saved.gasolina) : def.gas;
    const gasFormula = postesFormulas[`POSTE_${stName}_GASOLINA`];
    const gas = gasFormula ? gasFormula.evaluatedValue : rawGas;

    const rawGain = saved?.gasolinaGain ? parseNum(saved.gasolinaGain) : def.gain;
    const gainFormula = postesFormulas[`POSTE_${stName}_MARGEN_GASOLINA`];
    const gain = gainFormula ? gainFormula.evaluatedValue : rawGain;

    const norm = stName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

    // Tarifa 60 con IVA y Margen GOA
    const t60ConIva = getSabanaTariff60ConIvaForStation(stName, selectedDate);
    const margenGoaFormula = postesFormulas[`POSTE_${stName}_MARGEN_GOA`];
    const margenGoa = margenGoaFormula ? margenGoaFormula.evaluatedValue : round3(t60ConIva - goa);

    const goaPremiumFormula = postesFormulas[`POSTE_${stName}_GOA_PREMIUM`];
    const goaPremium = goaPremiumFormula ? goaPremiumFormula.evaluatedValue : round3(goa + 0.04);

    addVar("postes", "Postes", "Postes Estaciones Propias", "POSTES:" + norm + ":POSTE_GOA", "Poste GOA (" + stName + ")", goa, stName);
    addVar("postes", "Postes", "Postes Estaciones Propias", "POSTES:" + norm + ":MARGEN_GOA", "Margen GOA (" + stName + ")", margenGoa, stName);
    addVar("postes", "Postes", "Postes Estaciones Propias", "POSTES:" + norm + ":GOA_PREMIUM", "GOA Premium (" + stName + ")", goaPremium, stName);
    addVar("postes", "Postes", "Postes Estaciones Propias", "POSTES:" + norm + ":T60_CON_IVA", "Tarifa 60 Con IVA (" + stName + ")", t60ConIva, stName);

    if (def.gas > 0 || gas > 0) {
      addVar("postes", "Postes", "Postes Estaciones Propias", "POSTES:" + norm + ":POSTE_GASOLINA", "Poste Gasolina (" + stName + ")", gas, stName);
      addVar("postes", "Postes", "Postes Estaciones Propias", "POSTES:" + norm + ":MARGEN_GASOLINA", "Margen Gasolina (" + stName + ")", gain, stName);
    }
  });

  // HVO
  const hvoBase = postesStorage?.hvoGeneralBase ? parseNum(postesStorage.hvoGeneralBase) : 1.285;
  const hvoAdd = postesStorage?.hvoGeneralAddition ? parseNum(postesStorage.hvoGeneralAddition) : 0.243;
  const hvoSinIva = round3(hvoBase + hvoAdd);
  const hvoConIva = round3(hvoSinIva * 1.21);
  const hvoAlfaSinIva = postesStorage?.hvoAlfajarinSinIva && parseNum(postesStorage.hvoAlfajarinSinIva) > 0 ? parseNum(postesStorage.hvoAlfajarinSinIva) : hvoSinIva;
  const hvoAlfaConIva = round3(hvoAlfaSinIva * 1.21);
  const valGoaPoste = defaultPostesProp["VALDEMORO"]?.goa || 1.649;
  const hvoValAdd = postesStorage?.hvoValdemoroAddition ? parseNum(postesStorage.hvoValdemoroAddition) : 0.07;
  const hvoValConIva = round3(valGoaPoste + hvoValAdd);
  const hvoValSinIva = round3(hvoValConIva / 1.21);

  addVar("postes", "Postes", "HVO", "POSTES:HVO_GENERAL_BASE", "HVO General Base Sin IVA", hvoBase);
  addVar("postes", "Postes", "HVO", "POSTES:HVO_GENERAL_ADD", "HVO General Monto Sumar", hvoAdd);
  addVar("postes", "Postes", "HVO", "POSTES:HVO_GENERAL_SIN_IVA", "HVO General Sin IVA", hvoSinIva);
  addVar("postes", "Postes", "HVO", "POSTES:HVO_GENERAL_CON_IVA", "HVO General Con IVA", hvoConIva);
  addVar("postes", "Postes", "HVO", "POSTES:HVO_ALFAJARIN_SIN_IVA", "HVO Alfajarin Sin IVA", hvoAlfaSinIva);
  addVar("postes", "Postes", "HVO", "POSTES:HVO_ALFAJARIN_CON_IVA", "HVO Alfajarin Con IVA", hvoAlfaConIva);
  addVar("postes", "Postes", "HVO", "POSTES:HVO_VALDEMORO_ADD", "HVO Valdemoro Monto Sumar", hvoValAdd);
  addVar("postes", "Postes", "HVO", "POSTES:HVO_VALDEMORO_CON_IVA", "HVO Valdemoro Con IVA", hvoValConIva);
  addVar("postes", "Postes", "HVO", "POSTES:HVO_VALDEMORO_SIN_IVA", "HVO Valdemoro Sin IVA", hvoValSinIva);

  // Gasoleo B
  const gasoleoBRows = postesStorage?.gasoleoBRows || {
    "UCLES": { compra: "1.0045", transfer: "1.0240", gob: "1.2886", poste: "1.2890" },
    "TORREMOCHA": { compra: "1.0045", transfer: "1.0240", gob: "1.2886", poste: "1.2890" },
    "ARCOS": { compra: "1.0045", transfer: "1.0240", gob: "1.2886", poste: "1.2890" },
  };

  Object.entries(gasoleoBRows).forEach(([stName, row]: [string, any]) => {
    const norm = stName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const compraNum = parseNum(row.compra);
    const transferNum = row.transfer && row.transfer.trim() !== '' ? parseNum(row.transfer) : round3(compraNum + 0.017);
    const transConIva = round3(transferNum * 1.21);
    addVar("postes", "Postes", "Gasoleo B", "POSTES:" + norm + ":GOB_COMPRA", "Gasoleo B Compra (" + stName + ")", compraNum, stName);
    addVar("postes", "Postes", "Gasoleo B", "POSTES:" + norm + ":GOB_TRANSFRIRED", "Gasoleo B Transfrired (" + stName + ")", transferNum, stName);
    addVar("postes", "Postes", "Gasoleo B", "POSTES:" + norm + ":GOB_TRANSFRIRED_CON_IVA", "Gasoleo B Transfrired Con IVA (" + stName + ")", transConIva, stName);
    addVar("postes", "Postes", "Gasoleo B", "POSTES:" + norm + ":GOB_POSTE", "Gasoleo B Poste (" + stName + ")", parseNum(row.poste), stName);
  });

  // AdBlue (10 Estaciones Clave)
  const adblueRows = postesStorage?.adblue || {
    'TORREJON': { compra: '0.536', poste: '0.849' },
    'ARCOS JALON': { compra: '0.265', poste: '0.749' },
    'ALFAJARIN': { compra: '0.400', poste: '0.849' },
    'TORREMOCHA': { compra: '0.265', poste: '0.749' },
    'MADRID': { compra: '0.536', poste: '0.849' },
    'VALLECAS': { compra: '0.619', poste: '0.849' },
    'HUMILLADERO': { compra: '0.577', poste: '0.790' },
    'UCLES': { compra: '0.300', poste: '0.799' },
    'BENAMEJI': { compra: '0.536', poste: '0.799' },
    'SORIA ALCUBILLAS': { compra: '0.255', poste: '0.849' },
  };

  Object.entries(adblueRows).forEach(([stName, data]: [string, any]) => {
    const norm = stName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const cNum = parseNum(data.compra);
    const pNum = parseNum(data.poste);
    addVar("postes", "Postes", "AdBlue", "POSTES:" + norm + ":ADBLUE_COMPRA", "AdBlue Compra (" + stName + ")", cNum, stName);
    addVar("postes", "Postes", "AdBlue", "POSTES:" + norm + ":ADBLUE_POSTE", "AdBlue Poste (" + stName + ")", pNum, stName);
  });

  // Gases y Energías Alternativas
  const gasesStorage = postesStorage?.gases || {
    'GLP / Autogas': { sinIva: '0.785', poste: '0.949' },
    'GNC (Gas Natural Comprimido)': { sinIva: '0.950', poste: '1.149' },
    'GNL (Gas Natural Licuado)': { sinIva: '0.890', poste: '1.079' },
  };
  Object.entries(gasesStorage).forEach(([gasName, data]: [string, any]) => {
    let shortName = 'GLP';
    if (gasName.includes('GNC')) shortName = 'GNC';
    else if (gasName.includes('GNL')) shortName = 'GNL';
    const sNum = parseNum(data.sinIva);
    const cNum = round3(sNum * 1.21);
    const pNum = parseNum(data.poste);
    addVar("postes", "Postes", "Gases", `POSTES:${shortName}:SIN_IVA`, `${shortName} Sin IVA`, sNum);
    addVar("postes", "Postes", "Gases", `POSTES:${shortName}:CON_IVA`, `${shortName} Con IVA (21%)`, cNum);
    addVar("postes", "Postes", "Gases", `POSTES:${shortName}:POSTE`, `${shortName} Poste`, pNum);
  });

  // Bronco
  const postesBroncoData = postesStorage?.bronco || {
    sinIva: '1.305',
    conIva: '1.579',
    beneficio: '0.048',
    compra: '1.242',
  };
  const bSinIva = parseNum(postesBroncoData.sinIva);
  const bConIva = parseNum(postesBroncoData.conIva);
  const bCompra = parseNum(postesBroncoData.compra);
  const bBeneficio = parseNum(postesBroncoData.beneficio);
  addVar("postes", "Postes", "Gasolina Bronco", "POSTES:BRONCO:SIN_IVA", "Gasolina Bronco Sin IVA", bSinIva);
  addVar("postes", "Postes", "Gasolina Bronco", "POSTES:BRONCO:CON_IVA", "Gasolina Bronco Con IVA", bConIva);
  addVar("postes", "Postes", "Gasolina Bronco", "POSTES:BRONCO:COMPRA", "Gasolina Bronco Compra", bCompra);
  addVar("postes", "Postes", "Gasolina Bronco", "POSTES:BRONCO:BENEFICIO", "Gasolina Bronco Beneficio", bBeneficio);

  addVar("bronco", "Gasolina Bronco", "Gasolina Bronco", "BRONCO:SIN_IVA", "Gasolina Bronco Sin IVA", bSinIva);
  addVar("bronco", "Gasolina Bronco", "Gasolina Bronco", "BRONCO:CON_IVA", "Gasolina Bronco Con IVA", bConIva);
  addVar("bronco", "Gasolina Bronco", "Gasolina Bronco", "BRONCO:COMPRA", "Gasolina Bronco Compra", bCompra);
  addVar("bronco", "Gasolina Bronco", "Gasolina Bronco", "BRONCO:BENEFICIO", "Gasolina Bronco Beneficio", bBeneficio);

  // 4. TARIFAS ESPECIALES (B50:F82 en Compras)
  allStations.forEach((st) => {
    const cleanTarget = st.name.toUpperCase().replace(/^ES\s+/, '').trim();
    const norm = st.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

    // Default values if no special row
    const keyGoa = st.name + "_GOA";
    const itemGoa = purchasesData[keyGoa];
    const costs = STATION_EXCEL_COSTS[st.name] || {
      porte: 0.005,
      pase: 0.01,
      fin: 0.01,
      defaultPrev: 1.2,
      defaultCurr: 1.2,
    };
    const currGoa = itemGoa ? parseNum(itemGoa.curr) : costs.defaultCurr;
    const totalCostGoa = round3(currGoa + costs.porte + costs.pase + costs.fin);
    const defaultSug = OFFICIAL_SUGGESTED_SALE_PRICES[st.name] ?? OFFICIAL_SUGGESTED_SALE_PRICES[cleanTarget] ?? totalCostGoa;
    const pVentaGoa = itemGoa?.sale ? parseNum(itemGoa.sale) : defaultSug;

    let actualVal = pVentaGoa;
    let refVal = round3(pVentaGoa + 0.008);
    let baseVal = totalCostGoa;

    const normSt = st.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    const stCleanId = st.name.toLowerCase().replace(/^es\s+/, '').replace(/[^a-z0-9]/g, '');

    if (Array.isArray(specialRates)) {
      const matchSpecial = specialRates.find((r) => {
        if (!r || !r.name) return false;
        const rNorm = r.name.toUpperCase().replace(/^ES\s+/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
        if (rNorm === normSt || rNorm.includes(normSt) || normSt.includes(rNorm)) return true;
        const rId = (r.id || '').toLowerCase().replace(/[-_]/g, '');
        if (rId && stCleanId && (rId === stCleanId || rId.includes(stCleanId) || stCleanId.includes(rId))) return true;
        return false;
      });
      if (matchSpecial) {
        if (matchSpecial.actualPrice && parseNum(matchSpecial.actualPrice) > 0) {
          actualVal = parseNum(matchSpecial.actualPrice);
        }
        if (matchSpecial.refPrice && parseNum(matchSpecial.refPrice) > 0) {
          refVal = parseNum(matchSpecial.refPrice);
        } else if (actualVal > 0) {
          refVal = round3(actualVal + 0.008);
        }
        if (matchSpecial.basePrice && parseNum(matchSpecial.basePrice) > 0) {
          baseVal = parseNum(matchSpecial.basePrice);
        }
      }
    }

    addVar("especial", "Tarifas Especiales", "Tarifas Especiales B50:F82", "ESPECIAL:" + norm + ":ACTUAL", "Precio Actual / Especial (" + st.name + ")", actualVal, st.name);
    addVar("especial", "Tarifas Especiales", "Tarifas Especiales B50:F82", "ESPECIAL:" + norm + ":REF", "Precio Referencia (" + st.name + ")", refVal, st.name);
    addVar("especial", "Tarifas Especiales", "Tarifas Especiales B50:F82", "ESPECIAL:" + norm + ":BASE", "Precio Base / Coste (" + st.name + ")", baseVal, st.name);

    const cleanNorm = cleanTarget.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    if (cleanNorm && cleanNorm !== norm) {
      map["ESPECIAL:" + cleanNorm + ":ACTUAL"] = actualVal;
      map["ESPECIAL:" + cleanNorm + ":REF"] = refVal;
      map["ESPECIAL:" + cleanNorm + ":BASE"] = baseVal;
    }
  });

  // 5. SABANA DE PRECIOS
  let sabanaFormulas: Record<string, CellFormula> = {};
  if (liveSabanaFormulas && typeof liveSabanaFormulas === "object") {
    sabanaFormulas = liveSabanaFormulas;
  } else {
    sabanaFormulas = loadSabanaFormulas(selectedDate);
  }

  const standardTariffDefs = [
    { id: '12', markup: 0.012 },
    { id: '18', markup: 0.018 },
    { id: '24', markup: 0.024 },
    { id: '36', markup: 0.036 },
    { id: '40', markup: 0.040 },
    { id: '42', markup: 0.042 },
    { id: '47', markup: 0.047 },
    { id: '50', markup: 0.060 },
    { id: '60', markup: 0.080 },
  ];

  allStations.forEach((st) => {
    const group = st.type === "PROPIA" ? "Sábana - Estaciones Propias" : "Sábana - Estaciones Colaboradoras";
    const normName = st.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

    const cleanTarget = st.name.toUpperCase().replace(/^ES\s+/, '').trim();
    const costs = STATION_EXCEL_COSTS[st.name] || {
      porte: 0.005,
      pase: 0.01,
      fin: 0.01,
      defaultPrev: 1.2,
      defaultCurr: 1.2,
    };
    const keyGoa = st.name + "_GOA";
    const itemGoa = purchasesData[keyGoa];
    const currGoa = itemGoa ? parseNum(itemGoa.curr) : costs.defaultCurr;
    const totalCostGoa = round3(currGoa + costs.porte + costs.pase + costs.fin);
    const defaultSug = OFFICIAL_SUGGESTED_SALE_PRICES[st.name] ?? OFFICIAL_SUGGESTED_SALE_PRICES[cleanTarget] ?? totalCostGoa;
    const pVentaGoa = itemGoa?.sale ? parseNum(itemGoa.sale) : defaultSug;

    // 5.1 Tarifas Estándar (12 a 60)
    standardTariffDefs.forEach((td) => {
      const stdSinKey = `STD_${st.name}_T${td.id}_sinIva`;
      const stdConKey = `STD_${st.name}_T${td.id}_conIva`;
      const legSinKey = `TAR_${td.id}_${st.name}_sinIva`;
      const legConKey = `TAR_${td.id}_${st.name}_conIva`;

      let valSin = round3(pVentaGoa + td.markup);
      if (sabanaFormulas[stdSinKey]?.evaluatedValue !== undefined) valSin = sabanaFormulas[stdSinKey].evaluatedValue;
      else if (sabanaFormulas[legSinKey]?.evaluatedValue !== undefined) valSin = sabanaFormulas[legSinKey].evaluatedValue;

      let valCon = round3(valSin * 1.21);
      if (sabanaFormulas[stdConKey]?.evaluatedValue !== undefined) valCon = sabanaFormulas[stdConKey].evaluatedValue;
      else if (sabanaFormulas[legConKey]?.evaluatedValue !== undefined) valCon = sabanaFormulas[legConKey].evaluatedValue;

      addVar("sabana", "Sábana de Precios", group, `SABANA:${normName}:T${td.id}_SIN_IVA`, `T${td.id} Sin IVA (${st.name})`, valSin, st.name);
      addVar("sabana", "Sábana de Precios", group, `SABANA:${normName}:T${td.id}_CON_IVA`, `T${td.id} Con IVA (${st.name})`, valCon, st.name);

      // Register raw keys in map
      map[stdSinKey] = valSin;
      map[stdSinKey.toUpperCase()] = valSin;
      map[stdConKey] = valCon;
      map[stdConKey.toUpperCase()] = valCon;
      map[legSinKey] = valSin;
      map[legSinKey.toUpperCase()] = valSin;
    });

    // 5.2 Helper para registrar tarifas especiales de Sábana
    const registerSpecialSabana = (
      blockId: string,
      tariffName: string,
      tokenName: string,
      labelName: string,
      defaultMarkup: number
    ) => {
      const sinKey = `SPEC_${blockId}_${st.name}_${tariffName}_sinIva`;
      const conKey = `SPEC_${blockId}_${st.name}_${tariffName}_conIva`;

      let valSin = round3(pVentaGoa + defaultMarkup);
      if (sabanaFormulas[sinKey]?.evaluatedValue !== undefined) valSin = sabanaFormulas[sinKey].evaluatedValue;

      let valCon = round3(valSin * 1.21);
      if (sabanaFormulas[conKey]?.evaluatedValue !== undefined) valCon = sabanaFormulas[conKey].evaluatedValue;

      addVar("sabana", "Sábana de Precios", group, `SABANA:${normName}:${tokenName}_SIN_IVA`, `${labelName} Sin IVA (${st.name})`, valSin, st.name);
      addVar("sabana", "Sábana de Precios", group, `SABANA:${normName}:${tokenName}_CON_IVA`, `${labelName} Con IVA (${st.name})`, valCon, st.name);

      map[sinKey] = valSin;
      map[sinKey.toUpperCase()] = valSin;
      map[conKey] = valCon;
      map[conKey.toUpperCase()] = valCon;
    };

    registerSpecialSabana('los_javi', 'Especial Javi', 'JAVI', 'Especial Javi', 0.024);
    registerSpecialSabana('los_javi', 'Especial Carreras', 'CARRERAS', 'Especial Carreras', 0.018);
    registerSpecialSabana('transfrired', 'Especial Transfrired', 'TRANSFRIRED', 'Especial Transfrired', 0.024);
    registerSpecialSabana('c0_general', 'Especial General C-0', 'C0', 'Especial General C-0', 0.024);
    registerSpecialSabana('ror_esteban', 'Especial ROR', 'ROR', 'Especial ROR', 0.024);
    registerSpecialSabana('ror_esteban', 'Especial Esteban', 'ESTEBAN', 'Especial Esteban', 0.024);
    registerSpecialSabana('miki_ecotrans_tarifa30', 'Tarifa 90 Miki', 'MIKI', 'Tarifa 90 Miki', 0.090);
    registerSpecialSabana('miki_ecotrans_tarifa30', 'Tarifa ECOTRANS', 'ECOTRANS', 'Tarifa ECOTRANS', 0.050);
    registerSpecialSabana('miki_ecotrans_tarifa30', 'Tarifa 30', 'T30', 'Tarifa 30', 0.030);
    registerSpecialSabana('sur_benito', 'Tarifa 27 Sur', 'T27_SUR', 'Tarifa 27 Sur', 0.027);
    registerSpecialSabana('sur_benito', 'Tarifa 15 Sur', 'T15_SUR', 'Tarifa 15 Sur', 0.015);
    registerSpecialSabana('tarifa_75', 'Tarifa 75', 'T75', 'Tarifa 75', 0.038);
  });

  // Also include any other arbitrary custom formulas in map
  Object.entries(sabanaFormulas).forEach(([k, v]) => {
    if (v && typeof v.evaluatedValue === 'number' && !map[k]) {
      map[k] = v.evaluatedValue;
      map[k.toUpperCase()] = v.evaluatedValue;
    }
  });

  Object.entries(postesFormulas).forEach(([k, v]) => {
    if (v && typeof v.evaluatedValue === 'number') {
      map[k] = v.evaluatedValue;
      map[k.toUpperCase()] = v.evaluatedValue;
    }
  });

  return { list, map };
}

export function evaluateFormula(
  rawInput: string,
  variablesMap: Record<string, number>,
  stationContext?: { stationName?: string }
): { success: boolean; value: number; error?: string } {
  if (!rawInput || rawInput.trim() === "") {
    return { success: false, value: 0, error: "Fórmula vacía" };
  }

  const trimmed = rawInput.trim();

  // Si es un número puro directo (ej: "1.450" o "1,450")
  if (!trimmed.startsWith("=") && /^-?[0-9]+([.,][0-9]+)?$/.test(trimmed)) {
    const directNum = parseNum(trimmed);
    if (!isNaN(directNum) && isFinite(directNum)) {
      return { success: true, value: round3(directNum) };
    }
  }

  // Quitar el "=" inicial si existe
  let expression = trimmed.startsWith("=") ? trimmed.substring(1).trim() : trimmed;

  // Si hay contexto de estación, construir aliases locales para tokens relativos
  const localMap: Record<string, number> = { ...variablesMap };
  if (stationContext?.stationName) {
    const norm = stationContext.stationName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const cleanNorm = stationContext.stationName.toUpperCase().replace(/^ES\s+/, '').replace(/[^a-zA-Z0-9]/g, "_");
    for (const [k, v] of Object.entries(variablesMap)) {
      if (k.startsWith(`COMPRAS:${norm}:`)) {
        const shortK = k.replace(`COMPRAS:${norm}:`, '');
        localMap[shortK] = v;
      } else if (cleanNorm && k.startsWith(`COMPRAS:${cleanNorm}:`)) {
        const shortK = k.replace(`COMPRAS:${cleanNorm}:`, '');
        localMap[shortK] = v;
      } else if (k.startsWith(`SABANA:${norm}:`)) {
        const shortK = k.replace(`SABANA:${norm}:`, '');
        localMap[shortK] = v;
      } else if (cleanNorm && k.startsWith(`SABANA:${cleanNorm}:`)) {
        const shortK = k.replace(`SABANA:${cleanNorm}:`, '');
        localMap[shortK] = v;
      } else if (k.startsWith(`ESPECIAL:${norm}:`)) {
        const shortK = k.replace(`ESPECIAL:${norm}:`, '');
        localMap[shortK] = v;
        localMap[`ESPECIAL_${shortK}`] = v;
      } else if (cleanNorm && k.startsWith(`ESPECIAL:${cleanNorm}:`)) {
        const shortK = k.replace(`ESPECIAL:${cleanNorm}:`, '');
        localMap[shortK] = v;
        localMap[`ESPECIAL_${shortK}`] = v;
      } else if (k.startsWith(`POSTES:${norm}:`)) {
        const shortK = k.replace(`POSTES:${norm}:`, '');
        localMap[shortK] = v;
      } else if (cleanNorm && k.startsWith(`POSTES:${cleanNorm}:`)) {
        const shortK = k.replace(`POSTES:${cleanNorm}:`, '');
        localMap[shortK] = v;
      }
    }
  }

  // 1. Reemplazar tokens entre corchetes [TOKEN]
  const tokenRegex = /\[([^\]]+)\]/g;
  expression = expression.replace(tokenRegex, (match, tokenName) => {
    const cleanToken = tokenName.trim();
    if (localMap[cleanToken] !== undefined) {
      return localMap[cleanToken].toString();
    }
    const upperToken = cleanToken.toUpperCase();
    if (localMap[upperToken] !== undefined) {
      return localMap[upperToken].toString();
    }
    return "0";
  });

  // 2. Reemplazar tokens sin corchetes (ej: COMPRAS:TORREJON:P_VENTA o P_VENTA)
  const tokenKeys = Object.keys(localMap)
    .filter((k) => k.length >= 3 && !/^[0-9.]+$/.test(k))
    .sort((a, b) => b.length - a.length);

  for (const key of tokenKeys) {
    if (expression.includes(key)) {
      expression = expression.split(key).join(localMap[key].toString());
    }
  }

  // 3. Reemplazar comas decimales europeas por puntos
  expression = expression.replace(/,/g, ".");

  // 4. Soporte para porcentajes
  expression = expression.replace(/\+\s*21\s*%/g, "* 1.21");
  expression = expression.replace(/\-\s*21\s*%/g, "/ 1.21");
  expression = expression.replace(/([0-9.]+)\s*%/g, "($1 / 100)");

  // 5. Validación de seguridad estricta para evaluación matemática
  const safeMathRegex = /^[0-9+\-*/().\s^]+$/;
  if (!safeMathRegex.test(expression)) {
    return {
      success: false,
      value: 0,
      error: "La fórmula contiene caracteres no válidos o tokens desconocidos",
    };
  }

  try {
    const jsMath = expression.replace(/\^/g, "**");
    const fn = new Function("return (" + jsMath + ");");
    const result = fn();

    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      return { success: false, value: 0, error: "El resultado no es un número válido" };
    }

    return { success: true, value: round3(result) };
  } catch (err) {
    return {
      success: false,
      value: 0,
      error: "Error de sintaxis matemática en la fórmula",
    };
  }
}

export function reevaluateAllSabanaFormulas(
  formulas: Record<string, CellFormula>,
  selectedDate: string,
  livePurchases?: Record<string, any>,
  liveSpecialRates?: any[]
): Record<string, CellFormula> {
  if (!formulas || Object.keys(formulas).length === 0) return {};

  let current: Record<string, CellFormula> = { ...formulas };
  const allStations = typeof window !== 'undefined' ? getAllStations() : [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];

  // Ejecutar hasta 3 pasadas para resolver cadenas de dependencias entre celdas
  for (let pass = 0; pass < 3; pass++) {
    const { map } = getProgramVariables(selectedDate, livePurchases, liveSpecialRates, current);
    let anyChanged = false;

    for (const [cellKey, cellData] of Object.entries(current)) {
      if (!cellData || !cellData.rawFormula || cellData.rawFormula.trim() === '') continue;

      let stationName: string | undefined = undefined;
      for (const st of allStations) {
        if (cellKey.includes(st.name)) {
          stationName = st.name;
          break;
        }
      }

      const evalRes = evaluateFormula(cellData.rawFormula, map, { stationName });
      if (evalRes.success && Math.abs(evalRes.value - cellData.evaluatedValue) > 0.0001) {
        current[cellKey] = {
          ...cellData,
          evaluatedValue: evalRes.value,
        };
        anyChanged = true;
      }
    }

    if (!anyChanged) break;
  }

  return current;
}

export function loadSabanaFormulas(selectedDate: string): Record<string, CellFormula> {
  try {
    const sDate = localStorage.getItem("efi_sabana_custom_formulas_" + selectedDate);
    const sGlob = localStorage.getItem("efi_sabana_custom_formulas_global");
    if (sDate) {
      const parsed = JSON.parse(sDate);
      if (parsed && typeof parsed === "object") return parsed;
    }
    if (sGlob) {
      const parsed = JSON.parse(sGlob);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {}
  return {};
}

export function saveSabanaFormula(
  selectedDate: string,
  cellKey: string,
  formula: CellFormula
): Record<string, CellFormula> {
  const current = loadSabanaFormulas(selectedDate);
  const updated = {
    ...current,
    [cellKey]: {
      ...formula,
      updatedAt: new Date().toISOString(),
    },
  };

  try {
    localStorage.setItem("efi_sabana_custom_formulas_" + selectedDate, JSON.stringify(updated));
    localStorage.setItem("efi_sabana_custom_formulas_global", JSON.stringify(updated));
    window.dispatchEvent(new Event("efi_sabana_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {}

  return updated;
}

export function removeSabanaFormula(
  selectedDate: string,
  cellKey: string
): Record<string, CellFormula> {
  const current = loadSabanaFormulas(selectedDate);
  const updated = { ...current };
  delete updated[cellKey];

  try {
    localStorage.setItem("efi_sabana_custom_formulas_" + selectedDate, JSON.stringify(updated));
    localStorage.setItem("efi_sabana_custom_formulas_global", JSON.stringify(updated));
    window.dispatchEvent(new Event("efi_sabana_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {}

  return updated;
}

export function clearAllSabanaFormulas(selectedDate: string): void {
  try {
    localStorage.removeItem("efi_sabana_custom_formulas_" + selectedDate);
    localStorage.removeItem("efi_sabana_custom_formulas_global");
    window.dispatchEvent(new Event("efi_sabana_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {}
}

/**
 * Obtiene el precio CON IVA exacto de la TARIFA 60 de la Sábana de Precios para una estación dada.
 * Prioriza:
 * 1. Caché publicada de la tabla de tarifas estándar de Sábana de Precios.
 * 2. Evaluación de fórmulas personalizadas (fx) de la celda de T60 Con IVA o Sin IVA (* 1.21).
 * 3. Configuración de margen modificado o fuente personalizada.
 * 4. Cálculo estándar: (Precio Base Compras + Margen T60 [0.0800]) * 1.21.
 * Maneja equivalencias de nombres de estaciones (ej. ARCOS <-> ARCOS JALON, GANESHA MADRID <-> MADRID, etc.).
 */
let isEvaluatingT60 = false;

export function getSabanaTariff60ConIvaForStation(
  stName: string,
  selectedDate?: string
): number {
  if (typeof window === 'undefined') return 0;

  if (isEvaluatingT60) {
    // Protección contra recursión infinita: cálculo directo inmediato basado en costes
    const allCosts = typeof window !== 'undefined' ? getStationExcelCosts() : STATION_EXCEL_COSTS;
    const cost = allCosts[stName] || { defaultCurr: 1.2, porte: 0.005, pase: 0.01, fin: 0.01 };
    const base = Number((cost.defaultCurr + cost.porte + cost.pase + cost.fin).toFixed(3));
    return Number(((base + 0.08) * 1.21).toFixed(3));
  }

  isEvaluatingT60 = true;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    let activeDate = selectedDate || '';
    try {
      if (!activeDate) {
        activeDate = localStorage.getItem('efi_compras_valid_from') || todayStr;
      }
    } catch (e) {
      activeDate = todayStr;
    }

    // 1. Generar lista exhaustiva de nombres/alias para la estación
  const upper = stName.toUpperCase().trim();
  const clean = upper.replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
  const aliases = new Set<string>([upper, clean, `ES ${clean}`, `GANESHA ${clean}`]);

  if (clean === 'ARCOS' || clean === 'ARCOS JALON') {
    aliases.add('ARCOS');
    aliases.add('ARCOS JALON');
    aliases.add('ES ARCOS JALON');
  }
  if (clean === 'ALCUBILLAS' || clean === 'SORIA ALCUBILLAS') {
    aliases.add('ALCUBILLAS');
    aliases.add('SORIA ALCUBILLAS');
    aliases.add('ES SORIA ALCUBILLAS');
  }
  if (clean === 'MADRID') {
    aliases.add('MADRID');
    aliases.add('GANESHA MADRID');
    aliases.add('ES MADRID');
  }
  if (clean === 'TORREJON') {
    aliases.add('TORREJON');
    aliases.add('GANESHA TORREJON');
    aliases.add('ES TORREJON');
  }
  if (clean === 'VALDEMORO') {
    aliases.add('VALDEMORO');
    aliases.add('ES VALDEMORO');
  }
  if (clean === 'RIBA-ROJA' || clean === 'RIBA ROJA') {
    aliases.add('RIBA-ROJA');
    aliases.add('ES RIBA-ROJA');
    aliases.add('RIBA ROJA');
  }
  if (clean === 'PISTA DE SILLA' || clean === 'PISTA SILLA') {
    aliases.add('PISTA DE SILLA');
    aliases.add('ES PISTA DE SILLA');
    aliases.add('PISTA SILLA');
  }
  if (clean === 'REAL DE GANDIA' || clean === 'GANDIA') {
    aliases.add('REAL DE GANDIA');
    aliases.add('ES REAL DE GANDIA');
    aliases.add('GANDIA');
  }
  if (clean === 'CHIVA') {
    aliases.add('CHIVA');
    aliases.add('ES CHIVA');
  }
  if (clean === 'ALBERIC') {
    aliases.add('ALBERIC');
    aliases.add('ES ALBERIC');
  }
  if (clean === 'CATARROJA') {
    aliases.add('CATARROJA');
    aliases.add('ES CATARROJA');
  }
  if (clean.includes('MANISES')) {
    aliases.add('MANISES');
    aliases.add('MANISES - EXOIL');
  }

  const aliasList = Array.from(aliases);

  // 2. Comprobar caché de Sábana de Precios (publicada por SabanaPreciosManager)
  const checkCache = (cacheKey: string): number | null => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;

      for (const al of aliasList) {
        const candidateKeys = [
          `T60::${al}`,
          `60::${al}`,
          `TARIFA 60::${al}`,
          `STD_${al}_T60`,
          `TAR_60_${al}`,
        ];
        for (const ck of candidateKeys) {
          const val = parsed[ck] ?? parsed[ck.toUpperCase()];
          if (val !== undefined) {
            if (typeof val === 'number' && val > 0) return val;
            if (typeof val === 'object' && val?.conIva && typeof val.conIva === 'number' && val.conIva > 0) {
              return val.conIva;
            }
          }
        }
      }

      // Estructura fullCache { "60::station": { sinIva, conIva } }
      for (const al of aliasList) {
        const fullKeys = [
          `60::${al}`,
          `T60::${al}`,
          `TARIFA 60::${al}`,
        ];
        for (const fk of fullKeys) {
          const obj = parsed[fk] ?? parsed[fk.toUpperCase()];
          if (obj?.conIva && typeof obj.conIva === 'number' && obj.conIva > 0) {
            return obj.conIva;
          }
        }
      }
    } catch (e) {}
    return null;
  };

  const cachedVal =
    (selectedDate ? checkCache(`efi_sabana_standard_table_cache_${selectedDate}`) : null) ||
    (selectedDate ? checkCache(`efi_sabana_standard_table_full_${selectedDate}`) : null) ||
    checkCache(`efi_sabana_standard_table_cache_${activeDate}`) ||
    checkCache(`efi_sabana_standard_table_full_${activeDate}`) ||
    checkCache(`efi_sabana_standard_table_cache_${todayStr}`) ||
    checkCache(`efi_sabana_standard_table_full_${todayStr}`) ||
    checkCache('efi_sabana_standard_table_cache_v1') ||
    checkCache('efi_sabana_standard_table_full_v1');

  if (cachedVal !== null && cachedVal > 0) {
    return cachedVal;
  }

  // 3. Evaluar fórmulas personalizadas de Sábana
  let purchasesData: Record<string, any> = {};
  try {
    const sDate = (selectedDate && localStorage.getItem('efi_purchases_' + selectedDate)) || localStorage.getItem('efi_purchases_' + activeDate);
    const sGlob = localStorage.getItem('efi_compras_data');
    if (sDate) purchasesData = JSON.parse(sDate).data || {};
    else if (sGlob) purchasesData = JSON.parse(sGlob).data || {};
  } catch (e) {}

  const allFormulas = {
    ...loadSabanaFormulas('global'),
    ...(selectedDate ? loadSabanaFormulas(selectedDate) : {}),
    ...loadSabanaFormulas(activeDate),
  };

  // a) Buscar fórmula Con IVA específica
  for (const al of aliasList) {
    const cleanAl = al.toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
    const conKeys = [
      `STD_${al}_T60_conIva`,
      `STD_${cleanAl}_T60_conIva`,
      `TAR_60_${al}_conIva`,
      `TAR_60_${cleanAl}_conIva`,
    ];
    for (const k of conKeys) {
      const f = allFormulas[k];
      if (f && typeof f.evaluatedValue === 'number' && f.evaluatedValue > 0) {
        return f.evaluatedValue;
      }
    }
  }

  // b) Búsqueda flexible para fórmulas con IVA que contengan 60 y el nombre de la estación
  for (const [fKey, fVal] of Object.entries(allFormulas)) {
    if (!fVal || typeof fVal.evaluatedValue !== 'number' || fVal.evaluatedValue <= 0) continue;
    const upperKey = fKey.toUpperCase();
    if (!upperKey.includes('60')) continue;
    if (upperKey.includes('CONIVA')) {
      const normKey = upperKey.replace(/[^A-Z0-9]/g, '');
      const isMatch = aliasList.some((al) => {
        const normAl = al.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return normKey.includes(normAl);
      });
      if (isMatch) return fVal.evaluatedValue;
    }
  }

  // c) Buscar si hay fórmula en Sin IVA (* 1.21)
  for (const al of aliasList) {
    const cleanAl = al.toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
    const sinKeys = [
      `STD_${al}_T60_sinIva`,
      `STD_${cleanAl}_T60_sinIva`,
      `TAR_60_${al}_sinIva`,
      `TAR_60_${cleanAl}_sinIva`,
    ];
    for (const k of sinKeys) {
      const f = allFormulas[k];
      if (f && typeof f.evaluatedValue === 'number' && f.evaluatedValue > 0) {
        return round3(f.evaluatedValue * 1.21);
      }
    }
  }

  for (const [fKey, fVal] of Object.entries(allFormulas)) {
    if (!fVal || typeof fVal.evaluatedValue !== 'number' || fVal.evaluatedValue <= 0) continue;
    const upperKey = fKey.toUpperCase();
    if (!upperKey.includes('60')) continue;
    if (upperKey.includes('SINIVA')) {
      const normKey = upperKey.replace(/[^A-Z0-9]/g, '');
      const isMatch = aliasList.some((al) => {
        const normAl = al.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return normKey.includes(normAl);
      });
      if (isMatch) return round3(fVal.evaluatedValue * 1.21);
    }
  }

  // 4. Margen modificado para la Tarifa 60 (por defecto 0.0800)
  let effectiveMarkup = 0.0800;
  try {
    const savedMods = localStorage.getItem('efi_sabana_modified_tariffs_config_v1');
    if (savedMods) {
      const parsedMods = JSON.parse(savedMods);
      if (parsedMods['60']?.markup !== undefined) effectiveMarkup = parsedMods['60'].markup;
      else if (parsedMods['TARIFA 60']?.markup !== undefined) effectiveMarkup = parsedMods['TARIFA 60'].markup;
    }
  } catch (e) {}

  // 5. Calcular Precio Base según la lógica de Sábana de Precios
  let basePrice = 0;

  for (const al of aliasList) {
    const keyGoa = `${al}_GOA`;
    if (purchasesData[keyGoa]?.sale) {
      basePrice = parseNum(purchasesData[keyGoa].sale);
      if (basePrice > 0) break;
    }
  }

  if (!basePrice || basePrice <= 0) {
    const matchedKey = Object.keys(purchasesData).find((k) => {
      if (!k.endsWith('_GOA')) return false;
      const baseK = k.replace(/_GOA$/, '').toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
      return aliasList.some((al) => {
        const cleanAl = al.toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
        return baseK === cleanAl || baseK.includes(cleanAl) || cleanAl.includes(baseK);
      });
    });
    if (matchedKey && purchasesData[matchedKey]?.sale) {
      basePrice = parseNum(purchasesData[matchedKey].sale);
    }
  }

  if (!basePrice || basePrice <= 0) {
    for (const al of aliasList) {
      const cleanAl = al.toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
      if (OFFICIAL_SUGGESTED_SALE_PRICES[cleanAl] !== undefined) {
        basePrice = OFFICIAL_SUGGESTED_SALE_PRICES[cleanAl];
        break;
      }
      if (OFFICIAL_SUGGESTED_SALE_PRICES[al] !== undefined) {
        basePrice = OFFICIAL_SUGGESTED_SALE_PRICES[al];
        break;
      }
    }
  }

  if (!basePrice || basePrice <= 0) {
    const allCosts = typeof window !== 'undefined' ? getStationExcelCosts() : STATION_EXCEL_COSTS;
    let foundCost: any = null;
    for (const al of aliasList) {
      if (allCosts[al]) {
        foundCost = allCosts[al];
        break;
      }
      const cleanAl = al.toUpperCase().replace(/^ES\s+/, '').replace(/^GANESHA\s+/, '').trim();
      if (allCosts[cleanAl]) {
        foundCost = allCosts[cleanAl];
        break;
      }
    }
    if (!foundCost) {
      foundCost = {
        porte: 0.0050,
        pase: 0.0100,
        fin: 0.0100,
        defaultCurr: 1.2000,
      };
    }
    basePrice = Number((foundCost.defaultCurr + foundCost.porte + foundCost.pase + foundCost.fin).toFixed(3));
  }

  const sinIva = Number((basePrice + effectiveMarkup).toFixed(3));
  return Number((sinIva * 1.21).toFixed(3));
} finally {
  isEvaluatingT60 = false;
}
}

// -------------------------------------------------------------
// GESTIÓN DE FÓRMULAS PERSONALIZADAS PARA LA VENTANA DE POSTES
// -------------------------------------------------------------

export function loadPostesFormulas(selectedDate: string): Record<string, CellFormula> {
  try {
    const sDate = localStorage.getItem("efi_postes_custom_formulas_" + selectedDate);
    const sGlob = localStorage.getItem("efi_postes_custom_formulas_global");
    if (sDate) {
      const parsed = JSON.parse(sDate);
      if (parsed && typeof parsed === "object") return parsed;
    }
    if (sGlob) {
      const parsed = JSON.parse(sGlob);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {}
  return {};
}

export function savePostesFormula(
  selectedDate: string,
  cellKey: string,
  formula: CellFormula
): Record<string, CellFormula> {
  const current = loadPostesFormulas(selectedDate);
  const updated = {
    ...current,
    [cellKey]: {
      ...formula,
      updatedAt: new Date().toISOString(),
    },
  };

  try {
    localStorage.setItem("efi_postes_custom_formulas_" + selectedDate, JSON.stringify(updated));
    localStorage.setItem("efi_postes_custom_formulas_global", JSON.stringify(updated));
    window.dispatchEvent(new Event("efi_postes_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {}

  return updated;
}

export function removePostesFormula(
  selectedDate: string,
  cellKey: string
): Record<string, CellFormula> {
  const current = loadPostesFormulas(selectedDate);
  const updated = { ...current };
  delete updated[cellKey];

  try {
    localStorage.setItem("efi_postes_custom_formulas_" + selectedDate, JSON.stringify(updated));
    localStorage.setItem("efi_postes_custom_formulas_global", JSON.stringify(updated));
    window.dispatchEvent(new Event("efi_postes_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {}

  return updated;
}

export function clearAllPostesFormulas(selectedDate: string): void {
  try {
    localStorage.removeItem("efi_postes_custom_formulas_" + selectedDate);
    localStorage.removeItem("efi_postes_custom_formulas_global");
    window.dispatchEvent(new Event("efi_postes_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {}
}

export function reevaluateAllPostesFormulas(
  customFormulas: Record<string, CellFormula>,
  selectedDate: string
): Record<string, CellFormula> {
  if (!customFormulas || Object.keys(customFormulas).length === 0) {
    return {};
  }

  const { map } = getProgramVariables(selectedDate);
  const current = { ...customFormulas };

  for (const [cellKey, cellData] of Object.entries(current)) {
    if (!cellData || !cellData.rawFormula) continue;
    let stationName: string | undefined = undefined;
    const allStations = typeof window !== 'undefined' ? getAllStations() : [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];
    for (const st of allStations) {
      if (cellKey.includes(st.name)) {
        stationName = st.name;
        break;
      }
    }
    const evalRes = evaluateFormula(cellData.rawFormula, map, { stationName });
    if (evalRes.success) {
      current[cellKey] = {
        ...cellData,
        evaluatedValue: evalRes.value,
      };
    }
  }

  return current;
}
