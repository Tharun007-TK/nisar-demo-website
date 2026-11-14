export type LngLat = [number, number];
export type BoundsQuad = [LngLat, LngLat, LngLat, LngLat];
export type BBox = [number, number, number, number]; // [W, S, E, N]

export interface WardProperties {
  name: string;
  floodedPct: number;
  croplandKm2: number;
  buildingsExposed: number;
}

export interface WardFeature {
  type: 'Feature';
  id?: string | number;
  properties: WardProperties;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface WardsGeoJson {
  type: 'FeatureCollection';
  features: WardFeature[];
}

export interface RankedWard extends WardProperties {
  rank: number;
  featureIndex: number;
  bbox: BBox;
}

/**
 * Converts data-contract overlay bounds [[W,S],[E,S],[E,N],[W,N]]
 * to MapLibre ImageSource coordinate order [topLeft, topRight, bottomRight, bottomLeft]
 * i.e. [[W,N], [E,N], [E,S], [W,S]].
 */
export function boundsToMapLibreCoords(bounds: BoundsQuad): BoundsQuad {
  const lngs = bounds.map((p) => p[0]);
  const lats = bounds.map((p) => p[1]);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const south = Math.min(...lats);
  const north = Math.max(...lats);

  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];
}

function collectCoords(
  coords: number[][][] | number[][][][],
  type: 'Polygon' | 'MultiPolygon'
): LngLat[] {
  const pts: LngLat[] = [];
  if (type === 'Polygon') {
    for (const ring of coords as number[][][]) {
      for (const pt of ring) {
        pts.push([pt[0], pt[1]]);
      }
    }
  } else {
    for (const poly of coords as number[][][][]) {
      for (const ring of poly) {
        for (const pt of ring) {
          pts.push([pt[0], pt[1]]);
        }
      }
    }
  }
  return pts;
}

export function computeFeatureBBox(feature: WardFeature): BBox {
  const pts = collectCoords(feature.geometry.coordinates, feature.geometry.type);
  if (pts.length === 0) {
    return [0, 0, 0, 0];
  }
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of pts) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

export function computeBBoxCenter(bbox: BBox): LngLat {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

/**
 * Ranks wards by exposure (buildingsExposed desc, then floodedPct desc, then croplandKm2 desc).
 */
export function rankTopWards(geojson: WardsGeoJson, limit = 10): RankedWard[] {
  const mapped: RankedWard[] = geojson.features.map((feature, index) => ({
    name: feature.properties.name,
    floodedPct: feature.properties.floodedPct,
    croplandKm2: feature.properties.croplandKm2,
    buildingsExposed: feature.properties.buildingsExposed,
    rank: 0,
    featureIndex: index,
    bbox: computeFeatureBBox(feature),
  }));

  mapped.sort((a, b) => {
    if (b.buildingsExposed !== a.buildingsExposed) {
      return b.buildingsExposed - a.buildingsExposed;
    }
    if (b.floodedPct !== a.floodedPct) {
      return b.floodedPct - a.floodedPct;
    }
    return b.croplandKm2 - a.croplandKm2;
  });

  return mapped.slice(0, limit).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}
