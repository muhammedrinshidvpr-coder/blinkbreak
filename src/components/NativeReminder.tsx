import { useEffect, useState } from 'react';
import type { ReminderKind } from '../lib/types';
import { emitReminderAction, hideNativeReminder, listen, type ReminderPayload } from '../lib/native';
import { ReminderCard, type CardAction } from './ReminderCard';

const FALLBACK: ReminderPayload = {
  kind: 'blink',
  title: 'Blink, friend',
  body: 'Relax your face and blink slowly.',
};

export function NativeReminder({ reducedMotion }: { reducedMotion: boolean }) {
  const [payload, setPayload] = useState<ReminderPayload>(FALLBACK);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void listen<ReminderPayload>('blinkbreak:reminder', (next) => {
      if (!cancelled) setPayload(next);
    }).then((cleanup) => {
      if (cancelled) cleanup();
      else unsubscribe = cleanup;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const action = (next: CardAction) => {
    void emitReminderAction({ kind: payload.kind, action: next });
    void hideNativeReminder();
  };

  return (
    <main className="native-reminder-shell">
      <ReminderCard
        kind={payload.kind as ReminderKind}
        title={payload.title}
        body={payload.body}
        durationSec={payload.kind === 'blink' ? 10 : payload.kind === 'lookaway' ? 20 : 30}
        reducedMotion={reducedMotion}
        onAction={action}
      />
    </main>
  );
}
