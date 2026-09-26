import { useEffect, useState } from 'react';

/** Either the operating system or the app can request less motion. */
export function useReducedMotion(preference = false): boolean {
  const [system, setSystem] = useState(() =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystem(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return preference || system;
}

/** Reminder exit length; keep in sync with the `bb-*-out` keyframes in index.css. */
export const EXIT_MS = 200;
/** Opacity-only exit used when motion is reduced. */
export const REDUCED_EXIT_MS = 120;
