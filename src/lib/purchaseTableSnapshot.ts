export interface PurchaseTableSnapshot {
  headers: string[];
  rows: { station: string; route: boolean; labels: string[]; cells: { text: string; modified: boolean }[] }[];
}

// Capture before the asynchronous PDF import so every column belongs to the same instant.
export function capturePurchaseTable(table: HTMLTableElement, labelsFor: (station: string) => string[]): PurchaseTableSnapshot {
  return {
    headers: [...table.querySelectorAll('thead th')].map(cell => cell.textContent!.replace(/\s+/g, ' ').replace(/\(\. o ,\)/, '').trim()),
    rows: [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')].map(row => {
      const station = row.dataset.station || '';
      const route = row.dataset.routeActive === 'true';
      return { station, route, labels: route ? labelsFor(station) : [], cells: [...row.cells].map(cell => {
        const input = cell.querySelector<HTMLInputElement>('input:not([type="checkbox"])');
        return { text: cell.dataset.pdfValue ?? input?.value ?? cell.textContent!.replace(/\s+/g, ' ').trim(),
          modified: !!input?.className.includes('bg-amber-') };
      }) };
    }),
  };
}
