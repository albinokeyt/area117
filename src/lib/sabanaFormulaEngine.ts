import { PROPIAS_STATIONS, COLABORADORA_STATIONS, STATION_EXCEL_COSTS } from "./dataSeed";

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

export function getProgramVariables(selectedDate: string): {
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
  try {
    const sDate = localStorage.getItem("efi_purchases_" + selectedDate);
    const sGlob = localStorage.getItem("efi_compras_data");
    if (sDate) purchasesData = JSON.parse(sDate).data || {};
    else if (sGlob) purchasesData = JSON.parse(sGlob).data || {};
  } catch (e) {}

  const allStations = [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];
  allStations.forEach((st) => {
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
    const porte = itemGoa ? parseNum(itemGoa.porte) : costs.porte;
    const pase = itemGoa ? parseNum(itemGoa.pase) : costs.pase;
    const fin = itemGoa ? parseNum(itemGoa.fin) : costs.fin;
    const totalCostGoa = round3(currGoa + porte + pase + fin);
    const pVentaGoa = itemGoa?.isCustomSale && itemGoa.sale ? parseNum(itemGoa.sale) : totalCostGoa;
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
    const goa = saved?.goa ? parseNum(saved.goa) : def.goa;
    const gas = saved?.gasolina ? parseNum(saved.gasolina) : def.gas;
    const gain = saved?.gasolinaGain ? parseNum(saved.gasolinaGain) : def.gain;
    const norm = stName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

    addVar("postes", "Postes", "Postes Estaciones Propias", "POSTES:" + norm + ":POSTE_GOA", "Poste GOA (" + stName + ")", goa, stName);
    if (def.gas > 0 || gas > 0) {
      addVar("postes", "Postes", "Postes Estaciones Propias", "POSTES:" + norm + ":POSTE_GASOLINA", "Poste Gasolina (" + stName + ")", gas, stName);
      addVar("postes", "Postes", "Postes Estaciones Propias", "POSTES:" + norm + ":MARGEN_GASOLINA", "Margen Gasolina (" + stName + ")", gain, stName);
    }
  });

  // Gasoleo B
  const gasoleoBRows = postesStorage?.gasoleoBRows || {
    "UCLES": { compra: "1.0045", transfer: "1.0240", gob: "1.2886", poste: "1.2890" },
    "TORREMOCHA": { compra: "1.0045", transfer: "1.0240", gob: "1.2886", poste: "1.2890" },
    "ARCOS": { compra: "1.0045", transfer: "1.0240", gob: "1.2886", poste: "1.2890" },
  };

  Object.entries(gasoleoBRows).forEach(([stName, row]: [string, any]) => {
    const norm = stName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    addVar("postes", "Postes", "Gasoleo B", "POSTES:" + norm + ":GOB_COMPRA", "Gasoleo B Compra (" + stName + ")", parseNum(row.compra), stName);
    addVar("postes", "Postes", "Gasoleo B", "POSTES:" + norm + ":GOB_TRANSFRIRED", "Gasoleo B Transfrired (" + stName + ")", parseNum(row.transfer), stName);
    addVar("postes", "Postes", "Gasoleo B", "POSTES:" + norm + ":GOB_POSTE", "Gasoleo B Poste (" + stName + ")", parseNum(row.poste), stName);
  });

  // 4. TARIFAS ESPECIALES
  let specialRates: any[] = [];
  try {
    const sp = localStorage.getItem("efi_special_rates_b50_f82_v3");
    if (sp) specialRates = JSON.parse(sp);
  } catch (e) {}

  if (Array.isArray(specialRates)) {
    specialRates.forEach((row) => {
      const norm = row.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
      if (row.actualPrice) {
        addVar("especial", "Tarifas Especiales", "Tarifas Especiales B50:F82", "ESPECIAL:" + norm + ":ACTUAL", "Precio Actual / Especial (" + row.name + ")", parseNum(row.actualPrice), row.name);
      }
      if (row.refPrice) {
        addVar("especial", "Tarifas Especiales", "Tarifas Especiales B50:F82", "ESPECIAL:" + norm + ":REF", "Precio Referencia (" + row.name + ")", parseNum(row.refPrice), row.name);
      }
      if (row.basePrice) {
        addVar("especial", "Tarifas Especiales", "Tarifas Especiales B50:F82", "ESPECIAL:" + norm + ":BASE", "Precio Base / Coste (" + row.name + ")", parseNum(row.basePrice), row.name);
      }
    });
  }

  return { list, map };
}

export function evaluateFormula(
  rawInput: string,
  variablesMap: Record<string, number>
): { success: boolean; value: number; error?: string } {
  if (!rawInput || rawInput.trim() === "") {
    return { success: false, value: 0, error: "Formula vacia" };
  }

  const trimmed = rawInput.trim();

  // Si es un numero puro directo (ej: "1.450" o "1,450")
  if (!trimmed.startsWith("=")) {
    const directNum = parseNum(trimmed);
    if (!isNaN(directNum) && isFinite(directNum)) {
      return { success: true, value: round3(directNum) };
    }
  }

  // Quitar el "=" inicial
  let expression = trimmed.startsWith("=") ? trimmed.substring(1).trim() : trimmed;

  // Reemplazar tokens [TOKEN] o TOKEN por sus valores
  const tokenRegex = /\[([^\]]+)\]/g;
  expression = expression.replace(tokenRegex, (match, tokenName) => {
    const cleanToken = tokenName.trim();
    if (variablesMap[cleanToken] !== undefined) {
      return variablesMap[cleanToken].toString();
    }
    const upperToken = cleanToken.toUpperCase();
    if (variablesMap[upperToken] !== undefined) {
      return variablesMap[upperToken].toString();
    }
    return "0";
  });

  // Reemplazar comas por puntos
  expression = expression.replace(/,/g, ".");

  // Soporte para porcentajes
  expression = expression.replace(/\+\s*21\s*%/g, "* 1.21");
  expression = expression.replace(/\-\s*21\s*%/g, "/ 1.21");
  expression = expression.replace(/([0-9.]+)\s*%/g, "($1 / 100)");

  // Validacion de seguridad estricta
  const safeMathRegex = /^[0-9+\-*/().\s^]+$/;
  if (!safeMathRegex.test(expression)) {
    return {
      success: false,
      value: 0,
      error: "La formula contiene caracteres no validos o tokens desconocidos",
    };
  }

  try {
    const jsMath = expression.replace(/\^/g, "**");
    const fn = new Function("return (" + jsMath + ");");
    const result = fn();

    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      return { success: false, value: 0, error: "El resultado no es un numero valido" };
    }

    return { success: true, value: round3(result) };
  } catch (err) {
    return {
      success: false,
      value: 0,
      error: "Error de sintaxis matematica en la formula",
    };
  }
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
