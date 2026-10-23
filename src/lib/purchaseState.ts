import { workspaceStorage } from '@/lib/workspaceStorage';
// One selector for the editor, formulas and exports, including legacy dated copies.
export function getLatestPurchasePayload(selectedDate?: string): any | null {
  if (typeof window === 'undefined') return null;
  const validFrom = workspaceStorage.getItem('efi_compras_valid_from');
  const keys = ['efi_compras_data', validFrom && `efi_purchases_${validFrom}`,
    selectedDate && `efi_purchases_${selectedDate}`].filter(Boolean) as string[];
  let latest: any = null;
  let timestamp = -1;
  for (const key of keys) {
    try {
      const payload = workspaceStorage.readJson<any>(key);
      if (!payload?.data || typeof payload.data !== 'object') continue;
      const time = Date.parse(payload.updatedAt) || 0;
      if (time > timestamp) {
        latest = payload;
        timestamp = time;
      }
    } catch { /* Ignore malformed legacy copies. */ }
  }
  if (!latest) return null;
  let costs: Record<string, any> = {};
  try { costs = workspaceStorage.readJson<any>('efi_stations_catalog_v1')?.costs || {}; } catch {}
  const data = Object.fromEntries(Object.entries(latest.data).filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value)).map(([key, value]) => {
    const row = value as Record<string, any>;
    const cost = costs[key.replace(/_(GOA|GASOLINA|ADBLUE)$/, '')] || {};
    const text = (value: unknown) => String(value ?? '').replace('.', ',');
    return [key, { ...row, prev: text(row.prev ?? row.prevBuyPrice), curr: text(row.curr ?? row.buyPrice),
      sale: text(row.sale ?? row.manualSalePrice), prevSale: text(row.prevSale ?? row.prevSalePrice ?? row.sale ?? row.manualSalePrice),
      porte: text(row.porte ?? cost.porte ?? 0), pase: text(row.pase ?? cost.pase ?? 0),
      fin: text(row.fin ?? cost.fin ?? 0), clh: String(row.clh ?? cost.clhName ?? 'TORREJON') }];
  }));
  return { ...latest, data };
}

export function closePurchaseDay<T extends { curr: string; sale: string }>(rows: Record<string, T>) {
  return Object.fromEntries(Object.entries(rows).map(([key, row]) =>
    [key, { ...row, prev: row.curr, prevSale: row.sale }])) as Record<string, T & { prev: string; prevSale: string }>;
}
