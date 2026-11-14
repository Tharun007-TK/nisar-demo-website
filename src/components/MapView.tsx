import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import Compare from '@maplibre/maplibre-gl-compare';
import { AlertTriangle, RotateCcw } from 'lucide-react';

maplibregl.setWorkerUrl(maplibreWorkerUrl);
import { CONFIG } from '../lib/config';
import type { MetaData, OverlaysData } from '../lib/data';
import {
  boundsToMapLibreCoords,
  computeBBoxCenter,
  computeFeatureBBox,
  type BBox,
  type WardsGeoJson,
} from '../lib/geo';

export type Polarization = 'HH' | 'HV';

export interface LayerVisibility {
  floodMask: boolean;
  cropland: boolean;
  buildings: boolean;
  wards: boolean;
}

interface MapViewProps {
  meta: MetaData;
  overlays: OverlaysData;
  wards: WardsGeoJson;
  hoveredWardName: string | null;
  selectedWardName: string | null;
  zoomTargetBBox: BBox | null;
  zoomSeq: number;
  onSelectWardByName: (name: string | null) => void;
  onHoverWardByName: (name: string | null) => void;
  onResetWardSelection: () => void;
}

function buildDarkRasterStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      'esri-dark-base': {
        type: 'raster',
        tiles: [...CONFIG.BASEMAP.tiles],
        tileSize: CONFIG.BASEMAP.tileSize,
        attribution: CONFIG.BASEMAP.attribution,
        maxzoom: 16,
      },
      'esri-dark-ref': {
        type: 'raster',
        tiles: [...CONFIG.BASEMAP.referenceTiles],
        tileSize: CONFIG.BASEMAP.tileSize,
        maxzoom: 16,
      },
    },
    layers: [
      {
        id: 'esri-dark-base-layer',
        type: 'raster',
        source: 'esri-dark-base',
        paint: {
          'raster-opacity': 1,
        },
      },
      {
        id: 'esri-dark-ref-layer',
        type: 'raster',
        source: 'esri-dark-ref',
        paint: {
          'raster-opacity': 0.75,
        },
      },
    ],
  };
}

function setLayerVisibility(map: MapLibreMap, layerId: string, visible: boolean) {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
}

function setRasterOpacity(map: MapLibreMap, layerId: string, opacity: number) {
  if (!map.getLayer(layerId)) return;
  map.setPaintProperty(layerId, 'raster-opacity', opacity);
}

