import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RainfallData } from '../lib/data';

interface RainfallChartProps {
  data: RainfallData;
  preDate: string;
  postDate: string;
}

function formatShortDate(isoDate: string): string {
  return isoDate.slice(5); // MM-DD
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { date: string; mm: number } }>;
  acquisitions: string[];
  preDate: string;
  postDate: string;
}

function RainfallTooltip({
  active,
  payload,
  acquisitions,
  preDate,
  postDate,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const isAcq = acquisitions.includes(point.date);
  const tag =
    point.date === preDate
      ? 'NISAR Pre-Pass'
      : point.date === postDate
        ? 'NISAR Post-Pass'
        : isAcq
          ? 'NISAR Acquisition'
          : null;

  return (
    <div className="rounded border border-slate-700 bg-[#07090E] px-2.5 py-2 text-xs shadow-lg">
      <div className="font-mono text-slate-300">{point.date}</div>
      <div className="mt-0.5 font-mono font-semibold tabular-nums text-sky-300">
        {point.mm.toFixed(1)} mm
      </div>
      {tag && <div className="mt-1 font-mono text-[11px] text-amber-300">{tag}</div>}
    </div>
  );
}

export function RainfallChart({ data, preDate, postDate }: RainfallChartProps) {
  const acquisitions = data.nisarAcquisitions;

  return (
    <section
      aria-labelledby="rainfall-chart-heading"
      className="rounded border border-slate-800 bg-[#0E131D] p-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="rainfall-chart-heading" className="text-sm font-semibold text-slate-200">
          Daily Rainfall &amp; NISAR Passes
        </h2>
        <span className="font-mono text-[11px] text-slate-400">mm / 24h</span>
      </div>

      <div className="h-44 w-full" data-testid="rainfall-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.rainfall}
            margin={{ top: 18, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
              content={
                <RainfallTooltip
                  acquisitions={acquisitions}
                  preDate={preDate}
                  postDate={postDate}
                />
              }
            />
            <Bar dataKey="mm" fill="#0EA5E9" radius={[2, 2, 0, 0]} maxBarSize={18} />
            {acquisitions.map((acqDate) => {
              const labelText =
                acqDate === preDate ? 'Pre' : acqDate === postDate ? 'Post' : 'SAR';
              return (
                <ReferenceLine
                  key={acqDate}
                  x={acqDate}
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  label={{
                    value: labelText,
                    position: 'top',
                    fill: '#FCD34D',
                    fontSize: 10,
                    fontFamily: 'IBM Plex Mono',
                  }}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 bg-sky-500" aria-hidden="true" />
          Daily rainfall (mm)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-0 border-l-2 border-dashed border-amber-400"
            aria-hidden="true"
          />
          NISAR acquisition ({acquisitions.join(', ')})
        </span>
      </div>
    </section>
  );
}
