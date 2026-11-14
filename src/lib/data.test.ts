import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseDashboardBundle } from './data';

function loadJsonFromPublic(file: string): unknown {
  const fullPath = path.resolve(process.cwd(), 'public', 'data', file);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

test('parseDashboardBundle validates generated /public/data mock bundle cleanly', () => {
  const parsed = parseDashboardBundle({
    meta: loadJsonFromPublic('meta.json'),
    overlays: loadJsonFromPublic('overlays.json'),
    stats: loadJsonFromPublic('stats.json'),
    wards: loadJsonFromPublic('wards.geojson'),
    rainfall: loadJsonFromPublic('rainfall.json'),
  });

  assert.equal(parsed.meta.mock, true);
  assert.equal(parsed.meta.bbox.length, 4);
  assert.ok(parsed.wards.features.length >= 10);
  assert.ok(parsed.rainfall.rainfall.length > 0);
  assert.equal(parsed.rainfall.nisarAcquisitions.length, 2);
});

test('parseDashboardBundle throws descriptive error when a required overlay or stat is missing', () => {
  const overlays = loadJsonFromPublic('overlays.json') as Record<string, unknown>;
  const { flood_mask: _removed, ...incompleteOverlays } = overlays;

  assert.throws(
    () =>
      parseDashboardBundle({
        meta: loadJsonFromPublic('meta.json'),
        overlays: incompleteOverlays,
        stats: loadJsonFromPublic('stats.json'),
        wards: loadJsonFromPublic('wards.geojson'),
        rainfall: loadJsonFromPublic('rainfall.json'),
      }),
    /flood_mask/
  );
});
