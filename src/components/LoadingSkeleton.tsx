export function LoadingSkeleton() {
  return (
    <div
      className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden"
      aria-busy="true"
      aria-label="Loading flood impact dashboard data"
    >
      <div className="flex flex-col border-b border-slate-800 lg:w-[65%] lg:border-b-0 lg:border-r">
        <div className="h-12 border-b border-slate-800 bg-[#0E131D] px-4 py-2.5">
          <div className="h-6 w-2/3 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="min-h-[420px] flex-1 animate-pulse bg-[#0B0F17]" />
      </div>

      <div className="space-y-4 p-4 lg:w-[35%] lg:overflow-y-auto">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded border border-slate-800 bg-[#0E131D]" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded border border-slate-800 bg-[#0E131D]" />
        <div className="h-52 animate-pulse rounded border border-slate-800 bg-[#0E131D]" />
        <div className="h-36 animate-pulse rounded border border-slate-800 bg-[#0E131D]" />
      </div>
    </div>
  );
}
