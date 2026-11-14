import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boundsToMapLibreCoords,
  computeFeatureBBox,
  computeBBoxCenter,
  rankTopWards,
  type WardsGeoJson,
} from './geo';

test('boundsToMapLibreCoords converts [SW, SE, NE, NW] to MapLibre [NW, NE, SE, SW]', () => {
  const input: [[number, number], [number, number], [number, number], [number, number]] = [
    [91.62, 26.12], // SW
    [91.86, 26.12], // SE
    [91.86, 26.26], // NE
    [91.62, 26.26], // NW
  ];

  assert.deepEqual(boundsToMapLibreCoords(input), [
    [91.62, 26.26], // NW
    [91.86, 26.26], // NE
    [91.86, 26.12], // SE
    [91.62, 26.12], // SW
  ]);
});

test('computeFeatureBBox and computeBBoxCenter calculate polygon extents accurately', () => {
  const bbox = computeFeatureBBox({
    type: 'Feature',
    properties: { name: 'Ward A', floodedPct: 25, croplandKm2: 2.1, buildingsExposed: 100 },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [91.65, 26.14],
          [91.75, 26.14],
          [91.75, 26.20],
          [91.65, 26.20],
          [91.65, 26.14],
        ],
      ],
    },
  });

  assert.deepEqual(bbox, [91.65, 26.14, 91.75, 26.20]);
  const center = computeBBoxCenter(bbox);
  assert.ok(Math.abs(center[0] - 91.7) < 1e-9);
  assert.ok(Math.abs(center[1] - 26.17) < 1e-9);
});

test('rankTopWards sorts by buildingsExposed desc and limits to top N', () => {
  const geojson: WardsGeoJson = {
    type: 'FeatureCollection',
    features: Array.from({ length: 12 }, (_, idx) => ({
      type: 'Feature' as const,
      id: idx + 1,
      properties: {
        name: `Ward ${idx + 1}`,
        floodedPct: idx * 3.5,
        croplandKm2: 1.5,
        buildingsExposed: idx === 5 ? 900 : (idx + 1) * 50,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [91.62, 26.12],
            [91.64, 26.12],
            [91.64, 26.14],
            [91.62, 26.14],
            [91.62, 26.12],
          ],
        ],
      },
    })),
  };

  const top10 = rankTopWards(geojson, 10);
  assert.equal(top10.length, 10);
  assert.equal(top10[0].name, 'Ward 6');
  assert.equal(top10[0].rank, 1);
  assert.equal(top10[0].buildingsExposed, 900);
  assert.equal(top10[1].buildingsExposed, 600);
  assert.equal(top10[9].rank, 10);
});
