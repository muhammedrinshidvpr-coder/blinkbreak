/** Near window → distant mountains cartoon for the 20-20-20 rule. */
export function LookAway({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <div className={reducedMotion ? 'reduced-motion' : ''} data-testid="look-away">
      <svg width="240" height="150" viewBox="0 0 240 150" role="img" aria-label="Look at distant mountains">
        <rect x="6" y="6" width="228" height="138" rx="16" fill="#bfe8ef" stroke="#223148" strokeWidth="5" />
        <circle cx="196" cy="38" r="16" fill="#ffc94d" stroke="#223148" strokeWidth="4" />
        <g className="bb-drift">
          <path d="M20 110 L80 55 L120 95 L160 60 L220 110 Z" fill="#8b7fd4" stroke="#223148" strokeWidth="4" strokeLinejoin="round" />
          <path d="M70 63 l10 12 8 -6" fill="#fff" strokeWidth="3" stroke="none" opacity="0.9" />
        </g>
        <g className="bb-bounce">
          <circle cx="55" cy="105" r="14" fill="#ffcf9e" stroke="#223148" strokeWidth="4" />
          <circle cx="50" cy="103" r="2.5" fill="#223148" />
          <circle cx="60" cy="103" r="2.5" fill="#223148" />
          <path d="M50 111 q5 4 10 0" stroke="#223148" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        <text x="120" y="138" textAnchor="middle" fontSize="13" fontWeight="800" fill="#223148">20 feet away… 20 seconds</text>
      </svg>
    </div>
  );
}
