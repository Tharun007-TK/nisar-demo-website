import type { RankedWard } from '../lib/geo';

interface WardTableProps {
  wards: RankedWard[];
  hoveredWardName: string | null;
  selectedWardName: string | null;
  onHoverWard: (name: string | null) => void;
  onSelectWard: (ward: RankedWard) => void;
}

export function WardTable({
  wards,
  hoveredWardName,
  selectedWardName,
  onHoverWard,
  onSelectWard,
}: WardTableProps) {
  return (
    <section aria-labelledby="ward-ranking-heading" className="rounded border border-slate-800 bg-[#0E131D]">
      <div className="flex items-baseline justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <h2 id="ward-ranking-heading" className="text-sm font-semibold text-slate-200">
          Top 10 Wards by Exposure
        </h2>
        <span className="text-[11px] text-slate-400">Hover to highlight · Click to zoom</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-medium text-slate-400">
              <th scope="col" className="py-2 pl-4 pr-2 w-8">#</th>
              <th scope="col" className="py-2 px-2">Ward</th>
              <th scope="col" className="py-2 px-2 text-right">Flooded</th>
              <th scope="col" className="py-2 px-2 text-right">Crop (km²)</th>
              <th scope="col" className="py-2 pl-2 pr-4 text-right">Buildings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {wards.map((ward) => {
              const isHovered = hoveredWardName === ward.name;
              const isSelected = selectedWardName === ward.name;

              return (
                <tr
                  key={ward.name}
                  tabIndex={0}
                  aria-selected={isSelected}
                  onMouseEnter={() => onHoverWard(ward.name)}
                  onMouseLeave={() => onHoverWard(null)}
                  onFocus={() => onHoverWard(ward.name)}
                  onBlur={() => onHoverWard(null)}
                  onClick={() => onSelectWard(ward)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectWard(ward);
                    }
                  }}
                  className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-sky-400 ${
                    isSelected
                      ? 'bg-sky-500/15 text-white'
                      : isHovered
                        ? 'bg-slate-800/70 text-slate-100'
                        : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <td className="py-2.5 pl-4 pr-2 font-mono tabular-nums text-slate-400">
                    {ward.rank}
                  </td>
                  <td className="py-2.5 px-2 font-medium text-slate-100">
                    <span className="block max-w-[160px] truncate" title={ward.name}>
                      {ward.name}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-sky-300">
                    {ward.floodedPct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-300">
                    {ward.croplandKm2.toFixed(1)}
                  </td>
                  <td className="py-2.5 pl-2 pr-4 text-right font-mono font-medium tabular-nums text-red-300">
                    {ward.buildingsExposed.toLocaleString('en-US')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
