import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Procedural mock data generator for the NISAR Flood Impact Dashboard.
 * Generates:
 *   - /public/data/meta.json
 *   - /public/data/overlays.json
 *   - /public/data/stats.json
 *   - /public/data/wards.geojson
 *   - /public/data/rainfall.json
 *   - /public/data/overlays/*.png (7 RGBA PNG overlays)
 *
 * Uses placeholder [BBOX] coordinates and synthetic SAR backscatter textures.
 * All outputs are explicitly flagged as mock data (mock: true).
 */

const PUBLIC_DATA_DIR = path.resolve(process.cwd(), 'public', 'data');
const OVERLAYS_DIR = path.join(PUBLIC_DATA_DIR, 'overlays');

// [BBOX] placeholder: [West, South, East, North]
const BBOX: [number, number, number, number] = [91.62, 26.12, 91.86, 26.26];
const [WEST, SOUTH, EAST, NORTH] = BBOX;

const BOUNDS_RING: [[number, number], [number, number], [number, number], [number, number]] = [
  [WEST, SOUTH],
  [EAST, SOUTH],
  [EAST, NORTH],
  [WEST, NORTH],
];

const WIDTH = 512;
const HEIGHT = 512;

// Deterministic PRNG (Mulberry32) so mock artifacts are reproducible
function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 2D value noise for terrain, floodplain blobs, and vegetation patches
function hash2D(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise2D(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise2D(x * freq, y * freq, seed + i * 97);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return value / norm;
}

// Minimal CRC32 + PNG encoder using built-in Node zlib
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePngRgba(width: number, height: number, rgba: Uint8Array): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type None
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), rowStart + 1);
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

// Fictional meandering river centerline y(x) in normalized [0..1] image coords
function riverCenterY(nx: number): number {
  return (
    0.52 +
    0.16 * Math.sin(nx * Math.PI * 2.1 - 0.4) +
    0.06 * Math.cos(nx * Math.PI * 4.5 + 0.8)
  );
}

// Secondary northern tributary joining main stem near nx=0.58
function tributaryCenterY(nx: number): number {
  return 0.14 + (riverCenterY(0.58) - 0.14) * Math.pow(Math.min(1, nx / 0.58), 1.35);
}

interface TerrainSample {
  inRiver: boolean;
  inFlood: boolean;
  isDoubleBounce: boolean;
  isCropland: boolean;
  isBuilding: boolean;
  elevation: number;
}

function sampleTerrain(px: number, py: number): TerrainSample {
  const nx = px / WIDTH;
  const ny = py / HEIGHT;

  const rY = riverCenterY(nx);
  const distRiver = Math.abs(ny - rY);

  const tribActive = nx <= 0.6;
  const tY = tributaryCenterY(nx);
  const distTrib = tribActive ? Math.abs(ny - tY) : 1;

  const baseChannelWidth = 0.022 + 0.008 * Math.sin(nx * 14);
  const inRiver = distRiver < baseChannelWidth || (tribActive && distTrib < 0.011);

  const warp = (fbm(nx * 6.5, ny * 6.5, 42, 4) - 0.5) * 0.11;
  const blobField = fbm(nx * 4.2 + 3.1, ny * 4.2 + 1.7, 108, 4);
  const floodReach = 0.085 + 0.11 * blobField + 0.045 * Math.sin(nx * 9.0 + 0.5);
  const tribFloodReach = 0.042 + 0.04 * blobField;

  const inMainFlood = distRiver + warp < floodReach;
  const inTribFlood = nx <= 0.62 && distTrib + warp * 0.6 < tribFloodReach;
  // Isolated floodplain backwater lobes
  const lobe1 = Math.hypot(nx - 0.34, ny - 0.76) < 0.075 + 0.03 * blobField;
  const lobe2 = Math.hypot(nx - 0.74, ny - 0.30) < 0.068 + 0.03 * blobField;

  const inFlood = !inRiver && (inMainFlood || inTribFlood || lobe1 || lobe2);

  // Agricultural cropland parcels (rectangular grid modulated by noise)
  const cellX = Math.floor(nx * 18);
  const cellY = Math.floor(ny * 18);
  const parcelRand = hash2D(cellX, cellY, 777);
  const nearEdge = (nx * 18) % 1 < 0.08 || (ny * 18) % 1 < 0.08;
  const isCropland = !inRiver && !nearEdge && parcelRand > 0.56 && distRiver > 0.03 && distRiver < 0.34;

  // Flooded vegetation double-bounce fringe along flooded cropland
  const isDoubleBounce = inFlood && isCropland && fbm(nx * 16, ny * 16, 303, 2) > 0.44;

  // Urban settlement clusters near river crossings & higher banks
  const cluster1 = Math.hypot(nx - 0.25, ny - 0.42) < 0.085;
  const cluster2 = Math.hypot(nx - 0.54, ny - 0.50) < 0.095;
  const cluster3 = Math.hypot(nx - 0.78, ny - 0.48) < 0.080;
  const cluster4 = Math.hypot(nx - 0.42, ny - 0.28) < 0.065;
  const inUrbanZone = cluster1 || cluster2 || cluster3 || cluster4;

  const bCellX = Math.floor(nx * 72);
  const bCellY = Math.floor(ny * 72);
  const bRand = hash2D(bCellX, bCellY, 991);
  const bPad = (nx * 72) % 1 > 0.22 && (nx * 72) % 1 < 0.85 && (ny * 72) % 1 > 0.22 && (ny * 72) % 1 < 0.85;
  const isBuilding = !inRiver && inUrbanZone && bPad && bRand > 0.64;

  const elevation = fbm(nx * 3.5, ny * 3.5, 19, 4);
  return { inRiver, inFlood, isDoubleBounce, isCropland, isBuilding, elevation };
}

