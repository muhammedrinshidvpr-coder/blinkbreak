import { useEffect } from 'react';
import { expiryActionFor, type ReminderKind } from '../lib/types';
import { ReminderCard, type CardAction } from './ReminderCard';
import { useSettleOnce } from './useSettleOnce';

export function OverlayReminder({
  kind,
  title,
  body,
  durationSec,
  snoozeSec,
  reducedMotion = false,
  onAction,
}: {
  kind: ReminderKind;
  title: string;
  body: string;
  durationSec: number;
  snoozeSec: number;
  reducedMotion?: boolean;
  onAction: (action: CardAction) => void;
}) {
  const { leaving, settle } = useSettleOnce(onAction, reducedMotion);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') settle('skip');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`bb-overlay bb-overlay-${kind} ${leaving ? 'is-leaving' : ''} ${reducedMotion ? 'reduced-motion' : ''}`}
      data-testid="reminder-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) settle('skip');
      }}
    >
      <div className="bb-overlay-glow" aria-hidden="true" />
      <div className={`bb-overlay-card bb-enter-${kind}`}>
        <div className="bb-overlay-kicker">
          <span><i aria-hidden="true" /> Gentle pause</span>
          <span>Click outside to skip</span>
        </div>
        <ReminderCard
          kind={kind}
          title={title}
          body={body}
          durationSec={durationSec}
          snoozeSec={snoozeSec}
          reducedMotion={reducedMotion}
          onAction={settle}
          onExpire={() => settle(expiryActionFor(kind))}
        />
      </div>
    </div>
  );
}
