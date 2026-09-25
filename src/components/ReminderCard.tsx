import { useEffect, useRef } from 'react';
import { formatShortDuration, type ReminderKind } from '../lib/types';
import { breathInstruction } from '../lib/timeline';
import { ProgressRing, ReminderSymbol } from './symbols';
import { useElapsed } from './useElapsed';
import { useCountdown } from './useCountdown';
import { useReducedMotion } from '../lib/motion';

export type CardAction = 'done' | 'skip' | 'snooze';

/** Symbol in a draining ring, a title, one quiet line, and two actions. */
export function ReminderCard({
  kind,
  title,
  body,
  durationSec,
  snoozeSec = 5 * 60,
  reducedMotion = false,
  onAction,
  onExpire,
}: {
  kind: ReminderKind;
  title: string;
  body: string;
  durationSec: number;
  snoozeSec?: number;
  reducedMotion?: boolean;
  onAction: (a: CardAction) => void;
  onExpire?: () => void;
}) {
  reducedMotion = useReducedMotion(reducedMotion);
  const { left, progress } = useCountdown(durationSec);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  const t = useElapsed(!reducedMotion);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    expiredRef.current = false;
  }, [kind, durationSec]);

  useEffect(() => {
    if (durationSec > 0 && left === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpireRef.current?.();
    }
  }, [durationSec, left]);

  const remaining = left >= 60
    ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
    : `${left}s`;
  const line = kind === 'rest' && !reducedMotion ? breathInstruction(t, durationSec) : body;
  const snooze = formatShortDuration(snoozeSec);

  return (
    <div className="bb-reminder" data-kind={kind} data-testid={`reminder-${kind}`}>
      <ProgressRing durationSec={durationSec} size={92} progress={progress}>
        <ReminderSymbol kind={kind} t={t} durationSec={durationSec} still={reducedMotion} />
      </ProgressRing>
      <h2>{title}</h2>
      <p key={line} className="bb-reminder-line">{line}</p>
      <span className={durationSec >= 60 ? 'bb-duration' : 'bb-sr-only'} data-testid="reminder-countdown">{remaining} left</span>
      <div className="bb-actions">
        <button className="bb-btn primary" data-testid="reminder-done" onClick={() => onAction('done')}>Done</button>
        <button
          className="bb-btn quiet"
          data-testid="reminder-snooze"
          aria-label={`Snooze ${snooze}`}
          title={`Remind me in ${snooze}`}
          onClick={() => onAction('snooze')}
        >
          Later <span className="bb-btn-meta">{snooze}</span>
        </button>
      </div>
    </div>
  );
}
