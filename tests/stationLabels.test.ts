import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStationLabels, parseLabelActivation, stationLabelsFor, stationRouteActive, setStationRouteActive, assignStationLabel, setAllStationRoutesActive, STATION_LABELS_KEY, STATION_LABELS_ACTIVE_KEY } from '../src/lib/stationLabels';
import { workspaceStorage } from '../src/lib/workspaceStorage';
(globalThis as any).window = {};

test('legacy string/array assignments remain active, including station aliases and multiple labels', () => {
  const labels = parseStationLabels(JSON.stringify({ 'ES TORREJÓN': 'MADRID', TORREJON: ['RUTA A2', '', 3], MADRID: ['OTRA'] }));
  assert.deepEqual(stationLabelsFor(labels, 'TORREJON'), ['MADRID', 'RUTA A2']);
  assert.equal(stationRouteActive(labels, {}, 'TORREJON'), true);
  assert.equal(stationRouteActive(labels, {}, 'TORREMOCHA'), false);
  assert.equal(stationRouteActive(labels, { TORREJON: false }, 'ES TORREJÓN'), false);
  assert.deepEqual(parseStationLabels('null'), {});
  assert.deepEqual(parseLabelActivation('{"TORREJON":false,"MADRID":"false"}'), { TORREJON: false });
});

test('deactivation and bulk deactivation never delete assignments; reactivation restores the same names', () => {
  workspaceStorage.clear();
  const original = JSON.stringify({ TORREJON: ['MADRID', 'RUTA A2'], 'ARCOS JALON': ['RUTA A2'] });
  workspaceStorage.setItem(STATION_LABELS_KEY, original);
  setStationRouteActive('ES TORREJÓN', false);
  assert.equal(workspaceStorage.getItem(STATION_LABELS_KEY), original);
  const state = () => parseLabelActivation(workspaceStorage.getItem(STATION_LABELS_ACTIVE_KEY));
  assert.equal(state().TORREJON, false);
  setStationRouteActive('ARCOS JALON', false);
  setStationRouteActive('TORREJON', true);
  assert.equal(state()['ARCOS JALON'], false);
  setAllStationRoutesActive(false);
  assert.equal(workspaceStorage.getItem(STATION_LABELS_KEY), original);
  setAllStationRoutesActive(true);
  assert.equal(state().TORREJON, true);
  assert.equal(state()['ARCOS JALON'], true);
  assert.equal(workspaceStorage.getItem(STATION_LABELS_KEY), original);
});

test('assignment is durable and case-insensitive reactivation does not duplicate or replace labels', () => {
  workspaceStorage.clear();
  assignStationLabel('TORREJON', 'Madrid');
  setStationRouteActive('TORREJON', false);
  assignStationLabel('TORREJON', ' madrid ');
  let labels = parseStationLabels(workspaceStorage.getItem(STATION_LABELS_KEY));
  assert.deepEqual(labels.TORREJON, ['MADRID']);
  assert.equal(stationRouteActive(labels, parseLabelActivation(workspaceStorage.getItem(STATION_LABELS_ACTIVE_KEY)), 'TORREJON'), true);
  assignStationLabel('TORREJON', 'RUTA A2');
  labels = parseStationLabels(workspaceStorage.getItem(STATION_LABELS_KEY));
  assert.deepEqual(labels.TORREJON, ['MADRID', 'RUTA A2']);
  setStationRouteActive('SIN ASIGNAR', true);
  assert.equal(stationRouteActive(labels, {}, 'SIN ASIGNAR'), false);
  workspaceStorage.setItem(STATION_LABELS_KEY, '{"TORREJON":"MADRID"}');
  assignStationLabel('ALFAJARIN', 'RUTA A2');
  assert.equal(JSON.parse(workspaceStorage.getItem(STATION_LABELS_KEY)!).TORREJON, 'MADRID');
});
