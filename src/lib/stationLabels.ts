import { workspaceStorage } from './workspaceStorage';

// Keep the existing assignments key: legacy labels remain assigned and active by default.
export const STATION_LABELS_KEY = 'efi_pdf_station_labels_v1';
export const STATION_LABELS_ACTIVE_KEY = 'efi_station_labels_active_v1';
export type StationLabels = Record<string, string[]>;
export type StationLabelActivation = Record<string, boolean>;
export const labelStationKey = (station: string) => station.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/^ES\s+/, '').trim();

export function parseStationLabels(raw: string | null): StationLabels {
  try {
    const value = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([station, labels]) => [station,
      [...new Set((Array.isArray(labels) ? labels : [labels]).filter((label): label is string => typeof label === 'string' && !!label.trim()).map(label => label.trim()))]
    ]));
  } catch { return {}; }
}

export function parseLabelActivation(raw: string | null): StationLabelActivation {
  try {
    const value = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
  } catch { return {}; }
}

export function stationLabelsFor(labels: StationLabels, station: string): string[] {
  const key = labelStationKey(station);
  return [...new Set(Object.entries(labels).filter(([name]) => labelStationKey(name) === key).flatMap(([, values]) => values))];
}

export function stationRouteActive(labels: StationLabels, activation: StationLabelActivation, station: string): boolean {
  return stationLabelsFor(labels, station).length > 0 && activation[labelStationKey(station)] !== false;
}

export function setStationRouteActive(station: string, active: boolean) {
  const labels = parseStationLabels(workspaceStorage.getItem(STATION_LABELS_KEY));
  if (!stationLabelsFor(labels, station).length) return;
  const activation = parseLabelActivation(workspaceStorage.getItem(STATION_LABELS_ACTIVE_KEY));
  workspaceStorage.setItem(STATION_LABELS_ACTIVE_KEY, JSON.stringify({ ...activation, [labelStationKey(station)]: active }));
}

export function assignStationLabel(station: string, label: string) {
  const text = label.trim().toUpperCase();
  if (!station.trim() || !text) return;
  const labels = parseStationLabels(workspaceStorage.getItem(STATION_LABELS_KEY));
  if (!stationLabelsFor(labels, station).some(existing => existing.toUpperCase() === text)) {
    // Avoid rewriting unrelated legacy string assignments into arrays during an edit.
    let original: Record<string, unknown> = {};
    try {
      const value = JSON.parse(workspaceStorage.getItem(STATION_LABELS_KEY) || '{}');
      if (value && typeof value === 'object' && !Array.isArray(value)) original = value;
    } catch { /* Recover malformed legacy data with the new assignment. */ }
    workspaceStorage.setItem(STATION_LABELS_KEY, JSON.stringify({ ...original, [station]: [...(labels[station] || []), text] }));
  }
  setStationRouteActive(station, true);
}

export function setAllStationRoutesActive(active: boolean) {
  const labels = parseStationLabels(workspaceStorage.getItem(STATION_LABELS_KEY));
  const activation = parseLabelActivation(workspaceStorage.getItem(STATION_LABELS_ACTIVE_KEY));
  for (const station of Object.keys(labels)) activation[labelStationKey(station)] = active;
  workspaceStorage.setItem(STATION_LABELS_ACTIVE_KEY, JSON.stringify(activation));
}