export function MapView({
  meta,
  overlays,
  wards,
  hoveredWardName,
  selectedWardName,
  zoomTargetBBox,
  zoomSeq,
  onSelectWardByName,
  onHoverWardByName,
  onResetWardSelection,
}: MapViewProps) {
  const compareContainerRef = useRef<HTMLDivElement | null>(null);
  const beforeContainerRef = useRef<HTMLDivElement | null>(null);
  const afterContainerRef = useRef<HTMLDivElement | null>(null);

  const beforeMapRef = useRef<MapLibreMap | null>(null);
  const afterMapRef = useRef<MapLibreMap | null>(null);
  const compareRef = useRef<Compare | null>(null);

  const [polarization, setPolarization] = useState<Polarization>('HH');
  const [layers, setLayers] = useState<LayerVisibility>({
    floodMask: true,
    cropland: true,
    buildings: true,
    wards: true,
  });
  const [opacityPct, setOpacityPct] = useState<number>(80);
  const [mapsReady, setMapsReady] = useState(false);

  // Keep latest callbacks in refs so MapLibre listeners never go stale
  const onSelectWardRef = useRef(onSelectWardByName);
  const onHoverWardRef = useRef(onHoverWardByName);
  onSelectWardRef.current = onSelectWardByName;
  onHoverWardRef.current = onHoverWardByName;

  // Keep latest state in refs for initial load synchronization
  const stateRef = useRef({ polarization, layers, opacityPct });
  stateRef.current = { polarization, layers, opacityPct };

  useEffect(() => {
    const compareEl = compareContainerRef.current;
    const beforeEl = beforeContainerRef.current;
    const afterEl = afterContainerRef.current;
    if (!compareEl || !beforeEl || !afterEl) return;

    const center = computeBBoxCenter(meta.bbox);
    const bounds: [[number, number], [number, number]] = [
      [meta.bbox[0], meta.bbox[1]],
      [meta.bbox[2], meta.bbox[3]],
    ];

    const beforeMap = new maplibregl.Map({
      container: beforeEl,
      style: buildDarkRasterStyle(),
      center,
      zoom: 11,
      attributionControl: false,
    });

    const afterMap = new maplibregl.Map({
      container: afterEl,
      style: buildDarkRasterStyle(),
      center,
      zoom: 11,
      attributionControl: false,
    });

    beforeMap.addControl(
      new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }),
      'bottom-left'
    );
    afterMap.addControl(
      new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }),
      'bottom-left'
    );
    afterMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    afterMap.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    const compare = new Compare(beforeMap, afterMap, compareEl, {
      orientation: 'vertical',
      mousemove: false,
    });

    const swiperHandle = compareEl.querySelector<HTMLElement>('.compare-swiper-vertical');
    const handleSwiperKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      const width = compareEl.getBoundingClientRect().width;
      const step = ev.shiftKey ? 80 : 32;
      const delta = ev.key === 'ArrowLeft' ? -step : step;
      const nextPos = Math.max(0, Math.min(width, compare.currentPosition + delta));
      compare.setSlider(nextPos);
      swiperHandle?.setAttribute('aria-valuenow', String(Math.round((nextPos / Math.max(1, width)) * 100)));
    };
    if (swiperHandle) {
      swiperHandle.setAttribute('tabindex', '0');
      swiperHandle.setAttribute('role', 'slider');
      swiperHandle.setAttribute('aria-label', 'Swipe between pre-flood and post-flood radar maps');
      swiperHandle.setAttribute('aria-valuemin', '0');
      swiperHandle.setAttribute('aria-valuemax', '100');
      swiperHandle.setAttribute('aria-valuenow', '50');
      swiperHandle.addEventListener('keydown', handleSwiperKeyDown);
    }

    beforeMapRef.current = beforeMap;
    afterMapRef.current = afterMap;
    compareRef.current = compare;

    let beforeLoaded = false;
    let afterLoaded = false;

    const addWardLayers = (map: MapLibreMap, interactive: boolean) => {
      map.addSource('wards-src', {
        type: 'geojson',
        data: wards as unknown as maplibregl.GeoJSONSourceSpecification['data'],
      });

      map.addLayer({
        id: 'wards-fill',
        type: 'fill',
        source: 'wards-src',
        paint: {
          'fill-color': '#0EA5E9',
          'fill-opacity': 0.0,
        },
      });

      map.addLayer({
        id: 'wards-highlight-fill',
        type: 'fill',
        source: 'wards-src',
        filter: ['==', ['get', 'name'], ''],
        paint: {
          'fill-color': '#38BDF8',
          'fill-opacity': 0.22,
        },
      });

      map.addLayer({
        id: 'wards-outline',
        type: 'line',
        source: 'wards-src',
        paint: {
          'line-color': '#94A3B8',
          'line-width': 1.25,
          'line-dasharray': [3, 2],
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'wards-highlight-outline',
        type: 'line',
        source: 'wards-src',
        filter: ['==', ['get', 'name'], ''],
        paint: {
          'line-color': '#F8FAFC',
          'line-width': 2.5,
          'line-opacity': 1,
        },
      });

      if (interactive) {
        map.on('mousemove', 'wards-fill', (e) => {
          const feature = e.features?.[0];
          const name = feature?.properties?.name;
          if (typeof name === 'string') {
            map.getCanvas().style.cursor = 'pointer';
            onHoverWardRef.current(name);
          }
        });
        map.on('mouseleave', 'wards-fill', () => {
          map.getCanvas().style.cursor = '';
          onHoverWardRef.current(null);
        });
        map.on('click', 'wards-fill', (e) => {
          const feature = e.features?.[0];
          const name = feature?.properties?.name;
          if (typeof name === 'string') {
            const matched = wards.features.find((w) => w.properties.name === name);
            if (matched) {
              const fb = computeFeatureBBox(matched);
              afterMap.fitBounds(
                [
                  [fb[0], fb[1]],
                  [fb[2], fb[3]],
                ],
                { padding: 56, duration: 550 }
              );
            }
            onSelectWardRef.current(name);
          }
        });
      }
    };

    const syncInitialVisibility = () => {
      if (!beforeLoaded || !afterLoaded) return;
      const { polarization: pol, layers: vis, opacityPct: op } = stateRef.current;
      const alpha = op / 100;

      setLayerVisibility(beforeMap, 'sar-hh-pre-layer', pol === 'HH');
      setLayerVisibility(beforeMap, 'sar-hv-pre-layer', pol === 'HV');
      setRasterOpacity(beforeMap, 'sar-hh-pre-layer', alpha);
      setRasterOpacity(beforeMap, 'sar-hv-pre-layer', alpha);
      setLayerVisibility(beforeMap, 'wards-outline', vis.wards);

      setLayerVisibility(afterMap, 'sar-hh-post-layer', pol === 'HH');
      setLayerVisibility(afterMap, 'sar-hv-post-layer', pol === 'HV');
      setRasterOpacity(afterMap, 'sar-hh-post-layer', alpha);
      setRasterOpacity(afterMap, 'sar-hv-post-layer', alpha);

      setLayerVisibility(afterMap, 'flood-mask-layer', vis.floodMask);
      setLayerVisibility(afterMap, 'cropland-layer', vis.cropland);
      setLayerVisibility(afterMap, 'buildings-layer', vis.buildings);
      setLayerVisibility(afterMap, 'wards-outline', vis.wards);

      setRasterOpacity(afterMap, 'flood-mask-layer', alpha);
      setRasterOpacity(afterMap, 'cropland-layer', alpha);
      setRasterOpacity(afterMap, 'buildings-layer', Math.min(1, alpha + 0.12));

      setMapsReady(true);
    };

    beforeMap.on('load', () => {
      beforeMap.fitBounds(bounds, { padding: 40, duration: 0 });

      beforeMap.addSource('sar-hh-pre-src', {
        type: 'image',
        url: overlays.hh_pre.url,
        coordinates: boundsToMapLibreCoords(overlays.hh_pre.bounds),
      });
      beforeMap.addLayer({
        id: 'sar-hh-pre-layer',
        type: 'raster',
        source: 'sar-hh-pre-src',
        paint: { 'raster-opacity': 0.8, 'raster-fade-duration': 0 },
      });

      beforeMap.addSource('sar-hv-pre-src', {
        type: 'image',
        url: overlays.hv_pre.url,
        coordinates: boundsToMapLibreCoords(overlays.hv_pre.bounds),
      });
      beforeMap.addLayer({
        id: 'sar-hv-pre-layer',
        type: 'raster',
        source: 'sar-hv-pre-src',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 0.8, 'raster-fade-duration': 0 },
      });

      addWardLayers(beforeMap, false);
      beforeLoaded = true;
      syncInitialVisibility();
    });

    afterMap.on('load', () => {
      afterMap.fitBounds(bounds, { padding: 40, duration: 0 });

      afterMap.addSource('sar-hh-post-src', {
        type: 'image',
        url: overlays.hh_post.url,
        coordinates: boundsToMapLibreCoords(overlays.hh_post.bounds),
      });
      afterMap.addLayer({
        id: 'sar-hh-post-layer',
        type: 'raster',
        source: 'sar-hh-post-src',
        paint: { 'raster-opacity': 0.8, 'raster-fade-duration': 0 },
      });

      afterMap.addSource('sar-hv-post-src', {
        type: 'image',
        url: overlays.hv_post.url,
        coordinates: boundsToMapLibreCoords(overlays.hv_post.bounds),
      });
      afterMap.addLayer({
        id: 'sar-hv-post-layer',
        type: 'raster',
        source: 'sar-hv-post-src',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 0.8, 'raster-fade-duration': 0 },
      });

      afterMap.addSource('flood-mask-src', {
        type: 'image',
        url: overlays.flood_mask.url,
        coordinates: boundsToMapLibreCoords(overlays.flood_mask.bounds),
      });
      afterMap.addLayer({
        id: 'flood-mask-layer',
        type: 'raster',
        source: 'flood-mask-src',
        paint: { 'raster-opacity': 0.8, 'raster-fade-duration': 0 },
      });

      afterMap.addSource('cropland-src', {
        type: 'image',
        url: overlays.cropland.url,
        coordinates: boundsToMapLibreCoords(overlays.cropland.bounds),
      });
      afterMap.addLayer({
        id: 'cropland-layer',
        type: 'raster',
        source: 'cropland-src',
        paint: { 'raster-opacity': 0.8, 'raster-fade-duration': 0 },
      });

      afterMap.addSource('buildings-src', {
        type: 'image',
        url: overlays.buildings.url,
        coordinates: boundsToMapLibreCoords(overlays.buildings.bounds),
      });
      afterMap.addLayer({
        id: 'buildings-layer',
        type: 'raster',
        source: 'buildings-src',
        paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 },
      });

      addWardLayers(afterMap, true);
      afterLoaded = true;
      syncInitialVisibility();
    });

    let lastWidth = compareEl.getBoundingClientRect().width;
    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = compareEl.getBoundingClientRect().width;
      if (lastWidth > 0 && nextWidth > 0 && nextWidth !== lastWidth) {
        const ratio = compare.currentPosition / lastWidth;
        compare.setSlider(Math.max(16, Math.min(nextWidth - 16, ratio * nextWidth)));
        lastWidth = nextWidth;
      }
      beforeMap.resize();
      afterMap.resize();
    });
    resizeObserver.observe(compareEl);

    return () => {
      swiperHandle?.removeEventListener('keydown', handleSwiperKeyDown);
      resizeObserver.disconnect();
      compare.remove();
      beforeMap.remove();
      afterMap.remove();
      beforeMapRef.current = null;
      afterMapRef.current = null;
      compareRef.current = null;
    };
  }, [meta, overlays, wards]);

  // Sync polarization, layer visibility, and opacity changes
  useEffect(() => {
    if (!mapsReady) return;
    const beforeMap = beforeMapRef.current;
    const afterMap = afterMapRef.current;
    if (!beforeMap || !afterMap) return;

    const alpha = opacityPct / 100;

    setLayerVisibility(beforeMap, 'sar-hh-pre-layer', polarization === 'HH');
    setLayerVisibility(beforeMap, 'sar-hv-pre-layer', polarization === 'HV');
    setRasterOpacity(beforeMap, 'sar-hh-pre-layer', alpha);
    setRasterOpacity(beforeMap, 'sar-hv-pre-layer', alpha);
    setLayerVisibility(beforeMap, 'wards-outline', layers.wards);

    setLayerVisibility(afterMap, 'sar-hh-post-layer', polarization === 'HH');
    setLayerVisibility(afterMap, 'sar-hv-post-layer', polarization === 'HV');
    setRasterOpacity(afterMap, 'sar-hh-post-layer', alpha);
    setRasterOpacity(afterMap, 'sar-hv-post-layer', alpha);

    setLayerVisibility(afterMap, 'flood-mask-layer', layers.floodMask);
    setLayerVisibility(afterMap, 'cropland-layer', layers.cropland);
    setLayerVisibility(afterMap, 'buildings-layer', layers.buildings);
    setLayerVisibility(afterMap, 'wards-outline', layers.wards);

    setRasterOpacity(afterMap, 'flood-mask-layer', alpha);
    setRasterOpacity(afterMap, 'cropland-layer', alpha);
    setRasterOpacity(afterMap, 'buildings-layer', Math.min(1, alpha + 0.12));
  }, [mapsReady, polarization, layers, opacityPct]);

  // Sync ward hover & selection highlight across both maps
  useEffect(() => {
    if (!mapsReady) return;
    const activeName = hoveredWardName ?? selectedWardName ?? '';
    const filterExpr: maplibregl.FilterSpecification = ['==', ['get', 'name'], activeName];

    [beforeMapRef.current, afterMapRef.current].forEach((map) => {
      if (!map) return;
      if (map.getLayer('wards-highlight-fill')) {
        map.setFilter('wards-highlight-fill', filterExpr);
      }
      if (map.getLayer('wards-highlight-outline')) {
        map.setFilter('wards-highlight-outline', filterExpr);
      }
    });
  }, [mapsReady, hoveredWardName, selectedWardName]);

  // Zoom to ward when clicked in table
  useEffect(() => {
    if (!mapsReady || !zoomTargetBBox || zoomSeq === 0) return;
    const afterMap = afterMapRef.current;
    if (!afterMap) return;
    afterMap.fitBounds(
      [
        [zoomTargetBBox[0], zoomTargetBBox[1]],
        [zoomTargetBBox[2], zoomTargetBBox[3]],
      ],
      { padding: 64, duration: 600 }
    );
  }, [mapsReady, zoomTargetBBox, zoomSeq]);

  const handleResetView = () => {
    onResetWardSelection();
    const afterMap = afterMapRef.current;
    if (!afterMap) return;
    afterMap.fitBounds(
      [
        [meta.bbox[0], meta.bbox[1]],
        [meta.bbox[2], meta.bbox[3]],
      ],
      { padding: 40, duration: 500 }
    );
  };

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section
      aria-label="Interactive SAR flood comparison map"
      className="flex min-h-[520px] flex-1 flex-col bg-[#07090E] lg:min-h-0"
    >
      {/* Controls Bar Above the Map */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-800 bg-[#0E131D] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Polarization HH/HV Toggle */}
          <div
            role="group"
            aria-label="Radar polarization mode"
            className="inline-flex rounded border border-slate-700 bg-[#07090E] p-0.5"
          >
            {(['HH', 'HV'] as const).map((pol) => {
              const active = polarization === pol;
              return (
                <button
                  key={pol}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPolarization(pol)}
                  className={`whitespace-nowrap shrink-0 rounded-xs px-2.5 py-1 font-mono text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                    active
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {pol}
                </button>
              );
            })}
          </div>

          {/* Layer Toggles */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Map overlay layers">
            <button
              type="button"
              aria-pressed={layers.floodMask}
              onClick={() => toggleLayer('floodMask')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                layers.floodMask
                  ? 'border-sky-500/60 bg-sky-500/15 text-sky-200'
                  : 'border-slate-700 bg-[#07090E] text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="inline-block h-2.5 w-2.5 bg-sky-500" aria-hidden="true" />
              <span>Flood mask</span>
            </button>

            <button
              type="button"
              aria-pressed={layers.cropland}
              onClick={() => toggleLayer('cropland')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                layers.cropland
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                  : 'border-slate-700 bg-[#07090E] text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="inline-block h-2.5 w-2.5 rotate-45 bg-amber-500"
                aria-hidden="true"
              />
              <span>Cropland</span>
            </button>

            <button
              type="button"
              aria-pressed={layers.buildings}
              onClick={() => toggleLayer('buildings')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                layers.buildings
                  ? 'border-red-500/60 bg-red-500/15 text-red-200'
                  : 'border-slate-700 bg-[#07090E] text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-red-500"
                aria-hidden="true"
              />
              <span>Buildings</span>
            </button>

            <button
              type="button"
              aria-pressed={layers.wards}
              onClick={() => toggleLayer('wards')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                layers.wards
                  ? 'border-slate-500 bg-slate-800 text-slate-100'
                  : 'border-slate-700 bg-[#07090E] text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="inline-block h-2.5 w-2.5 border border-dashed border-slate-300"
                aria-hidden="true"
              />
              <span>Ward outlines</span>
            </button>
          </div>
        </div>

        {/* Opacity Slider & Reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="overlay-opacity" className="whitespace-nowrap text-xs text-slate-300">
              Overlay opacity
            </label>
            <input
              id="overlay-opacity"
              type="range"
              min={0}
              max={100}
              step={5}
              value={opacityPct}
              onChange={(e) => setOpacityPct(Number(e.target.value))}
              className="h-1.5 w-24 cursor-pointer accent-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            />
            <span className="w-9 text-right font-mono text-xs tabular-nums text-slate-200">
              {opacityPct}%
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetView}
            className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded border border-slate-700 bg-[#07090E] px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            aria-label="Reset map view to full AOI"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Full-Height Compare Map Viewport */}
      <div
        className="relative flex-1 overflow-hidden bg-[#07090E]"
        data-testid="map-viewport"
        data-polarization={polarization}
        data-opacity={opacityPct}
      >
        <div
          ref={compareContainerRef}
          className="relative h-full min-h-[460px] w-full"
        >
          <div
            ref={beforeContainerRef}
            className="maplibregl-compare-map"
            aria-label="Pre-flood radar map"
          />
          <div
            ref={afterContainerRef}
            className="maplibregl-compare-map"
            aria-label="Post-flood radar and impact map"
          />
        </div>

        {/* Left / Right Side Date Context Labels */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 z-10 border border-slate-700/90 bg-[#07090E]/90 px-2 py-0.5 font-mono text-[10px] text-slate-200 sm:top-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
          PRE <span className="hidden sm:inline">· {meta.preDate}</span> · {polarization}
        </div>
        <div className="pointer-events-none absolute top-2.5 right-12 z-10 border border-slate-700/90 bg-[#07090E]/90 px-2 py-0.5 font-mono text-[10px] text-slate-200 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
          POST <span className="hidden sm:inline">· {meta.postDate}</span> · {polarization}
        </div>

        {/* Unmissable Mock Data Map Badge */}
        {meta.mock && (
          <div
            role="note"
            className="pointer-events-none absolute top-10 left-2.5 z-20 flex items-center gap-1.5 whitespace-nowrap border border-amber-400 bg-[#07090E]/95 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-amber-300 shadow-lg sm:top-auto sm:bottom-11 sm:left-3 sm:px-2.5 sm:py-1 sm:text-xs"
          >
            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            <span>MOCK DATA - NOT REAL NISAR OUTPUT</span>
          </div>
        )}

        {/* Legend with dB Scale & Color-Blind-Safe Markers */}
        <aside
          aria-label="Map legend and radar backscatter scale"
          className="pointer-events-auto absolute right-2.5 bottom-2.5 z-10 w-52 rounded border border-slate-700 bg-[#07090E]/95 p-2.5 text-[10px] text-slate-200 sm:right-3 sm:bottom-3 sm:w-64 sm:p-3 sm:text-[11px]"
        >
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-semibold text-slate-100">SAR Backscatter (dB)</span>
            <span className="font-mono text-[10px] text-slate-400">{polarization} σ⁰</span>
          </div>

          <div
            className="h-2.5 w-full rounded-xs border border-slate-700"
            style={{
              background: 'linear-gradient(90deg, #0b0e14 0%, #525c6b 50%, #f1f5f9 100%)',
            }}
            aria-hidden="true"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-slate-400">
            <span>-25 dB (Water)</span>
            <span>-12 dB</span>
            <span>0 dB (Bright)</span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-800 pt-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 shrink-0 bg-sky-500" aria-hidden="true" />
              <span className="truncate">Flood mask</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rotate-45 bg-amber-500"
                aria-hidden="true"
              />
              <span className="truncate">Cropland</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
                aria-hidden="true"
              />
              <span className="truncate">Buildings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 border border-dashed border-slate-300"
                aria-hidden="true"
              />
              <span className="truncate">Ward bounds</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
