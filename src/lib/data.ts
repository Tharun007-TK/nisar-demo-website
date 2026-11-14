import { CONFIG } from './config';
import type { BBox, BoundsQuad, WardsGeoJson } from './geo';

export interface MetaData {
  eventName: string;
  region: string;
  bbox: BBox;
  preDate: string;
  postDate: string;
  mock: boolean;
}

export interface OverlaySpec {
  url: string;
  bounds: BoundsQuad;
}

export type OverlayKey =
  | 'hh_pre'
  | 'hh_post'
  | 'hv_pre'
  | 'hv_post'
  | 'flood_mask'
  | 'cropland'
  | 'buildings';

export type OverlaysData = Record<OverlayKey, OverlaySpec>;

export interface ValidationMetrics {
  iou: number;
  precision: number;
  recall: number;
  notes: string[];
}

export interface StatsData {
  floodedKm2: number;
  croplandKm2: number;
  buildingsExposed: number;
  validation: ValidationMetrics;
}

export interface RainfallPoint {
  date: string;
  mm: number;
}

export interface RainfallData {
  rainfall: RainfallPoint[];
  nisarAcquisitions: string[];
}

export interface DashboardData {
  meta: MetaData;
  overlays: OverlaysData;
  stats: StatsData;
  wards: WardsGeoJson;
  rainfall: RainfallData;
}

