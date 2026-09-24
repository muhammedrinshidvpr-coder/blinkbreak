import { useEffect, useState } from 'react';
import type { ReminderKind } from '../lib/types';
import { emitReminderAction, hideNativeReminder, listen, type ReminderPayload } from '../lib/native';
import type { CardAction } from './ReminderCard';
import { OverlayReminder } from './OverlayReminder';
import { BlinkToast } from './BlinkToast';

export function NativeReminder() {
  const [reminder, setReminder] = useState<{ payload: ReminderPayload; sequence: number } | null>(null);

  useEffect(() => {
    document.body.classList.add('bb-overlay-body');
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void listen<ReminderPayload>('blinkbreak:reminder', (next) => {
      if (!cancelled) {
        setReminder((current) => ({ payload: next, sequence: (current?.sequence ?? 0) + 1 }));
      }
    }).then((cleanup) => {
      if (cancelled) cleanup();
      else unsubscribe = cleanup;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
      document.body.classList.remove('bb-overlay-body');
    };
  }, []);

  const action = (next: CardAction) => {
    if (!reminder) return;
    void emitReminderAction({ kind: reminder.payload.kind, action: next });
    void hideNativeReminder();
  };

  if (!reminder) return <main className="native-reminder-shell" />;

  const { payload, sequence } = reminder;

  return (
    <main className="native-reminder-shell">
      {payload.presentation === 'toast' ? (
        <BlinkToast key={sequence} durationSec={payload.durationSec} reducedMotion={payload.reducedMotion} onAction={action} />
      ) : (
        <OverlayReminder
          key={sequence}
          kind={payload.kind as ReminderKind}
          title={payload.title}
          body={payload.body}
          durationSec={payload.durationSec}
          snoozeSec={payload.snoozeSec}
          reducedMotion={payload.reducedMotion}
          onAction={action}
        />
      )}
    </main>
  );
}
