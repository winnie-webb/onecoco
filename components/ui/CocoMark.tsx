/**
 * The mark. Deliberately a generic young-coconut-and-straw glyph rather than
 * a lettermark, so it survives a rename (§27.6) without redrawing.
 */
export function CocoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Coconut body — young, tapered toward the top. */}
      <path
        d="M20 37c-7.2 0-12.5-5.1-12.5-12.2 0-6.1 3.2-11.6 8-16.2a1.9 1.9 0 0 1 1.3-.5h6.4c.5 0 1 .2 1.3.5 4.8 4.6 8 10.1 8 16.2C32.5 31.9 27.2 37 20 37Z"
        className="fill-jungle-800"
      />
      {/* Highlight, gives the body some volume. */}
      <path
        d="M14.6 12.2c-3.2 3.8-5.1 8-5.1 12.6 0 4.2 1.9 7.5 5 9.3-1.3-2.4-2-5.3-2-8.6 0-5 1.5-9.5 4-13.1a12 12 0 0 0-1.9-.2Z"
        className="fill-jungle-600"
        opacity="0.55"
      />
      {/* The cut opening at the crown. */}
      <ellipse cx="20" cy="8.6" rx="6.6" ry="2.4" className="fill-sand-200" />
      <ellipse cx="20" cy="8.4" rx="4.2" ry="1.4" className="fill-sand-400" />
      {/* Straw. */}
      <path
        d="M22.4 8 29.6 2"
        className="stroke-lime-500"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
