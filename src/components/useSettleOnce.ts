import { useEffect, useRef, useState } from 'react';
import type { CardAction } from './ReminderCard';

/** Length of the reminder exit animation; keep in sync with the `bb-*-out` keyframes in index.css. */
export const EXIT_MS = 320;

/**
 * One-shot reminder settlement: the first action wins, the exit animation plays,
 * then `onAction` fires exactly once. Reduced motion settles immediately.
 */
export function useSettleOnce(onAction: (action: CardAction) => void, reducedMotion: boolean) {
  const [leaving, setLeaving] = useState(false);
  const settledRef = useRef(false);
  const onActionRef = useRef(onAction);
  const timerRef = useRef<number>();

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const settle = (action: CardAction) => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (reducedMotion) {
      onActionRef.current(action);
      return;
    }
    setLeaving(true);
    timerRef.current = window.setTimeout(() => onActionRef.current(action), EXIT_MS);
  };

  return { leaving, settle };
}
