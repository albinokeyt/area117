import type { WorkBook } from 'xlsx';
import { DEFAULT_EXCEL_MAPPINGS, EXCEL_MAPPINGS_KEY, EXCEL_VALUES_KEY, excelVariable, targetId, validateExcelMappings, type ExcelMapping } from './excelImportMappings';
import { excelTargets, importCatalog, importSpecialRates, importStationKey, matchExcelTarget, GAS_DEFAULTS, type ExcelTarget, type ImportState } from './excelImportTargets';
import { DEFAULT_GASOLINA_BRONCO } from './purchaseDefaults';
import { selectPurchasePayload } from './purchaseState';
import { normalizePriceName, publishedStationPrice } from './publishedPrices';
import type { CellFormula } from './sabanaFormulaEngine';

const PURCHASES = 'efi_compras_data';
const BRONCO = 'efi_compras_gasolina_bronco';
const SPECIAL = 'efi_special_rates_b50_f82';
const POSTES = 'efi_postes_data_v2';
const CUSTOM_BLOCKS = 'efi_sabana_custom_block_tariffs_v1';
const FORMULAS = (area: string) => `efi_${area}_custom_formulas_global`;
const TRAJOTA = targetId('sabana', 'MADRID', 'TRAJOTA', 'sinIva');
const HVO_MARKS: Record<string, string> = {
  hvoGeneralBase: 'hvo_gen_base', hvoGeneralAddition: 'hvo_gen_add', hvoAlfajarinSinIva: 'hvo_alfajarin',
  hvoValdemoroAddition: 'hvo_valdemoro_add',
};
const HVO_DEFAULTS: Record<string, string> = {
  hvoGeneralBase: '1,285', hvoGeneralAddition: '0,243', hvoAlfajarinSinIva: '1,528', hvoValdemoroAddition: '0,070',
};
const B_DEFAULT = { compra: '1,081', transfer: '1,098', gob: '1,329', poste: '1,350' };
const round = (n: number, digits = 3) => Number(n.toFixed(digits));
const format = (n: number, digits = 3) => n.toFixed(digits).replace('.', ',');
const number = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^[+-]?(?:\d+(?:[,.]\d+)?|[,.]\d+)$/.test(v.trim()) ? Number(v.trim().replace(',', '.')) : NaN;
  return Number.isFinite(n) ? n : undefined;
};
const numeric = (v: unknown) => number(v) ?? 0;

function initialPurchase(catalog: ReturnType<typeof importCatalog>, name: string, product: string) {
  const costs = catalog.costs[name];
  const defaultCosts = product === 'ADBLUE' ? [0, 0, 0] : [costs?.porte ?? .005, costs?.pase ?? .01, costs?.fin ?? .01];
  const adjustment = product === 'GASOLINA' ? .12 : 0;
  const buy = product === 'ADBLUE' ? catalog.adblueConfig[name]?.defaultBuy ?? 0 : (costs?.defaultCurr ?? 1.2) + adjustment;
  const prev = product === 'ADBLUE' ? buy : (costs?.defaultPrev ?? 1.2) + adjustment;
  const sale = (product === 'GOA' ? catalog.suggestedPrices[name] : undefined) ?? buy + defaultCosts.reduce((a, b) => a + b, 0);
  return { curr: format(buy), prev: format(prev), sale: format(sale), prevSale: format(sale), isCustomSale: false,
    clh: product === 'ADBLUE' ? '-' : costs?.clhName ?? 'TORREJON', porte: format(defaultCosts[0]), pase: format(defaultCosts[1]), fin: format(defaultCosts[2]) };
}

export interface ExcelImportRow {
  mapping: ExcelMapping;
  target?: ExcelTarget;
  current?: number;
  value?: number;
  status: 'change' | 'same' | 'issue';
  note?: string;
}

export function savedExcelMappings(state: ImportState): readonly ExcelMapping[] {
  return state[EXCEL_MAPPINGS_KEY] ?? DEFAULT_EXCEL_MAPPINGS;
}

function formulaRegistry(state: ImportState, scope: string): Record<string, CellFormula> {
  if (state[FORMULAS(scope)] != null) return { ...state[FORMULAS(scope)] };
  const result: Record<string, CellFormula> = {};
  for (const key of Object.keys(state).filter(k => k.startsWith(`efi_${scope}_custom_formulas_`)).sort()) {
    for (const [cell, formula] of Object.entries<CellFormula>(state[key] || {})) {
      if (!result[cell] || (formula.updatedAt || '') >= (result[cell].updatedAt || '')) result[cell] = formula;
    }
  }
  return result;
}

