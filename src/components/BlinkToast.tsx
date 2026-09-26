import { useEffect } from 'react';
import { expiryActionFor, REMINDER_META } from '../lib/types';
import type { CardAction } from './ReminderCard';
import { EyeSymbol, ProgressRing } from './symbols';
import { useElapsed } from './useElapsed';
import { useSettleOnce } from './useSettleOnce';
import { useReducedMotion } from '../lib/motion';
import { useCountdown } from './useCountdown';

/**
 * Small top-center blink nudge: an eye that blinks slowly inside a draining ring,
 * two words, and nothing else. Click = done, × (on hover) = skip, expiry = done.
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
  reducedMotion = useReducedMotion(reducedMotion);
  const { leaving, settle } = useSettleOnce(onAction, reducedMotion);
  const total = Math.max(1, Math.ceil(durationSec));
  const { left, progress } = useCountdown(total);
  const t = useElapsed(!reducedMotion);

  useEffect(() => {
    if (left === 0) settle(expiryActionFor('blink'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  return (
    <div className="bb-toast-layer">
      <div
        className={`bb-toast ${leaving ? 'is-leaving' : ''} ${reducedMotion ? 'reduced-motion' : ''}`}
        data-kind="blink"
        data-testid="blink-toast"
        role="group"
        aria-label={`${REMINDER_META.blink.title}, ${left} seconds left`}
      >
        <span className="bb-sr-only" role="status">{REMINDER_META.blink.title}</span>
        <button className="bb-toast-complete" aria-label="Complete blink reminder" onClick={() => settle('done')}>
        <ProgressRing durationSec={total} size={40} progress={progress}>
          <EyeSymbol t={t} durationSec={total} still={reducedMotion} />
        </ProgressRing>
        <span className="bb-toast-title">{REMINDER_META.blink.title}</span>
        </button>
        <button
          className="bb-toast-close"
          data-testid="blink-toast-skip"
          aria-label="Skip"
          onClick={(event) => {
            event.stopPropagation();
            settle('skip');
          }}
        >
          <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}
