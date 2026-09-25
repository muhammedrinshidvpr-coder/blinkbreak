import { useEffect, useState } from 'react';

/**
 * Seconds since mount, updated every animation frame while `running`.
 * Stays at `staticAt` when not running (reduced motion) or where rAF is unavailable,
 * and pauses while the page is hidden.
 */
export function useElapsed(running: boolean, staticAt = 0): number {
  const [elapsed, setElapsed] = useState(running ? 0 : staticAt);

  useEffect(() => {
    if (!running || typeof requestAnimationFrame !== 'function') {
      setElapsed(staticAt);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      if (!document.hidden) setElapsed((now - start) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, staticAt]);

  return elapsed;
}
