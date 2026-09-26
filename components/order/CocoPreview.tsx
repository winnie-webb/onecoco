/**
 * The live preview Phase 8 adds on top of Phase 1's CocoMark — same
 * coconut silhouette, now actually reflecting what the customer picked
 * (design, name, message, extras), not a fixed illustration. Deliberately
 * still CSS/SVG, no photography (PHASE-1-NOTES.md's "known gap" stands:
 * real photography remains the single biggest visual upgrade available,
 * just not one this phase can produce).
 */

export interface CocoPreviewProps {
  design?: string | null; // 'jamaican' | 'tropical' | 'romance' | 'birthday' | null
  name?: string;
  message?: string;
  extras?: string[]; // subset of 'lime' | 'straw' | 'spoon' | 'water'
  className?: string;
}

const DESIGN_LABELS: Record<string, string> = {
  jamaican: "Jamaican",
  tropical: "Tropical",
  romance: "Romance",
  birthday: "Birthday",
};

function DesignAccent({ design }: { design?: string | null }) {
  switch (design) {
    case "jamaican":
      return (
        <g aria-hidden="true">
          <path d="M12 30 L28 30" className="stroke-lime-500" strokeWidth="2" strokeDasharray="2 2" />
          <circle cx="20" cy="22" r="2.2" className="fill-sand-300" />
        </g>
      );
    case "tropical":
      return (
        <g aria-hidden="true">
          <path d="M14 24c2-3 4-3 6 0" className="stroke-lime-400" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M20 24c2-3 4-3 6 0" className="stroke-lime-500" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case "romance":
      return (
        <path
          d="M20 27c-3-2.4-5-4-5-6.4 0-1.4 1.1-2.6 2.5-2.6 1 0 1.9.6 2.5 1.5.6-.9 1.5-1.5 2.5-1.5 1.4 0 2.5 1.2 2.5 2.6 0 2.4-2 4-5 6.4Z"
          className="fill-sand-300"
          aria-hidden="true"
        />
      );
    case "birthday":
      return (
        <g aria-hidden="true">
          <rect x="19" y="16" width="2" height="6" rx="1" className="fill-sand-300" />
          <path d="M20 15.5c.8-1 .8-1.6 0-2.5-.8.9-.8 1.5 0 2.5Z" className="fill-lime-400" />
          <circle cx="14" cy="26" r="1.3" className="fill-lime-400" />
          <circle cx="26" cy="27" r="1.3" className="fill-sand-300" />
        </g>
      );
    default:
      return null;
  }
}

export function CocoPreview({ design, name, message, extras = [], className = "" }: CocoPreviewProps) {
  const hasLime = extras.includes("lime");
  const hasExtraStraw = extras.includes("straw");
  const hasSpoon = extras.includes("spoon");
  const hasWater = extras.includes("water");

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg viewBox="0 0 40 40" className="h-32 w-32 sm:h-40 sm:w-40" aria-hidden="true">
        <path
          d="M20 37c-7.2 0-12.5-5.1-12.5-12.2 0-6.1 3.2-11.6 8-16.2a1.9 1.9 0 0 1 1.3-.5h6.4c.5 0 1 .2 1.3.5 4.8 4.6 8 10.1 8 16.2C32.5 31.9 27.2 37 20 37Z"
          className="fill-jungle-800"
        />
        <path
          d="M14.6 12.2c-3.2 3.8-5.1 8-5.1 12.6 0 4.2 1.9 7.5 5 9.3-1.3-2.4-2-5.3-2-8.6 0-5 1.5-9.5 4-13.1a12 12 0 0 0-1.9-.2Z"
          className="fill-jungle-600"
          opacity="0.55"
        />
        <ellipse cx="20" cy="8.6" rx="6.6" ry="2.4" className="fill-sand-200" />
        <ellipse cx="20" cy="8.4" rx="4.2" ry="1.4" className="fill-sand-400" />
        <path d="M22.4 8 29.6 2" className="stroke-lime-500" strokeWidth="3.2" strokeLinecap="round" />
        {hasExtraStraw && <path d="M18 8.5 12 3.5" className="stroke-sand-200" strokeWidth="2.6" strokeLinecap="round" />}
        {hasSpoon && (
          <path d="M25 8 30 4.5" className="stroke-sand-100" strokeWidth="2" strokeLinecap="round" aria-hidden="true" />
        )}

        <DesignAccent design={design} />

        {hasLime && <circle cx="9" cy="30" r="2.6" className="fill-lime-400" stroke="#0b3d2e" strokeWidth="0.6" />}
        {hasWater && <path d="M31 31c0 1.3-1 2.3-2.2 2.3S26.6 32.3 26.6 31c0-1.3 2.2-3.6 2.2-3.6S31 29.7 31 31Z" className="fill-lime-400/70" />}
      </svg>

      <div className="mt-3 min-h-[3.5rem] text-center">
        {name && <p className="truncate font-display text-lg font-bold text-jungle-900">{name}</p>}
        {message && <p className="truncate text-sm text-ink-soft">{message}</p>}
        {design && DESIGN_LABELS[design] && <p className="mt-0.5 text-xs uppercase tracking-wide text-lime-ink">{DESIGN_LABELS[design]}</p>}
      </div>
    </div>
  );
}