export function planExcelImport(book: WorkBook, state: ImportState, date: string,
  mappings = savedExcelMappings(state), now = new Date().toISOString()) {
  validateExcelMappings(mappings);
  const options = excelTargets(state);
  const targetById = new Map(options.map(target => [target.id, target]));
  const catalog = importCatalog(state);
  const patch: ImportState = {};
  const valid = state.efi_compras_valid_from;
  const dates = [...new Set([date, valid].filter(d => typeof d === 'string' && /^\d{4}-\d\d-\d\d$/.test(d)))];
  const purchaseBase = selectPurchasePayload(key => state[key], valid, date) || { data: {}, modified: [] };
  // Do not normalize or overwrite untouched rows when writing a patch.
  const rawPurchases = [state[PURCHASES], state[`efi_purchases_${valid}`], state[`efi_purchases_${date}`]]
    .find(payload => payload?.data && payload.updatedAt === purchaseBase.updatedAt)?.data || purchaseBase.data;
  const purchases = Object.keys(rawPurchases).length ? { ...rawPurchases } : Object.fromEntries(
    [...catalog.propias, ...catalog.colaboradoras].flatMap(({ name }) =>
      ['GOA', 'GASOLINA', ...(catalog.adblueConfig[name] ? ['ADBLUE'] : [])]
        .map(product => [`${name}_${product}`, initialPurchase(catalog, name, product)])),
  );
  const purchaseMods = new Set<string>(purchaseBase.modified || []);
  const bronco = { ...(state[`efi_purchases_bronco_${date}`] || state[`efi_purchases_bronco_${valid}`] || state[BRONCO] || DEFAULT_GASOLINA_BRONCO) };
  const special = importSpecialRates(state).map((row: any) => ({ ...row }));
  const postes = structuredClone(state[POSTES] || {});
  const posteMods = new Set<string>(postes.modified || []);
  const postesFormulas = formulaRegistry(state, 'postes');
  const sabanaFormulas = formulaRegistry(state, 'sabana');
  const excelValues = { ...state[EXCEL_VALUES_KEY] };
  const blocks = [...(state[CUSTOM_BLOCKS] || [])];
  const replacements = new Set<ExcelMapping>();
  const seen = new Set<string>();
  const planRows: ExcelImportRow[] = mappings.map(mapping => {
    const target = targetById.get(mapping.target) || matchExcelTarget(mapping, options);
    const issue = (note: string): ExcelImportRow => ({ mapping, target, status: 'issue', note });
    if (!target) return issue('El destino no existe en el catálogo actual.');
    const logicalTarget = target.kind === 'hvo' && target.field === 'valdemoroTarget' ? targetId('hvo', 'hvoValdemoroAddition') : target.id;
    if (seen.has(logicalTarget)) return issue('Otra regla ya actualiza este destino.');
    seen.add(logicalTarget);
    const sheetName = book.Sheets[mapping.sheet] ? mapping.sheet : book.SheetNames.find(name => normalizePriceName(name) === normalizePriceName(mapping.sheet));
    if (!sheetName) return issue('No se encontró la hoja.');
    const sheet = book.Sheets[sheetName];
    if (mapping.stationCell) {
      const label = sheet[mapping.stationCell]?.v;
      if (typeof label !== 'string' || importStationKey(label) !== importStationKey(target.name)) {
        return issue(`La estación en ${mapping.stationCell} no coincide: ${String(label ?? 'vacía')}.`);
      }
    }
    if (mapping.productCell) {
      const label = sheet[mapping.productCell]?.v;
      if (!target.product || typeof label !== 'string' || normalizePriceName(label) !== target.product) {
        return issue(`El producto en ${mapping.productCell} no coincide: ${String(label ?? 'vacío')}.`);
      }
    }
    const cell = sheet[mapping.cell];
    const n = cell && ['n', 's', 'str'].includes(cell.t) ? number(cell.v) : undefined;
    if (n === undefined) return issue('La celda está vacía o no contiene un número calculado.');
    const value = n / (mapping.scale === 'miles' || (mapping.scale === 'auto' && Number.isInteger(n) && Math.abs(n) >= 1000) ? 1000 : 1);
    if (value < 0 && !['hvoGeneralAddition', 'hvoValdemoroAddition'].includes(target.field)) return issue('El precio no puede ser negativo.');
    // Keep the input precision for calculated HVO prices; other screens work to three decimals.
    return { mapping, target, status: 'same', value: round(value, target.kind === 'hvo' ? 8 : 3) };
  });
  const setIssue = (row: ExcelImportRow, note: string) => { row.status = 'issue'; row.note = note; };
  const changed = (row: ExcelImportRow, current: unknown, replace = false) => {
    row.current = number(current);
    if (!replace && row.current === row.value) return false;
    row.status = 'change';
    return true;
  };
  let purchaseChanged = false, specialChanged = false, broncoChanged = false, postesChanged = false;
  const saleRecalcs = new Set<string>();
  // HVO Valdemoro must see the GOA price that will be in effect after this import.
  const ordered = [...planRows.filter(row => row.target?.field !== 'valdemoroTarget'), ...planRows.filter(row => row.target?.field === 'valdemoroTarget')];
  for (const row of ordered) {
    const { target, value, mapping } = row;
    if (!target || row.status === 'issue' || value === undefined) continue;
    const { name, field, kind, product, formulaKey } = target;
    const fmt = format(value, kind === 'hvo' ? Math.max(3, (String(value).split('.')[1] || '').length) : 3);
    if (kind === 'purchase') {
      const key = `${name}_${product}`;
      const item = purchaseBase.data[key] || initialPurchase(catalog, name, product!);
      const update = { ...(purchases[key] === rawPurchases[key] ? item : purchases[key]) };
      if (!changed(row, update[field], field === 'sale' && !update.isCustomSale)) continue;
      update[field] = fmt;
      if (field === 'sale') update.isCustomSale = true;
      if (['curr', 'porte', 'pase', 'fin'].includes(field)) saleRecalcs.add(key);
      purchases[key] = update;
      purchaseMods.add(`${key}_${field}`);
      purchaseChanged = true;
      continue;
    }
    if (kind === 'special') {
      const item = special.find((entry: any) => entry.name === name);
      const flag = { actualPrice: 'isCustomActual', refPrice: 'isCustomRef', basePrice: 'isCustomBase' }[field]!;
      const st = [...catalog.propias, ...catalog.colaboradoras].find(st => importStationKey(st.name) === importStationKey(name));
      const p = st && (purchases[`${st.name}_GOA`] || purchaseBase.data[`${st.name}_GOA`]);
      const sale = number(p?.sale) ?? (st && catalog.suggestedPrices[st.name]);
      const current = item[flag] ? item[field] : field === 'actualPrice' ? sale : field === 'refPrice'
        ? (sale === undefined ? undefined : round((numeric(item.isCustomActual ? item.actualPrice : sale)) + .008))
        : p ? round(numeric(p.curr) + numeric(p.porte) + numeric(p.pase) + numeric(p.fin) + .008) : undefined;
      if (!changed(row, current, !item[flag])) continue;
      Object.assign(item, { [field]: fmt, [flag]: true });
      purchaseMods.add(`special_${item.id}_${field}`);
      purchaseChanged = specialChanged = true;
      continue;
    }
    if (kind === 'bronco') {
      if (!changed(row, bronco[field])) continue;
      bronco[field] = fmt;
      if (field === 'conIva') bronco.sinIva = format(value / 1.21);
      if (field === 'sinIva') bronco.conIva = format(value * 1.21);
      bronco.beneficio = format(numeric(bronco.sinIva) - numeric(bronco.compra) - .015);
      for (const mark of field === 'compra' ? [field, 'beneficio'] : [field, 'sinIva', 'conIva', 'beneficio']) purchaseMods.add('bronco_' + mark);
      purchaseChanged = broncoChanged = true;
      continue;
    }
    if (kind === 'sabana' && formulaKey) {
      const activeKey = [formulaKey, ...(target.formulaAliases || [])].find(key => sabanaFormulas[key]);
      const active = activeKey ? sabanaFormulas[activeKey] : undefined;
      const key = activeKey ?? formulaKey;
      const formula = `=[${excelVariable(key)}]`;
      const excelBinding = active?.rawFormula?.trim().toUpperCase() === formula;
      const isOldTrajotaConstant = mapping.target === TRAJOTA && !([formulaKey, ...(target.formulaAliases || [])].some(key => key in excelValues))
        && /^=?\s*[+-]?\d+(?:[.,]\d+)?$/.test(active?.rawFormula?.trim() || '');
      if (!active && [formulaKey, ...(target.formulaAliases || [])].some(key => key in excelValues) && !mapping.replaceFormula) {
        setIssue(row, 'Se respeta la eliminación de la fórmula. Si quieres volver a vincularla, autorízalo en el mapa.');
        continue;
      }
      if (active && !excelBinding && !mapping.replaceFormula && !isOldTrajotaConstant) {
        setIssue(row, 'Se conserva la fórmula existente. Autoriza su sustitución en el mapa si quieres cambiar su origen.');
        continue;
      }
      const published = state.efi_sabana_prices_v1;
      const source = Object.entries<string>(published?.tariffs || {}).find(([tariff]) => {
        const nameInTarget = decodeURIComponent(target.id.split('|')[2]);
        return tariff === normalizePriceName(nameInTarget) || tariff === 'TARIFA ' + normalizePriceName(nameInTarget);
      })?.[1];
      const pair = publishedStationPrice(published, date, source || null, name);
      if (!changed(row, excelBinding ? excelValues[key] ?? active?.evaluatedValue : active?.evaluatedValue ?? pair?.[field as 'sinIva' | 'conIva'],
        !excelBinding || !!target.createTariff)) continue;
      excelValues[key] = value;
      patch[EXCEL_VALUES_KEY] = excelValues;
      if (!excelBinding) {
        sabanaFormulas[key] = { rawFormula: formula, evaluatedValue: value, updatedAt: now, description: 'Origen: importación diaria de Excel' };
        patch[FORMULAS('sabana')] = sabanaFormulas;
      }
      if (mapping.replaceFormula) replacements.add(mapping);
      if (target.createTariff && !blocks.some(t => t.id === target.createTariff?.id)) {
        blocks.push(target.createTariff);
        patch[CUSTOM_BLOCKS] = blocks;
        row.note = 'Se añadirá TRAJOTA al recuadro TALAEXPRESS.';
      } else if (!excelBinding) row.note = 'Quedará vinculada a la importación de Excel.';
      continue;
    }
    const existingFormula = formulaKey && postesFormulas[formulaKey];
    if (existingFormula && !mapping.replaceFormula) {
      setIssue(row, 'Se conserva la fórmula existente. Autoriza su sustitución en el mapa si quieres cambiar su origen.');
      continue;
    }
    if (kind === 'hvo') {
      const effectiveField = field === 'valdemoroTarget' ? 'hvoValdemoroAddition' : field;
      let stored = fmt;
      let current = existingFormula ? existingFormula.evaluatedValue : postes[effectiveField] ?? HVO_DEFAULTS[effectiveField];
      if (field === 'valdemoroTarget') {
        const valdemoro = catalog.postesStations.find(st => importStationKey(st.name) === 'VALDEMORO');
        const goaKey = valdemoro && `POSTE_${valdemoro.name}_GOA`;
        if (!valdemoro || (goaKey && postesFormulas[goaKey]) || postesFormulas.POSTE_HVO_VALDEMORO_CON_IVA) {
          setIssue(row, 'No se puede ajustar el HVO: falta Valdemoro o su precio está controlado por otra fórmula.');
          continue;
        }
        const goa = number(postes.postes?.[valdemoro.name]?.goa ?? valdemoro.defaultGoa);
        if (goa === undefined) { setIssue(row, 'Falta el GOA de Valdemoro para calcular el ajuste.'); continue; }
        const previousGoa = numeric(state[POSTES]?.postes?.[valdemoro.name]?.goa ?? valdemoro.defaultGoa);
        stored = format(value - goa, 4);
        current = round(previousGoa + numeric(current), 4);
        row.note = `Ajuste sobre GOA de Valdemoro: ${stored} €/L.`;
      }
      if (field === 'hvoAlfajarinSinIva' && normalizePriceName(mapping.sheet) === 'CALCULO INICIAL' && mapping.cell === 'E6') {
        const sheet = book.SheetNames.find(name => normalizePriceName(name) === 'CALCULO INICIAL');
        const expected = sheet && number(book.Sheets[sheet]?.E5?.v);
        const calculated = round(postesFormulas.POSTE_HVO_ALFAJARIN_CON_IVA?.evaluatedValue ?? value * 1.21);
        if (typeof expected === 'number' && round(expected) !== calculated) {
          row.note = `Revisar IVA: el programa muestra ${format(calculated)} €/L y E5 indica ${format(expected)} €/L.`;
        } else if (typeof expected === 'number') row.note = `Con IVA calculado: ${format(calculated)} €/L, coincide con E5.`;
      }
      if (!changed(row, current, !!existingFormula || (field === 'valdemoroTarget' && number(stored) !== number(postes[effectiveField] ?? HVO_DEFAULTS[effectiveField])))) continue;
      postes[effectiveField] = stored;
      posteMods.add(HVO_MARKS[effectiveField]);
    } else if (kind === 'postes') {
      const st = catalog.postesStations.find(st => st.name === name)!;
      const initial = { goa: st.defaultGoa, gasolina: st.defaultGasolina, gasolinaGain: st.defaultGain };
      const item = postes.postes?.[name] || initial;
      if (!changed(row, existingFormula ? existingFormula.evaluatedValue : item[field], !!existingFormula)) continue;
      postes.postes ||= Object.fromEntries(catalog.postesStations.map(st => [st.name, { goa: st.defaultGoa, gasolina: st.defaultGasolina, gasolinaGain: st.defaultGain }]));
      postes.postes[name] = { ...item, [field]: fmt };
      posteMods.add(`poste_${name}_${field}`);
    } else {
      const group = kind === 'gasB' ? 'gasoleoBRows' : kind;
      const adblue = catalog.adblueConfig[name];
      const item = postes[group]?.[name] || (kind === 'gasB' ? B_DEFAULT : kind === 'gases' ? GAS_DEFAULTS[name]
        : { compra: format(adblue?.defaultBuy ?? 0), poste: format(adblue?.defaultSale ?? 0) });
      const flag = kind === 'gasB' && field !== 'compra' ? field === 'poste' ? 'isCustomPoste' : 'isCustomTransfer' : null;
      if (!changed(row, existingFormula ? existingFormula.evaluatedValue : item[field], !!existingFormula || (!!flag && !item[flag]))) continue;
      if (!postes[group]) {
        postes[group] = kind === 'gasB' ? Object.fromEntries(['UCLES', 'TORREMOCHA', 'ARCOS'].map(st => [st, { ...B_DEFAULT }]))
          : kind === 'gases' ? { ...GAS_DEFAULTS } : Object.fromEntries(Object.entries(catalog.adblueConfig).map(([st, cfg]) =>
            [st, { compra: format(cfg.defaultBuy), poste: format(cfg.defaultSale) }]));
      }
      const updated = { ...item, [field]: fmt, ...(flag ? { [flag]: true } : {}) };
      if (kind === 'gasB' && field === 'compra') {
        if (!item.isCustomTransfer && !posteMods.has(`gasb_transfer_${name}`)) updated.transfer = format(value + .017);
        if (!item.isCustomPoste && !posteMods.has(`gasb_poste_${name}`)) updated.poste = format((value + .035) * 1.21);
      }
      postes[group][name] = updated;
      posteMods.add(`${kind === 'gasB' ? 'gasb' : kind === 'gases' ? 'gas' : kind}_${field}_${name}`);
    }
    if (existingFormula && formulaKey) {
      delete postesFormulas[formulaKey];
      patch[FORMULAS('postes')] = postesFormulas;
      replacements.add(mapping);
      row.note = 'El valor importado sustituirá la fórmula de esta celda.';
    }
    postesChanged = true;
  }
  for (const key of saleRecalcs) {
    const item = purchases[key];
    if (!item.isCustomSale) {
      const sale = format(numeric(item.curr) + numeric(item.porte) + numeric(item.pase) + numeric(item.fin));
      if (number(item.sale) !== number(sale)) {
        purchases[key] = { ...item, sale };
        purchaseMods.add(`${key}_sale`);
      }
    }
  }
  if (purchaseChanged) {
    const payload = { ...purchaseBase, data: purchases, modified: [...purchaseMods], updatedAt: now };
    patch[PURCHASES] = payload;
    for (const day of dates) patch[`efi_purchases_${day}`] = payload;
  }
  if (broncoChanged) {
    patch[BRONCO] = bronco;
    for (const day of dates) patch[`efi_purchases_bronco_${day}`] = bronco;
  }
  if (specialChanged) patch[SPECIAL + '_v4'] = patch[SPECIAL + '_v3'] = special;
  if (postesChanged) patch[POSTES] = { ...postes, modified: [...posteMods], updatedAt: now };
  if (replacements.size) {
    patch[EXCEL_MAPPINGS_KEY] = mappings.map(rule => {
      if (!replacements.has(rule)) return rule;
      const { replaceFormula: _, ...rest } = rule;
      return rest;
    });
  }
  return { rows: planRows, patch };
}
