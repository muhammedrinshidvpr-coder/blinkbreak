import { useState } from 'react';
import { REMINDER_META, formatShortDuration, presentationFor, type AppSettings, type ReminderDefinition, type ReminderKind } from '../lib/types';
import { useReducedMotion } from '../lib/motion';
import { ReminderSymbol, restTime } from './symbols';
import { useElapsed } from './useElapsed';
import { BlinkToast } from './BlinkToast';
import { OverlayReminder } from './OverlayReminder';

const KINDS: ReminderKind[] = ['blink', 'lookaway', 'posture', 'move', 'rest'];

function Tile({ kind, def, reducedMotion, onPreview }: {
  kind: ReminderKind; def: ReminderDefinition; reducedMotion: boolean; onPreview: () => void;
}) {
  const [engaged, setEngaged] = useState(false);
  const animate = engaged && !reducedMotion;
  const t = useElapsed(animate, restTime(kind, def.durationSec));
  return (
    <article
      className={`bb-tile ${def.enabled ? '' : 'is-off'}`}
      data-kind={kind}
      data-testid={`gallery-${kind}`}
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={() => setEngaged(false)}
    >
      <div className="bb-tile-symbol">
        <ReminderSymbol kind={kind} t={t} durationSec={def.durationSec} still={!animate} />
      </div>
      <h2>{def.label}</h2>
      <p>
        Every {formatShortDuration(def.intervalSec)} · {formatShortDuration(def.durationSec)}
        {!def.enabled && ' · off'}
      </p>
      <button
        className="bb-btn small"
        data-testid={`gallery-preview-${kind}`}
        aria-label={`Preview ${def.label} reminder`}
        onClick={onPreview}
      >
        Preview
      </button>
    </article>
  );
}

/**
 * The five reminders at rest; hovering or focusing one plays its motion, and Preview shows
 * the real reminder. Previews are local only: they never touch the schedule or today's stats.
 */
export function Gallery({ settings }: { settings: AppSettings }) {
  const reducedMotion = useReducedMotion(settings.reducedMotion);
  const [preview, setPreview] = useState<{ kind: ReminderKind; id: number } | null>(null);
  const close = () => setPreview(null);
  const def = preview && settings.reminders[preview.kind];

  return (
    <>
      <section className="bb-gallery" aria-label="Reminders">
        {KINDS.map((kind) => (
          <Tile
            key={kind}
            kind={kind}
            def={settings.reminders[kind]}
            reducedMotion={reducedMotion}
            onPreview={() => setPreview({ kind, id: Date.now() })}
          />
        ))}
      </section>
      {preview && def && (presentationFor(preview.kind) === 'toast' ? (
        <BlinkToast key={preview.id} durationSec={def.durationSec} reducedMotion={reducedMotion} onAction={close} />
      ) : (
        <OverlayReminder
          key={preview.id}
          kind={preview.kind}
          {...REMINDER_META[preview.kind]}
          durationSec={def.durationSec}
          snoozeSec={def.snoozeSec}
          reducedMotion={reducedMotion}
          onAction={close}
        />
      ))}
    </>
  );
}
