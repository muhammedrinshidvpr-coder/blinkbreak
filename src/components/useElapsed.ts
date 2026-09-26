import { useEffect, useState } from 'react';

/**
 * Seconds of visible running time, starting from `staticAt` and updated every animation frame
 * while `running`. Stays at `staticAt` when not running (reduced motion) or where rAF is
 * unavailable. Hidden time is not counted, so motion resumes where it left off.
 */
export function useElapsed(running: boolean, staticAt = 0): number {
  const [elapsed, setElapsed] = useState(staticAt);

  useEffect(() => {
    if (!running || typeof requestAnimationFrame !== 'function') {
      setElapsed(staticAt);
      return;
    }
    let previous = performance.now();
    let visibleMs = 0;
    let frame = 0;
    const tick = (now: number) => {
      visibleMs += now - previous;
      previous = now;
      setElapsed(staticAt + visibleMs / 1000);
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        previous = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    setElapsed(staticAt);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [running, staticAt]);

  return elapsed;
}
