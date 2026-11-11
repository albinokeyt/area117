import * as XLSX from 'xlsx';

export type ClosingCell = string | number | boolean | null | undefined;
type Area = 'Postes' | 'Sábana de Precios' | 'PDFs y Clientes' | 'EFI Export';
type SheetReader = (workbook: XLSX.WorkBook) => void;
const readers = new Map<Area, SheetReader>();

// The owners stay mounted when their tabs are hidden. Read their committed view
// models on demand, so closing does not depend on tab, search or pagination.
export function registerClosingSheets(area: Area, reader: SheetReader) {
  readers.set(area, reader);
  return () => { if (readers.get(area) === reader) readers.delete(area); };
}

export function buildClosingWorkbook(date: string, validFrom: string, addPurchases: SheetReader) {
  const wb = XLSX.utils.book_new();
  addClosingTable(wb, 'CIERRE', ['CIERRE DE DÍA · AREA 117', 'Valor'], [
    ['Fecha de trabajo', date], ['Compras válidas desde', validFrom],
    ['Contenido', 'Valores registrados antes de copiar los precios a las columnas anteriores.'],
  ], [30, 85]);
  delete wb.Sheets.CIERRE['!autofilter'];
  addPurchases(wb);
  for (const area of ['Postes', 'Sábana de Precios', 'PDFs y Clientes', 'EFI Export'] as const) {
    const read = readers.get(area);
    if (!read) throw new Error(`${area} todavía está cargando. Vuelve a intentar el cierre.`);
    read(wb);
  }
  const index = wb.SheetNames.slice(1).map(name => {
    const label = { t: 's', v: name, l: { Target: `#'${name.replace(/'/g, "''")}'!A1` } };
    return [label];
  });
  XLSX.utils.sheet_add_aoa(wb.Sheets.CIERRE, [[], ['Hojas del cierre'], ...index], { origin: 'A5' });
  return wb;
}

export const closingPrice = (value: string | number | null | undefined) => {
  if (value == null || (typeof value === 'string' && !value.trim())) return null;
  const numeric = typeof value === 'number' ? value : Number(value.trim().replace(',', '.'));
  return Number.isFinite(numeric) ? Number(numeric.toFixed(3)) : null;
};

// Serialize before closing changes the day's values. Retry the same file if
// the database or browser does not confirm the first attempt.
export function prepareClosingDownload(workbook: XLSX.WorkBook, date: string, validFrom: string) {
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true });
  const file = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return () => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `CIERRE_DIARIO_AREA117_${date}_VALIDO_${validFrom}.xlsx`;
    document.body.append(anchor);
    try { anchor.click(); }
    finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 30_000); }
  };
}

export function addClosingTable(wb: XLSX.WorkBook, name: string, headers: string[],
  rows: ClosingCell[][], widths: number[], priceColumns: number[] = []) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = widths.map(wch => ({ wch }));
  if (rows.length) ws['!autofilter'] = { ref: ws['!ref']! };
  for (const c of priceColumns) for (let r = 1; r <= rows.length; r++) {
    const cell = ws[XLSX.utils.encode_cell({ c, r })];
    if (cell?.t === 'n') cell.z = '0.000';
  }
  XLSX.utils.book_append_sheet(wb, ws, name, true);
}
