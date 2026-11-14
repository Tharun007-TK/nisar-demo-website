import { AlertTriangle, ExternalLink } from 'lucide-react';
import { CONFIG } from '../lib/config';

interface FooterProps {
  isMock: boolean;
}

export function Footer({ isMock }: FooterProps) {
  return (
    <footer className="border-t border-slate-800 bg-[#07090E] px-4 py-3 text-xs text-slate-400 lg:px-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Sources: <strong className="font-medium text-slate-200">NISAR via ASF DAAC</strong>
            {' · '}
            <strong className="font-medium text-slate-200">
              Microsoft Planetary Computer
            </strong>
            {' · '}
            <strong className="font-medium text-slate-200">Meteomatics</strong>
          </span>
          <span className="hidden text-slate-600 sm:inline" aria-hidden="true">
            ·
          </span>
          <a
            href={CONFIG.METHOD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-300 underline decoration-slate-600 underline-offset-2 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            <span>SAR Flood Method</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          <span className="hidden text-slate-600 sm:inline" aria-hidden="true">
            ·
          </span>
          <span>
            Limitations: Urban double-bounce &amp; dry sandbar ambiguity; 12-day repeat interval
          </span>
          <span className="hidden text-slate-600 sm:inline" aria-hidden="true">
            ·
          </span>
          <span>MIT License (Open Source)</span>
        </div>

        {isMock && (
          <div className="inline-flex items-center gap-1.5 self-start whitespace-nowrap shrink-0 border border-amber-500/70 bg-amber-500/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-300 lg:self-auto">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
            <span>MOCK DATA - NOT REAL NISAR OUTPUT</span>
          </div>
        )}
      </div>
    </footer>
  );
}