function generateOverlays() {
  fs.mkdirSync(OVERLAYS_DIR, { recursive: true });

  const hhPre = new Uint8Array(WIDTH * HEIGHT * 4);
  const hhPost = new Uint8Array(WIDTH * HEIGHT * 4);
  const hvPre = new Uint8Array(WIDTH * HEIGHT * 4);
  const hvPost = new Uint8Array(WIDTH * HEIGHT * 4);
  const floodMask = new Uint8Array(WIDTH * HEIGHT * 4);
  const cropland = new Uint8Array(WIDTH * HEIGHT * 4);
  const buildings = new Uint8Array(WIDTH * HEIGHT * 4);

  const rng = createRng(20261114);

  // Multiplicative gamma-like SAR speckle sample
  const speckle = (strength: number) => {
    const u1 = Math.max(1e-4, rng());
    const u2 = Math.max(1e-4, rng());
    const expSample = (-Math.log(u1) - Math.log(u2)) * 0.5;
    return 1 + (expSample - 1) * strength;
  };

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const idx = (y * WIDTH + x) * 4;
      const t = sampleTerrain(x, y);

      // Baseline HH backscatter intensity [0..255] mapped from [-25 dB .. 0 dB]
      let baseHh = 72 + t.elevation * 58;
      if (t.isCropland) baseHh += 24;
      if (t.isBuilding) baseHh = 215;
      if (t.inRiver) baseHh = 16;

      // Baseline HV (lower co-to-cross ratio, stronger vegetation response)
      let baseHv = 50 + t.elevation * 42;
      if (t.isCropland) baseHv += 42;
      if (t.isBuilding) baseHv = 165;
      if (t.inRiver) baseHv = 12;

      const spPre = speckle(0.38);
      const valHhPre = clampByte(baseHh * spPre);
      const valHvPre = clampByte(baseHv * speckle(0.42));

      hhPre[idx] = valHhPre;
      hhPre[idx + 1] = valHhPre;
      hhPre[idx + 2] = valHhPre;
      hhPre[idx + 3] = 225;

      hvPre[idx] = valHvPre;
      hvPre[idx + 1] = valHvPre;
      hvPre[idx + 2] = valHvPre;
      hvPre[idx + 3] = 225;

      // Post-flood backscatter: open floodwater drops sharply, double-bounce spikes
      let postHh = baseHh;
      let postHv = baseHv;

      if (t.inFlood) {
        if (t.isDoubleBounce) {
          postHh = 232;
          postHv = 148;
        } else {
          postHh = 18;
          postHv = 14;
        }
      }

      const valHhPost = clampByte(postHh * speckle(0.38));
      const valHvPost = clampByte(postHv * speckle(0.42));

      hhPost[idx] = valHhPost;
      hhPost[idx + 1] = valHhPost;
      hhPost[idx + 2] = valHhPost;
      hhPost[idx + 3] = 225;

      hvPost[idx] = valHvPost;
      hvPost[idx + 1] = valHvPost;
      hvPost[idx + 2] = valHvPost;
      hvPost[idx + 3] = 225;

      // Semantic masks (transparent where inactive)
      if (t.inFlood || t.inRiver) {
        floodMask[idx] = 14; // #0EA5E9 sky-500 water accent
        floodMask[idx + 1] = 165;
        floodMask[idx + 2] = 233;
        floodMask[idx + 3] = t.inFlood ? 195 : 135;
      }

      if (t.isCropland) {
        cropland[idx] = 245; // #F59E0B amber-500 cropland accent
        cropland[idx + 1] = 158;
        cropland[idx + 2] = 11;
        cropland[idx + 3] = t.inFlood ? 210 : 125;
      }

      if (t.isBuilding) {
        buildings[idx] = 239; // #EF4444 red-500 exposed buildings
        buildings[idx + 1] = 68;
        buildings[idx + 2] = 68;
        buildings[idx + 3] = t.inFlood ? 245 : 175;
      }
    }
  }

  const files: Array<[string, Uint8Array]> = [
    ['hh_pre.png', hhPre],
    ['hh_post.png', hhPost],
    ['hv_pre.png', hvPre],
    ['hv_post.png', hvPost],
    ['flood_mask.png', floodMask],
    ['cropland.png', cropland],
    ['buildings.png', buildings],
  ];

  for (const [name, buf] of files) {
    fs.writeFileSync(path.join(OVERLAYS_DIR, name), encodePngRgba(WIDTH, HEIGHT, buf));
  }
}

