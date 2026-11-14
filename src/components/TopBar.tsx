import { ExternalLink, AlertTriangle } from 'lucide-react';
import { CONFIG } from '../lib/config';
import type { MetaData } from '../lib/data';

interface TopBarProps {
  meta?: MetaData;
}

export function TopBar({ meta }: TopBarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-slate-800 bg-[#07090E] px-4 py-2.5 lg:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="whitespace-nowrap shrink-0 text-base font-semibold tracking-tight text-slate-100">
          NISAR Flood Impact Dashboard
        </h1>
        {meta && (
          <>
            <span className="hidden text-slate-600 sm:inline" aria-hidden="true">
              ·
            </span>
            <p className="truncate text-sm text-slate-300" title={meta.eventName}>
              {meta.eventName}
            </p>
            <span className="hidden text-slate-600 md:inline" aria-hidden="true">
              ·
            </span>
            <span className="whitespace-nowrap shrink-0 font-mono text-xs tabular-nums text-slate-400">
              {meta.preDate} to {meta.postDate}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {meta?.mock && (
          <div
            role="status"
            aria-label="Mock data warning"
            className="flex items-center gap-1.5 whitespace-nowrap shrink-0 border border-amber-500/70 bg-amber-500/15 px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-amber-300"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
            <span>MOCK DATA - NOT REAL NISAR OUTPUT</span>
          </div>
        )}

        <a
          href={CONFIG.GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded border border-slate-700 bg-[#0E131D] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          aria-label="View source repository on GitHub"
        >
          <span>GitHub</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
