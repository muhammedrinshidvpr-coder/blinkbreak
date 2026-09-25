import { formatShortDuration, type AppSettings, type ReminderKind } from '../lib/types';
import { ReminderSymbol } from './symbols';
import { useElapsed } from './useElapsed';

const KINDS: ReminderKind[] = ['blink', 'lookaway', 'posture', 'move', 'rest'];

/** The five reminders, each symbol playing its motion on a loop. */
export function Gallery({ settings }: { settings: AppSettings }) {
  const t = useElapsed(!settings.reducedMotion);
  return (
    <section className="bb-gallery" aria-label="Reminders">
      {KINDS.map((kind) => {
        const def = settings.reminders[kind];
        return (
          <article key={kind} className="bb-tile" data-kind={kind} data-testid={`gallery-${kind}`}>
            <div className="bb-tile-symbol">
              <ReminderSymbol kind={kind} t={t} durationSec={def.durationSec} still={settings.reducedMotion} />
            </div>
            <h3>{def.label}</h3>
            <p>
              Every {formatShortDuration(def.intervalSec)} · {formatShortDuration(def.durationSec)}
              {!def.enabled && ' · off'}
            </p>
          </article>
        );
      })}
    </section>
  );
}
