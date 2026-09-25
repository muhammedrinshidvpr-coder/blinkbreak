import { useEffect, useState } from 'react';
import type { ReminderKind } from '../lib/types';
import { emitReminderAction, hideNativeReminder, listen, type ReminderPayload } from '../lib/native';
import type { CardAction } from './ReminderCard';
import { OverlayReminder } from './OverlayReminder';
import { BlinkToast } from './BlinkToast';
import { useApplyTheme } from '../lib/theme';
import { playChime } from '../lib/chime';

export function NativeReminder() {
  const [reminder, setReminder] = useState<{ payload: ReminderPayload; sequence: number } | null>(null);

  useEffect(() => {
    document.body.classList.add('bb-overlay-body');
    document.documentElement.classList.add('bb-overlay-document');
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void listen<ReminderPayload>('blinkbreak:reminder', (next) => {
      if (!cancelled) {
        if (next.chime) playChime(next.volume);
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
      document.documentElement.classList.remove('bb-overlay-document');
    };
  }, []);

  useApplyTheme(reminder?.payload.theme ?? 'light');

  const action = (next: CardAction) => {
    if (!reminder) return;
    // Hide first so the window is gone before the scheduler can present the next one;
    // report the action even if hiding fails, or the scheduler would wait forever.
    void (async () => {
      try {
        await hideNativeReminder();
      } finally {
        setReminder(null);
        await emitReminderAction({ kind: reminder.payload.kind, action: next });
      }
    })();
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
          manageFocus={false}
        />
      )}
    </main>
  );
}
