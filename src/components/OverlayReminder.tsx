import { useEffect, useRef } from 'react';
import { expiryActionFor, type ReminderKind } from '../lib/types';
import { ReminderCard, type CardAction } from './ReminderCard';
import { useSettleOnce } from './useSettleOnce';
import { useReducedMotion } from '../lib/motion';

export function OverlayReminder({
  kind,
  title,
  body,
  durationSec,
  snoozeSec,
  reducedMotion = false,
  onAction,
  manageFocus = true,
}: {
  kind: ReminderKind;
  title: string;
  body: string;
  durationSec: number;
  snoozeSec: number;
  reducedMotion?: boolean;
  onAction: (action: CardAction) => void;
  manageFocus?: boolean;
}) {
  reducedMotion = useReducedMotion(reducedMotion);
  const { leaving, settle } = useSettleOnce(onAction, reducedMotion);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!manageFocus) return;
    const previous = document.activeElement as HTMLElement | null;
    cardRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        settle('skip');
      }
      if (event.key === 'Tab') {
        const buttons = cardRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === cardRef.current)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageFocus]);

  return (
    <div
      className={`bb-overlay ${leaving ? 'is-leaving' : ''} ${reducedMotion ? 'reduced-motion' : ''}`}
      data-kind={kind}
      data-testid="reminder-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) settle('skip');
      }}
    >
      <div className="bb-overlay-card" ref={cardRef} tabIndex={-1} role={manageFocus ? 'dialog' : 'region'}
        aria-modal={manageFocus ? true : undefined} aria-label={title}>
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
