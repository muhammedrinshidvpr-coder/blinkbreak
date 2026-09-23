import { useEffect, useState } from 'react';
import type { ReminderKind } from '../lib/types';
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
  reducedMotion = false,
  onAction,
}: {
  kind: ReminderKind;
  title: string;
  body: string;
  durationSec: number;
  reducedMotion?: boolean;
  onAction: (a: CardAction) => void;
}) {
  const [left, setLeft] = useState(durationSec);
  useEffect(() => {
    setLeft(durationSec);
    if (durationSec <= 0) return;
    const id = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [kind, durationSec]);

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
      <p className="bb-count" data-testid="reminder-countdown" aria-live="polite">
        {left}s left — gentle, never blocking
      </p>
      <div className="bb-row">
        <button className="bb-btn primary" data-testid="reminder-done" onClick={() => onAction('done')}>Done</button>
        <button className="bb-btn" data-testid="reminder-snooze" onClick={() => onAction('snooze')}>Snooze 5m</button>
        <button className="bb-btn ghost" data-testid="reminder-skip" onClick={() => onAction('skip')}>Skip</button>
      </div>
    </div>
  );
}
