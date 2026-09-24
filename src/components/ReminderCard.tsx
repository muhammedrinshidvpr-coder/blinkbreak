import { useEffect, useRef, useState } from 'react';
import { formatShortDuration, type ReminderKind } from '../lib/types';
import { BlinkEye } from './cartoon/BlinkEye';
import { LookAway } from './cartoon/LookAway';
import { PostureReset } from './cartoon/PostureReset';
import { MoveStretch } from './cartoon/MoveStretch';

export type CardAction = 'done' | 'skip' | 'snooze';

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
  const progress = durationSec > 0 ? Math.min(100, Math.max(0, (left / durationSec) * 100)) : 0;

  return (
    <div className={`bb-reminder ${reducedMotion ? 'reduced-motion' : ''}`} data-testid={`reminder-${kind}`} role="alertdialog" aria-label={title}>
      <div className="bb-stage">
        {kind === 'blink' && <BlinkEye reducedMotion={reducedMotion} />}
        {kind === 'lookaway' && <LookAway reducedMotion={reducedMotion} />}
        {kind === 'posture' && <PostureReset reducedMotion={reducedMotion} />}
        {(kind === 'move' || kind === 'rest') && <MoveStretch reducedMotion={reducedMotion} />}
      </div>
      <h2 style={{ margin: '4px 0' }}>{title}</h2>
      <p style={{ margin: '4px 0' }}>{body}</p>
      <div className="bb-count-row">
        <p className="bb-count" data-testid="reminder-countdown" aria-live="polite">
          {remaining} left
        </p>
        <span>Closes automatically</span>
      </div>
      <div className="bb-timer-track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="bb-row">
        <button className="bb-btn primary" data-testid="reminder-done" onClick={() => onAction('done')}>Done</button>
        <button className="bb-btn" data-testid="reminder-snooze" onClick={() => onAction('snooze')}>Snooze {formatShortDuration(snoozeSec)}</button>
        <button className="bb-btn ghost" data-testid="reminder-skip" onClick={() => onAction('skip')}>Skip</button>
      </div>
    </div>
  );
}
