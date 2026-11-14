declare module '@maplibre/maplibre-gl-compare' {
  import type { Map as MapLibreMap } from 'maplibre-gl';

  export interface CompareOptions {
    orientation?: 'vertical' | 'horizontal';
    mousemove?: boolean;
  }

  export interface CompareSlideEvent {
    currentPosition: number;
  }

  export default class Compare {
    constructor(
      beforeMap: MapLibreMap,
      afterMap: MapLibreMap,
      container: string | HTMLElement,
      options?: CompareOptions
    );
    setSlider(x: number): void;
    remove(): void;
    on(type: 'slide', listener: (ev: CompareSlideEvent) => void): this;
    off(type: 'slide', listener: (ev: CompareSlideEvent) => void): this;
    currentPosition: number;
  }
}