function buildWardsGeoJson() {
  // 12 mock administrative wards arranged in a 4x3 grid over BBOX
  const cols = 4;
  const rows = 3;
  const dx = (EAST - WEST) / cols;
  const dy = (NORTH - SOUTH) / rows;

  const wardSpecs = [
    { name: 'Ward 01 - West Channel', floodedPct: 48.6, croplandKm2: 6.4, buildingsExposed: 612 },
    { name: 'Ward 02 - North Tributary', floodedPct: 31.2, croplandKm2: 4.1, buildingsExposed: 245 },
    { name: 'Ward 03 - Confluence North', floodedPct: 42.9, croplandKm2: 5.8, buildingsExposed: 488 },
    { name: 'Ward 04 - East Oxbow', floodedPct: 26.4, croplandKm2: 3.9, buildingsExposed: 194 },
    { name: 'Ward 05 - Riverbend Crossing', floodedPct: 54.8, croplandKm2: 4.6, buildingsExposed: 834 },
    { name: 'Ward 06 - Central Floodplain', floodedPct: 61.3, croplandKm2: 8.2, buildingsExposed: 1120 },
    { name: 'Ward 07 - Old Market Bank', floodedPct: 39.5, croplandKm2: 2.7, buildingsExposed: 745 },
    { name: 'Ward 08 - Lower Levee East', floodedPct: 44.1, croplandKm2: 5.3, buildingsExposed: 530 },
    { name: 'Ward 09 - South Backwater', floodedPct: 37.8, croplandKm2: 7.1, buildingsExposed: 318 },
    { name: 'Ward 10 - Paddy Terrace', floodedPct: 29.4, croplandKm2: 6.9, buildingsExposed: 162 },
    { name: 'Ward 11 - Canal Basin', floodedPct: 19.7, croplandKm2: 3.2, buildingsExposed: 118 },
    { name: 'Ward 12 - Upland Ridge', floodedPct: 11.4, croplandKm2: 1.8, buildingsExposed: 64 },
  ];

  const features = wardSpecs.map((spec, idx) => {
    const col = idx % cols;
    const row = rows - 1 - Math.floor(idx / cols); // top-to-bottom
    const w = WEST + col * dx;
    const e = w + dx;
    const s = SOUTH + row * dy;
    const n = s + dy;
    // Slight inward inset & chamfered corner jitter for realistic ward shapes
    const padX = dx * 0.03;
    const padY = dy * 0.03;
    const midX = (w + e) / 2;
    const jitter = ((idx % 3) - 1) * dy * 0.04;

    const ring: [number, number][] = [
      [Number((w + padX).toFixed(5)), Number((s + padY).toFixed(5))],
      [Number((midX).toFixed(5)), Number((s + padY + jitter).toFixed(5))],
      [Number((e - padX).toFixed(5)), Number((s + padY).toFixed(5))],
      [Number((e - padX).toFixed(5)), Number((n - padY).toFixed(5))],
      [Number((midX).toFixed(5)), Number((n - padY - jitter).toFixed(5))],
      [Number((w + padX).toFixed(5)), Number((n - padY).toFixed(5))],
      [Number((w + padX).toFixed(5)), Number((s + padY).toFixed(5))],
    ];

    return {
      type: 'Feature',
      id: idx + 1,
      properties: {
        name: spec.name,
        floodedPct: spec.floodedPct,
        croplandKm2: spec.croplandKm2,
        buildingsExposed: spec.buildingsExposed,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

function main() {
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  generateOverlays();

  const meta = {
    eventName: 'Simulated Monsoon Flood Event (Mock AOI)',
    region: 'Synthetic River Basin — Placeholder [BBOX]',
    bbox: BBOX,
    preDate: '2026-10-08',
    postDate: '2026-10-20',
    mock: true,
  };

  const overlays = {
    hh_pre: { url: '/data/overlays/hh_pre.png', bounds: BOUNDS_RING },
    hh_post: { url: '/data/overlays/hh_post.png', bounds: BOUNDS_RING },
    hv_pre: { url: '/data/overlays/hv_pre.png', bounds: BOUNDS_RING },
    hv_post: { url: '/data/overlays/hv_post.png', bounds: BOUNDS_RING },
    flood_mask: { url: '/data/overlays/flood_mask.png', bounds: BOUNDS_RING },
    cropland: { url: '/data/overlays/cropland.png', bounds: BOUNDS_RING },
    buildings: { url: '/data/overlays/buildings.png', bounds: BOUNDS_RING },
  };

  const wardsGeoJson = buildWardsGeoJson();
  const totalCropland = Number(
    wardsGeoJson.features.reduce((acc, f) => acc + f.properties.croplandKm2, 0).toFixed(1)
  );
  const totalBuildings = wardsGeoJson.features.reduce(
    (acc, f) => acc + f.properties.buildingsExposed,
    0
  );

  const stats = {
    floodedKm2: 142.8,
    croplandKm2: totalCropland,
    buildingsExposed: totalBuildings,
    validation: {
      iou: 0.74,
      precision: 0.83,
      recall: 0.87,
      notes: [
        'Dense urban blocks can trigger false-positive flood alerts from persistent corner-reflector double-bounce.',
        'Smooth asphalt runways and dry sandbars occasionally mimic open-water specular backscatter (<-22 dB).',
        '12-day NISAR repeat cycle may miss rapid flash-flood peaks occurring between descending/ascending passes.',
        'Validation metrics above are synthetic mock placeholders until ground-truth optical reference polygons are ingested.',
      ],
    },
  };

  const rainfall = {
    rainfall: [
      { date: '2026-10-06', mm: 6.2 },
      { date: '2026-10-07', mm: 11.4 },
      { date: '2026-10-08', mm: 4.8 },
      { date: '2026-10-09', mm: 14.0 },
      { date: '2026-10-10', mm: 28.5 },
      { date: '2026-10-11', mm: 46.3 },
      { date: '2026-10-12', mm: 68.9 },
      { date: '2026-10-13', mm: 94.2 },
      { date: '2026-10-14', mm: 118.6 },
      { date: '2026-10-15', mm: 82.1 },
      { date: '2026-10-16', mm: 54.0 },
      { date: '2026-10-17', mm: 39.4 },
      { date: '2026-10-18', mm: 27.8 },
      { date: '2026-10-19', mm: 19.5 },
      { date: '2026-10-20', mm: 12.1 },
      { date: '2026-10-21', mm: 7.4 },
      { date: '2026-10-22', mm: 3.9 },
    ],
    nisarAcquisitions: ['2026-10-08', '2026-10-20'],
  };

  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'overlays.json'), JSON.stringify(overlays, null, 2));
  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'stats.json'), JSON.stringify(stats, null, 2));
  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'wards.geojson'), JSON.stringify(wardsGeoJson, null, 2));
  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'rainfall.json'), JSON.stringify(rainfall, null, 2));

  console.log('Generated mock NISAR flood data in', PUBLIC_DATA_DIR);
}

main();
