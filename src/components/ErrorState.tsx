import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div
        role="alert"
        className="w-full max-w-lg rounded border border-red-500/40 bg-[#0E131D] p-6"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">
              Unable to load flood impact data
            </h2>
            <p className="font-mono text-xs leading-relaxed text-red-200/90">
              {message}
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Ensure <code className="font-mono text-slate-200">/public/data/meta.json</code>,{' '}
              <code className="font-mono text-slate-200">overlays.json</code>,{' '}
              <code className="font-mono text-slate-200">stats.json</code>,{' '}
              <code className="font-mono text-slate-200">wards.geojson</code>, and{' '}
              <code className="font-mono text-slate-200">rainfall.json</code> exist and match the
              expected schema.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry loading data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
