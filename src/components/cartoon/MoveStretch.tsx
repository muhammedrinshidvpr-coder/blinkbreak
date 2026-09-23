/** Cheerful stretching star character. */
export function MoveStretch({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <div className={reducedMotion ? 'reduced-motion' : ''} data-testid="move-stretch">
      <svg width="220" height="160" viewBox="0 0 220 160" role="img" aria-label="Star character stretching">
        <rect x="6" y="6" width="208" height="148" rx="16" fill="#eafaf3" stroke="#223148" strokeWidth="5" />
        <g className="bb-bounce">
          <path
            d="M110 30 L122 62 L156 62 L128 82 L138 114 L110 94 L82 114 L92 82 L64 62 L98 62 Z"
            fill="#ffc94d" stroke="#223148" strokeWidth="4" strokeLinejoin="round"
          />
          <circle cx="103" cy="72" r="3" fill="#223148" />
          <circle cx="117" cy="72" r="3" fill="#223148" />
          <path d="M103 80 q7 6 14 0" stroke="#223148" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M70 60 q-14 -6 -20 -18 M150 60 q14 -6 20 -18" stroke="#223148" strokeWidth="5" strokeLinecap="round" />
        </g>
        <text x="110" y="144" textAnchor="middle" fontSize="13" fontWeight="800" fill="#223148">
          Stand • Shoulders • Walk a little
        </text>
      </svg>
    </div>
  );
}
