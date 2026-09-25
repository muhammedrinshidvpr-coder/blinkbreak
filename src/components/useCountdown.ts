import { useEffect, useRef, useState } from 'react';

/** A single deadline drives both the visible ring and expiry, including after sleep. */
export function useCountdown(durationSec: number) {
  const duration = Math.max(0, durationSec * 1000);
  const deadline = useRef(Date.now() + duration);
  const [remainingMs, setRemainingMs] = useState(duration);
  useEffect(() => {
    deadline.current = Date.now() + duration;
    setRemainingMs(duration);
    const update = () => setRemainingMs(Math.max(0, deadline.current - Date.now()));
    const id = window.setInterval(update, 100);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, [duration]);
  return { left: Math.ceil(remainingMs / 1000), progress: duration > 0 ? remainingMs / duration : 0 };
}
