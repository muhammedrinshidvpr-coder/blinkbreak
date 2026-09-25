import { useId, type ReactNode } from 'react';
import type { ReminderKind } from '../lib/types';
import { blinkOpenness, breath, reach } from '../lib/timeline';

/**
 * Minimal line symbols for each reminder, drawn on a 40×40 grid in `currentColor`
 * with the reminder accent from `--bb-accent`. Pure functions of elapsed time `t`;
 * `still` draws the calm resting pose used for reduced motion.
 */
interface SymbolProps {
  t: number;
  durationSec: number;
  still?: boolean;
}

function Svg({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg className="bb-symbol" viewBox="0 0 40 40" role="img" aria-label={label}>
      {/* Drawn on the inner ~20 units, enlarged to fill; line weight stays a constant hairline. */}
      <g transform="translate(20 20) scale(1.32) translate(-20 -20)">{children}</g>
    </svg>
  );
}

export function EyeSymbol({ t, durationSec, still }: SymbolProps) {
  const clipId = `bb-eye-${useId().replace(/:/g, '')}`;
  const o = still ? 1 : blinkOpenness(t, durationSec);
  const up = 20 - 8.5 * o + 3.2 * (1 - o);
  const lo = 20 + 5.2 * o + 3.2 * (1 - o);
  const upper = `M10.5 20.5 Q20 ${up} 29.5 20.5`;
  const almond = `${upper} Q20 ${lo} 10.5 20.5 Z`;
  return (
    <Svg label="Eye blinking slowly">
      <g data-testid="eye-symbol" data-openness={o.toFixed(2)} transform={`translate(20 20) scale(${1 - 0.03 * (1 - o)}) translate(-20 -20)`}>
        <clipPath id={clipId}>
          <path d={almond} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <circle cx="20" cy="20.4" r="4.4" fill="currentColor" />
          <circle cx="18.6" cy="19" r="1.1" fill="var(--bb-surface-solid)" />
        </g>
        <path d={upper} className="bb-line" />
        <path d={`M10.5 20.5 Q20 ${lo} 29.5 20.5`} className="bb-line" opacity={0.35 + 0.65 * o} />
      </g>
    </Svg>
  );
}

export function HorizonSymbol({ t, durationSec, still }: SymbolProps) {
  const k = still ? 1 : reach(t, durationSec, 20);
  const y = 31 - 9 * k;
  return (
    <Svg label="Focus drifting to a far horizon">
      <line x1="9" y1="22" x2="31" y2="22" className="bb-line" opacity={0.3 + 0.6 * k} />
      <line x1="20" y1="22" x2="12" y2="31" className="bb-line thin" opacity="0.22" />
      <line x1="20" y1="22" x2="28" y2="31" className="bb-line thin" opacity="0.22" />
      <circle data-testid="horizon-dot" cx="20" cy={y} r={2.6 - 1.3 * k} fill="var(--bb-accent)" />
    </Svg>
  );
}

export function SpineSymbol({ t, durationSec, still }: SymbolProps) {
  const k = still ? 1 : reach(t, durationSec, 12);
  return (
    <Svg label="Spine easing upright">
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          data-testid={i === 2 ? 'spine-mid' : undefined}
          cx={20 + Math.sin((Math.PI * i) / 4) * 4.5 * (1 - k)}
          cy={10 + i * 5}
          r={i === 0 ? 2.6 : 1.8}
          fill={i === 0 ? 'currentColor' : 'var(--bb-accent)'}
        />
      ))}
    </Svg>
  );
}

export function StretchSymbol({ t, durationSec, still }: SymbolProps) {
  const k = still ? 1 : reach(t, durationSec, 20);
  // Arms are one smooth arc through the shoulders: hands low at the sides → raised overhead.
  const hands = 25 - 15 * k;
  const spread = 7.5 - 1.5 * k;
  return (
    <Svg label="Figure raising arms in a stretch">
      <circle cx="20" cy="11.5" r="2.3" fill="currentColor" />
      <path d="M20 15.5 V26.5" className="bb-line" />
      <path
        data-testid="stretch-arms"
        d={`M${20 - spread} ${hands.toFixed(2)} Q20 ${(17 + 3 * k).toFixed(2)} ${20 + spread} ${hands.toFixed(2)}`}
        className="bb-line accent"
      />
    </Svg>
  );
}

export function BreathSymbol({ t, durationSec, still }: SymbolProps) {
  const b = still ? 0.6 : breath(t, durationSec);
  return (
    <Svg label="Circle breathing slowly">
      <circle data-testid="breath-circle" cx="20" cy="20" r={5 + 6 * b} fill="var(--bb-accent)" opacity={0.14 + 0.12 * b} />
      <circle cx="20" cy="20" r={5 + 6 * b} className="bb-line accent thin" fill="none" />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" />
    </Svg>
  );
}

export function ReminderSymbol({ kind, ...props }: SymbolProps & { kind: ReminderKind }) {
  switch (kind) {
    case 'blink': return <EyeSymbol {...props} />;
    case 'lookaway': return <HorizonSymbol {...props} />;
    case 'posture': return <SpineSymbol {...props} />;
    case 'move': return <StretchSymbol {...props} />;
    case 'rest': return <BreathSymbol {...props} />;
  }
}

/** Thin ring that drains over `durationSec` (CSS-driven, keeps running under reduced motion). */
export function ProgressRing({ durationSec, children, size }: { durationSec: number; children: ReactNode; size: number }) {
  return (
    <div className="bb-ring" style={{ width: size, height: size, ['--bb-duration' as string]: `${durationSec}s` }}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="18.8" className="bb-ring-track" />
        <circle cx="20" cy="20" r="18.8" className="bb-ring-progress" pathLength={100} data-testid="progress-ring" />
      </svg>
      <div className="bb-ring-inner">{children}</div>
    </div>
  );
}
