'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { workspaceStorage } from '@/lib/workspaceStorage';
import { STATION_LABELS_KEY, STATION_LABELS_ACTIVE_KEY, parseStationLabels, parseLabelActivation, labelStationKey } from '@/lib/stationLabels';

const subscribe = (onChange: () => void) => workspaceStorage.subscribe(key => {
  if (key === STATION_LABELS_KEY || key === STATION_LABELS_ACTIVE_KEY) onChange();
});
const getLabels = () => workspaceStorage.getItem(STATION_LABELS_KEY);
const getActivation = () => workspaceStorage.getItem(STATION_LABELS_ACTIVE_KEY);
const serverSnapshot = () => null;

export function useStationLabels() {
  const rawLabels = useSyncExternalStore(subscribe, getLabels, serverSnapshot);
  const rawActivation = useSyncExternalStore(subscribe, getActivation, serverSnapshot);
  const labels = useMemo(() => parseStationLabels(rawLabels), [rawLabels]);
  const activation = useMemo(() => parseLabelActivation(rawActivation), [rawActivation]);
  const index = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const [station, values] of Object.entries(labels)) {
      const key = labelStationKey(station);
      result[key] = [...new Set([...(result[key] || []), ...values])];
    }
    return result;
  }, [labels]);
  return { labels, activation,
    labelsFor: (station: string) => index[labelStationKey(station)] || [],
    routeActive: (station: string) => !!index[labelStationKey(station)]?.length && activation[labelStationKey(station)] !== false };
}
