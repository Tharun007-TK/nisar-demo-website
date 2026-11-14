import type { ValidationMetrics } from '../lib/data';

interface ValidationCardProps {
  validation: ValidationMetrics;
  isMock: boolean;
}

export function ValidationCard({ validation, isMock }: ValidationCardProps) {
  const metrics = [
    { label: 'IoU (Jaccard)', value: validation.iou },
    { label: 'Precision', value: validation.precision },
    { label: 'Recall', value: validation.recall },
  ];

  return (
    <section
      aria-labelledby="validation-card-heading"
      className="rounded border border-slate-800 bg-[#0E131D] p-4"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="validation-card-heading" className="text-sm font-semibold text-slate-200">
          Validation &amp; Known Limitations
        </h2>
        {isMock && (
          <span className="font-mono text-[11px] text-amber-300">Mock benchmark</span>
        )}
      </div>

      <div className="space-y-2.5">
        {metrics.map((metric) => {
          const pct = Math.max(0, Math.min(100, Math.round(metric.value * 100)));
          return (
            <div key={metric.label}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="text-slate-300">{metric.label}</span>
                <span className="font-mono font-medium tabular-nums text-slate-100">
                  {pct}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={metric.label}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full overflow-hidden rounded-xs bg-slate-800"
              >
                <div
                  className="h-full bg-sky-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {validation.notes.length > 0 && (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <h3 className="mb-2 text-xs font-semibold text-slate-300">Known limitations</h3>
          <ul className="space-y-1.5 text-xs leading-relaxed text-slate-400">
            {validation.notes.map((note, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-slate-500" aria-hidden="true">
                  –
                </span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
