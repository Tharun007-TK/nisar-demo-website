import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function ExplainerPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      aria-labelledby="radar-explainer-heading"
      className="rounded border border-slate-800 bg-[#0E131D]"
    >
      <h2 id="radar-explainer-heading" className="m-0">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="radar-explainer-content"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800/40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-sky-400"
        >
          <span>How to read this radar image</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      </h2>

      {expanded && (
        <div
          id="radar-explainer-content"
          className="space-y-3 border-t border-slate-800 px-4 py-3.5 text-xs leading-relaxed text-slate-300"
        >
          <p>
            Unlike optical cameras, NISAR&apos;s L-band Synthetic Aperture Radar (SAR) sends
            microwave pulses through clouds and measures surface backscatter in decibels (dB).
          </p>

          <ul className="space-y-2 text-slate-300">
            <li>
              <strong className="font-semibold text-sky-300">Open water looks dark:</strong>{' '}
              Calm floodwater acts like a mirror, reflecting radar energy away from the sensor
              (specular reflection, typically &lt; -20 dB).
            </li>
            <li>
              <strong className="font-semibold text-amber-300">
                Flooded vegetation looks bright:
              </strong>{' '}
              Radar bounces off water onto vertical crop stalks and back to the satellite
              (double-bounce scattering), producing bright signatures.
            </li>
            <li>
              <strong className="font-semibold text-slate-100">
                L-band canopy penetration:
              </strong>{' '}
              NISAR&apos;s 24 cm L-band wavelength penetrates tree crowns and dense rice canopies
              far better than shorter 5.6 cm C-band radar, exposing sub-canopy flooding.
            </li>
            <li>
              <strong className="font-semibold text-red-300">Urban false positives:</strong>{' '}
              Building walls and paved streets create strong permanent corner reflectors and
              radar shadows that can mimic flood signals without building masks.
            </li>
          </ul>

          {/* Compact SAR scattering physics schematic diagram */}
          <figure className="rounded border border-slate-800 bg-[#07090E] p-2.5">
            <svg
              viewBox="0 0 360 112"
              className="h-auto w-full"
              role="img"
              aria-label="Diagram comparing specular reflection on open water, double-bounce in flooded vegetation, and L-band canopy penetration"
            >
              {/* Panel 1: Open Water */}
              <rect x="4" y="4" width="112" height="104" fill="#0B111C" stroke="#1E293B" />
              <line x1="12" y1="82" x2="108" y2="82" stroke="#0EA5E9" strokeWidth="2.5" />
              <line
                x1="28"
                y1="26"
                x2="60"
                y2="80"
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <line
                x1="60"
                y1="80"
                x2="94"
                y2="26"
                stroke="#38BDF8"
                strokeWidth="1.5"
              />
              <polygon points="94,26 88,31 93,34" fill="#38BDF8" />
              <text x="60" y="18" textAnchor="middle" fill="#E2E8F0" fontSize="9" fontWeight="600">
                Open Water (Dark)
              </text>
              <text x="60" y="98" textAnchor="middle" fill="#94A3B8" fontSize="8">
                Specular scatter away
              </text>

              {/* Panel 2: Double-Bounce */}
              <rect x="124" y="4" width="112" height="104" fill="#0B111C" stroke="#1E293B" />
              <line x1="132" y1="82" x2="228" y2="82" stroke="#0EA5E9" strokeWidth="2.5" />
              <line x1="186" y1="44" x2="186" y2="82" stroke="#F59E0B" strokeWidth="3" />
              <line x1="198" y1="48" x2="198" y2="82" stroke="#F59E0B" strokeWidth="2.5" />
              <polyline
                points="146,28 172,80 185,58 152,24"
                fill="none"
                stroke="#FBBF24"
                strokeWidth="1.7"
              />
              <polygon points="152,24 153,31 159,28" fill="#FBBF24" />
              <text x="180" y="18" textAnchor="middle" fill="#E2E8F0" fontSize="9" fontWeight="600">
                Flooded Crops (Bright)
              </text>
              <text x="180" y="98" textAnchor="middle" fill="#94A3B8" fontSize="8">
                Double-bounce return
              </text>

              {/* Panel 3: L-band vs C-band */}
              <rect x="244" y="4" width="112" height="104" fill="#0B111C" stroke="#1E293B" />
              <ellipse cx="300" cy="54" rx="34" ry="15" fill="#1E293B" stroke="#475569" />
              <line x1="300" y1="69" x2="300" y2="82" stroke="#64748B" strokeWidth="3" />
              <line x1="252" y1="82" x2="348" y2="82" stroke="#0EA5E9" strokeWidth="2.5" />
              {/* C-band stops in canopy */}
              <line
                x1="274"
                y1="26"
                x2="286"
                y2="46"
                stroke="#94A3B8"
                strokeWidth="1.3"
                strokeDasharray="2 2"
              />
              <text x="275" y="39" fill="#94A3B8" fontSize="7.5">C</text>
              {/* L-band penetrates canopy */}
              <line x1="308" y1="24" x2="316" y2="80" stroke="#38BDF8" strokeWidth="1.8" />
              <text x="322" y="38" fill="#38BDF8" fontSize="8" fontWeight="600">L</text>
              <text x="300" y="18" textAnchor="middle" fill="#E2E8F0" fontSize="9" fontWeight="600">
                L-Band Penetration
              </text>
              <text x="300" y="98" textAnchor="middle" fill="#94A3B8" fontSize="8">
                24 cm reaches sub-canopy
              </text>
            </svg>
          </figure>
        </div>
      )}
    </section>
  );
}
