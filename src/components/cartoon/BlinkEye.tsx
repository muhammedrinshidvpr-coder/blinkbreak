/** Friendly blinking cartoon eye (SVG + CSS animation). */
export function BlinkEye({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <div className={reducedMotion ? 'reduced-motion' : ''} data-testid="blink-eye">
      <svg width="200" height="160" viewBox="0 0 200 160" role="img" aria-label="Cartoon eye blinking slowly">
        <ellipse cx="100" cy="80" rx="72" ry="58" fill="#ffffff" stroke="#223148" strokeWidth="5" />
        <g className="bb-eye-lid">
          <circle cx="100" cy="80" r="30" fill="#2aa8a0" stroke="#223148" strokeWidth="5" />
          <circle cx="100" cy="80" r="13" fill="#223148" />
          <circle cx="109" cy="71" r="5" fill="#ffffff" />
        </g>
        {/* sparkles */}
        <path d="M165 30 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#ffc94d" stroke="#223148" strokeWidth="2" />
        <path d="M28 118 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#8b7fd4" stroke="#223148" strokeWidth="2" />
        {/* smile */}
        <path d="M78 132 q22 14 44 0" fill="none" stroke="#223148" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <p style={{ textAlign: 'center', margin: '4px 0 0', fontWeight: 800 }}>Blink with me… soft and slow</p>
    </div>
  );
}