const REQUIRED_OVERLAY_KEYS: OverlayKey[] = [
  'hh_pre',
  'hh_post',
  'hv_pre',
  'hv_post',
  'flood_mask',
  'cropland',
  'buildings',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateMeta(raw: unknown): MetaData {
  if (!isRecord(raw)) {
    throw new Error('meta.json is missing or invalid JSON object.');
  }
  if (typeof raw.eventName !== 'string' || typeof raw.region !== 'string') {
    throw new Error('meta.json must include eventName and region strings.');
  }
  if (
    !Array.isArray(raw.bbox) ||
    raw.bbox.length !== 4 ||
    !raw.bbox.every(isFiniteNumber)
  ) {
    throw new Error('meta.json bbox must be a 4-number array [W, S, E, N].');
  }
  if (typeof raw.preDate !== 'string' || typeof raw.postDate !== 'string') {
    throw new Error('meta.json must include preDate and postDate.');
  }
  return {
    eventName: raw.eventName,
    region: raw.region,
    bbox: raw.bbox as BBox,
    preDate: raw.preDate,
    postDate: raw.postDate,
    mock: Boolean(raw.mock),
  };
}

export function validateOverlays(raw: unknown): OverlaysData {
  if (!isRecord(raw)) {
    throw new Error('overlays.json is missing or invalid.');
  }
  const result = {} as OverlaysData;
  for (const key of REQUIRED_OVERLAY_KEYS) {
    const entry = raw[key];
    if (!isRecord(entry) || typeof entry.url !== 'string' || !Array.isArray(entry.bounds) || entry.bounds.length !== 4) {
      throw new Error(`overlays.json is missing valid entry for "${key}".`);
    }
    const validBounds = entry.bounds.every(
      (pt) => Array.isArray(pt) && pt.length === 2 && isFiniteNumber(pt[0]) && isFiniteNumber(pt[1])
    );
    if (!validBounds) {
      throw new Error(`overlays.json entry "${key}" has malformed bounds.`);
    }
    result[key] = {
      url: entry.url,
      bounds: entry.bounds as BoundsQuad,
    };
  }
  return result;
}

export function validateStats(raw: unknown): StatsData {
  if (!isRecord(raw)) {
    throw new Error('stats.json is missing or invalid.');
  }
  if (
    !isFiniteNumber(raw.floodedKm2) ||
    !isFiniteNumber(raw.croplandKm2) ||
    !isFiniteNumber(raw.buildingsExposed)
  ) {
    throw new Error('stats.json must include numeric floodedKm2, croplandKm2, and buildingsExposed.');
  }
  if (!isRecord(raw.validation)) {
    throw new Error('stats.json must include validation metrics.');
  }
  const v = raw.validation;
  if (!isFiniteNumber(v.iou) || !isFiniteNumber(v.precision) || !isFiniteNumber(v.recall)) {
    throw new Error('stats.json validation must include numeric iou, precision, and recall.');
  }
  const notes = Array.isArray(v.notes) ? v.notes.filter((n): n is string => typeof n === 'string') : [];
  return {
    floodedKm2: raw.floodedKm2,
    croplandKm2: raw.croplandKm2,
    buildingsExposed: raw.buildingsExposed,
    validation: {
      iou: v.iou,
      precision: v.precision,
      recall: v.recall,
      notes,
    },
  };
}

export function validateWards(raw: unknown): WardsGeoJson {
  if (!isRecord(raw) || raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) {
    throw new Error('wards.geojson must be a GeoJSON FeatureCollection.');
  }
  for (const f of raw.features) {
    if (!isRecord(f) || !isRecord(f.properties) || !isRecord(f.geometry)) {
      throw new Error('wards.geojson contains a malformed feature.');
    }
    if (
      typeof f.properties.name !== 'string' ||
      !isFiniteNumber(f.properties.floodedPct) ||
      !isFiniteNumber(f.properties.croplandKm2) ||
      !isFiniteNumber(f.properties.buildingsExposed)
    ) {
      throw new Error('wards.geojson feature properties must include name, floodedPct, croplandKm2, buildingsExposed.');
    }
  }
  return raw as unknown as WardsGeoJson;
}

export function validateRainfall(raw: unknown): RainfallData {
  if (Array.isArray(raw)) {
    return {
      rainfall: raw.filter(
        (d): d is RainfallPoint =>
          isRecord(d) && typeof d.date === 'string' && isFiniteNumber(d.mm)
      ),
      nisarAcquisitions: [],
    };
  }
  if (!isRecord(raw)) {
    throw new Error('rainfall.json is missing or invalid.');
  }
  const seriesCandidate = raw.rainfall ?? raw.daily ?? raw.days ?? raw.data;
  if (!Array.isArray(seriesCandidate)) {
    throw new Error('rainfall.json must include a rainfall array of { date, mm }.');
  }
  const rainfall: RainfallPoint[] = seriesCandidate.map((item) => {
    if (!isRecord(item) || typeof item.date !== 'string' || !isFiniteNumber(item.mm)) {
      throw new Error('rainfall.json contains an invalid { date, mm } entry.');
    }
    return { date: item.date, mm: item.mm };
  });
  const nisarAcquisitions = Array.isArray(raw.nisarAcquisitions)
    ? raw.nisarAcquisitions.filter((d): d is string => typeof d === 'string')
    : [];

  return { rainfall, nisarAcquisitions };
}

export function parseDashboardBundle(raw: {
  meta: unknown;
  overlays: unknown;
  stats: unknown;
  wards: unknown;
  rainfall: unknown;
}): DashboardData {
  return {
    meta: validateMeta(raw.meta),
    overlays: validateOverlays(raw.overlays),
    stats: validateStats(raw.stats),
    wards: validateWards(raw.wards),
    rainfall: validateRainfall(raw.rainfall),
  };
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (HTTP ${response.status})`);
  }
  return response.json();
}

export async function loadDashboardData(
  basePath: string = CONFIG.DATA_BASE_PATH,
  signal?: AbortSignal
): Promise<DashboardData> {
  // Support ?simulateError=1 query param for deterministic error-state verification
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('simulateError') === '1') {
      throw new Error('Simulated missing data file: /data/stats.json returned HTTP 404.');
    }
  }

  const [meta, overlays, stats, wards, rainfall] = await Promise.all([
    fetchJson(`${basePath}/meta.json`, signal),
    fetchJson(`${basePath}/overlays.json`, signal),
    fetchJson(`${basePath}/stats.json`, signal),
    fetchJson(`${basePath}/wards.geojson`, signal),
    fetchJson(`${basePath}/rainfall.json`, signal),
  ]);

  return parseDashboardBundle({ meta, overlays, stats, wards, rainfall });
}
