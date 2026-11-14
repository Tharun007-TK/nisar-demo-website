/**
 * Central dashboard configuration.
 * Set VITE_USE_MOCK=false when serving verified operational NISAR outputs under /public/data.
 */
const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export const USE_MOCK: boolean =
  viteEnv?.VITE_USE_MOCK !== undefined ? viteEnv.VITE_USE_MOCK !== 'false' : true;

export const CONFIG = {
  USE_MOCK,
  DATA_BASE_PATH: '/data',
  GITHUB_URL: 'https://github.com/nasa-space-apps/nisar-flood-impact',
  METHOD_URL: 'https://nisar.jpl.nasa.gov/mission/get-to-know-sar/flood-mapping/',
  BASEMAP: {
    name: 'Esri Dark Gray Canvas',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    ],
    referenceTiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    ],
    tileSize: 256,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  },
} as const;
