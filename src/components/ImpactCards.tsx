import { useEffect, useState } from 'react';
import type { StatsData } from '../lib/data';

interface ImpactCardsProps {
  stats: StatsData;
  isMock: boolean;
}

function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setValue(target);
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return value;
}

export function ImpactCards({ stats, isMock }: ImpactCardsProps) {
  const floodedAnim = useCountUp(stats.floodedKm2);
  const croplandAnim = useCountUp(stats.croplandKm2);
  const buildingsAnim = useCountUp(stats.buildingsExposed);

  const cards = [
    {
      id: 'flooded-area',
      label: 'Flooded Area',
      value: floodedAnim.toFixed(1),
      unit: 'km²',
      caption: isMock ? 'Simulated open-water mask' : 'Detected open-water extent',
      dotColor: 'bg-sky-400',
    },
    {
      id: 'cropland-flooded',
      label: 'Cropland Flooded',
      value: croplandAnim.toFixed(1),
      unit: 'km²',
      caption: isMock ? 'Simulated crop intersection' : 'Agricultural parcels inundated',
      dotColor: 'bg-amber-400',
    },
    {
      id: 'buildings-exposed',
      label: 'Buildings Exposed',
      value: Math.round(buildingsAnim).toLocaleString('en-US'),
      unit: 'structures',
      caption: isMock ? 'Simulated footprint count' : 'Footprints inside flood zone',
      dotColor: 'bg-red-400',
    },
  ];

  return (
    <section aria-labelledby="impact-summary-heading">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="impact-summary-heading" className="text-sm font-semibold text-slate-200">
          Estimated Impact Summary
        </h2>
        {isMock && (
          <span className="font-mono text-[11px] text-amber-300">Mock estimates</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="rounded border border-slate-800 bg-[#0E131D] p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">{card.label}</span>
              <span
                className={`h-2 w-2 shrink-0 rounded-xs ${card.dotColor}`}
                aria-hidden="true"
              />
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="font-mono text-xl font-semibold tracking-tight tabular-nums text-slate-50 xl:text-[22px]">
                {card.value}
              </span>
              <span className="font-mono text-[11px] text-slate-400">{card.unit}</span>
            </div>

            <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
              {card.caption}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
