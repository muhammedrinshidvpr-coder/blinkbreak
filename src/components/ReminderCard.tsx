import { useEffect, useRef, useState } from 'react';
import { formatShortDuration, type ReminderKind } from '../lib/types';
import { isInhaling } from '../lib/timeline';
import { ProgressRing, ReminderSymbol } from './symbols';
import { useElapsed } from './useElapsed';

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
  const [left, setLeft] = useState(durationSec);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  const t = useElapsed(!reducedMotion);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const safeDuration = Math.max(0, Math.ceil(durationSec));
    const deadline = Date.now() + safeDuration * 1000;
    expiredRef.current = false;
    setLeft(safeDuration);
    if (durationSec <= 0) return;

    const update = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const id = window.setInterval(update, 250);
    return () => clearInterval(id);
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
  const line = kind === 'rest' && !reducedMotion ? (isInhaling(t, durationSec) ? 'Breathe in' : 'Breathe out') : body;
  const snooze = formatShortDuration(snoozeSec);

  return (
    <div className="bb-reminder" data-kind={kind} data-testid={`reminder-${kind}`} role="alertdialog" aria-label={title}>
      <ProgressRing durationSec={durationSec} size={92}>
        <ReminderSymbol kind={kind} t={t} durationSec={durationSec} still={reducedMotion} />
      </ProgressRing>
      <h2>{title}</h2>
      <p key={line} className="bb-reminder-line">{line}</p>
      <span className="bb-sr-only" data-testid="reminder-countdown">{remaining} left</span>
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
