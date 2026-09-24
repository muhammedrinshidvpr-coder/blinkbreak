import { useEffect, useState, type CSSProperties } from 'react';
import { expiryActionFor } from '../lib/types';
import type { CardAction } from './ReminderCard';
import { useSettleOnce } from './useSettleOnce';

const RING_RADIUS = 56;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
/** Aim for about four slow, relaxed blinks per reminder. */
const BLINKS_PER_REMINDER = 4;

/**
 * Small top-center blink nudge: an emoji face that blinks with the user,
 * a ring that empties over the countdown, then it floats away on its own.
 * Click = done, × = skip, expiry = done.
 */
export function BlinkToast({
  durationSec,
  reducedMotion = false,
  onAction,
}: {
  durationSec: number;
  reducedMotion?: boolean;
  onAction: (action: CardAction) => void;
}) {
  const { leaving, settle } = useSettleOnce(onAction, reducedMotion);
  const total = Math.max(1, Math.ceil(durationSec));
  const [left, setLeft] = useState(total);

  useEffect(() => {
    const deadline = Date.now() + total * 1000;
    const id = window.setInterval(() => {
      setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(id);
  }, [total]);

  useEffect(() => {
    if (left === 0) settle(expiryActionFor('blink'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const blinkPeriod = Math.min(4, Math.max(1.8, total / BLINKS_PER_REMINDER));
  const style = {
    '--bb-toast-duration': `${total}s`,
    '--bb-blink-period': `${blinkPeriod}s`,
    '--bb-ring-length': RING_LENGTH,
  } as CSSProperties;

  return (
    <div className="bb-toast-layer">
      <div
        className={`bb-toast ${leaving ? 'is-leaving' : ''} ${reducedMotion ? 'reduced-motion' : ''}`}
        style={style}
        data-testid="blink-toast"
        role="status"
        aria-label="Time to blink"
        onClick={() => settle('done')}
      >
        <svg className="bb-toast-face" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <radialGradient id="bb-face-fill" cx="38%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#fff6b8" />
              <stop offset="55%" stopColor="#ffd23f" />
              <stop offset="100%" stopColor="#f3a21f" />
            </radialGradient>
            <linearGradient id="bb-ring-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5fd4c4" />
              <stop offset="100%" stopColor="#8b7fd4" />
            </linearGradient>
          </defs>
          <circle className="bb-toast-ring-track" cx="60" cy="60" r={RING_RADIUS} />
          <circle
            className="bb-toast-ring"
            cx="60"
            cy="60"
            r={RING_RADIUS}
            strokeDasharray={RING_LENGTH}
            data-testid="blink-toast-ring"
          />
          <g className="bb-toast-bob">
            <circle cx="60" cy="60" r="44" fill="url(#bb-face-fill)" />
            <ellipse cx="46" cy="34" rx="13" ry="6" fill="#fff" opacity=".5" transform="rotate(-22 46 34)" />
            <ellipse cx="37" cy="71" rx="7" ry="4" fill="#ff8a8a" opacity=".45" />
            <ellipse cx="83" cy="71" rx="7" ry="4" fill="#ff8a8a" opacity=".45" />
            <g className="bb-toast-eye">
              <ellipse cx="46" cy="55" rx="6" ry="8.5" fill="#3b2a1a" />
              <circle cx="48" cy="51" r="2.3" fill="#fff" />
            </g>
            <g className="bb-toast-eye">
              <ellipse cx="74" cy="55" rx="6" ry="8.5" fill="#3b2a1a" />
              <circle cx="76" cy="51" r="2.3" fill="#fff" />
            </g>
            <g className="bb-toast-lash" fill="none" stroke="#3b2a1a" strokeWidth="3" strokeLinecap="round">
              <path d="M39 56 q7 6 14 0" />
              <path d="M67 56 q7 6 14 0" />
            </g>
            <path d="M47 76 q13 10 26 0" fill="none" stroke="#3b2a1a" strokeWidth="3.4" strokeLinecap="round" />
          </g>
        </svg>
        <span className="bb-toast-sparkle s1" aria-hidden="true">✦</span>
        <span className="bb-toast-sparkle s2" aria-hidden="true">✦</span>
        <span className="bb-toast-sparkle s3" aria-hidden="true">✧</span>

        <div className="bb-toast-text">
          <strong>Blink slowly with me</strong>
          <span>
            Soft, full blinks · <b data-testid="blink-toast-countdown">{left}s</b>
          </span>
        </div>

        <button
          className="bb-toast-close"
          data-testid="blink-toast-skip"
          aria-label="Skip"
          onClick={(event) => {
            event.stopPropagation();
            settle('skip');
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
