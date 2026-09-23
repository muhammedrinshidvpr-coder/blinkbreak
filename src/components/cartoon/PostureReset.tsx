/** Slouch → upright posture character. */
export function PostureReset({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <div className={reducedMotion ? 'reduced-motion' : ''} data-testid="posture-reset">
      <svg width="240" height="160" viewBox="0 0 240 160" role="img" aria-label="Character straightening posture">
        <rect x="6" y="6" width="228" height="148" rx="16" fill="#fff7e8" stroke="#223148" strokeWidth="5" />
        {/* chair */}
        <rect x="150" y="90" width="60" height="14" rx="6" fill="#8b7fd4" stroke="#223148" strokeWidth="4" />
        <rect x="158" y="104" width="10" height="34" fill="#8b7fd4" stroke="#223148" strokeWidth="4" />
        {/* character gently straightening */}
        <g className="bb-sway">
          <circle cx="120" cy="52" r="18" fill="#ffcf9e" stroke="#223148" strokeWidth="4" />
          <circle cx="114" cy="50" r="2.6" fill="#223148" />
          <circle cx="126" cy="50" r="2.6" fill="#223148" />
          <path d="M112 60 q8 6 16 0" stroke="#223148" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="104" y="70" width="32" height="44" rx="12" fill="#2aa8a0" stroke="#223148" strokeWidth="4" />
          <path d="M104 84 L70 96 M136 84 L168 74" stroke="#223148" strokeWidth="6" strokeLinecap="round" />
        </g>
        <text x="120" y="146" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#223148">
          Shoulders down • Back supported
        </text>
      </svg>
    </div>
  );
}
