import { REMINDER_META, type DayStats, type ReminderKind } from '../lib/types';
import { ReminderSymbol } from './symbols';

/** What the scheduler is doing right now, from the dashboard's point of view. */
export type ScheduleStatus =
  | { state: 'active'; next: { kind: ReminderKind; inSec: number } }
  | { state: 'paused'; untilMs: number }
  | { state: 'quiet'; until: string }
  | { state: 'off' };

function formatActive(sec: number): string {
  const mm = Math.floor(sec / 60);
  return mm >= 60 ? `${Math.floor(mm / 60)}h ${mm % 60}m` : `${mm}m`;
}

function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function Dashboard({
  activeSec,
  status,
  stats,
  onBreakNow,
  onPause,
  onResume,
}: {
  activeSec: number;
  status: ScheduleStatus;
  stats: DayStats;
  onBreakNow: () => void;
  onPause: (min: number) => void;
  onResume: () => void;
}) {
  const shown = Object.values(stats.shown).reduce((a, b) => a + (b ?? 0), 0);
  const done = Object.values(stats.completed).reduce((a, b) => a + (b ?? 0), 0);
  const paused = status.state === 'paused';
  const kind = status.state === 'active' ? status.next.kind : 'blink';

  let eyebrow: string;
  let headline: string;
  let when: string;
  if (status.state === 'active') {
    eyebrow = 'Next reminder';
    headline = REMINDER_META[status.next.kind].title;
    when = `in ${Math.max(1, Math.ceil(status.next.inSec / 60))}m of screen time`;
  } else if (status.state === 'paused') {
    eyebrow = 'Paused';
    headline = 'Take your time';
    when = `until ${formatClock(status.untilMs)}`;
  } else if (status.state === 'quiet') {
    eyebrow = 'Quiet hours';
    headline = 'Reminders are resting';
    when = `until ${status.until}`;
  } else {
    eyebrow = 'All reminders are off';
    headline = 'Nothing scheduled';
    when = 'Turn reminders on in Settings';
  }

  return (
    <div className="bb-today" data-testid="dashboard">
      <section className={`bb-panel bb-hero is-${status.state}`} data-kind={kind} aria-label="Next reminder">
        <div className="bb-hero-symbol" aria-hidden="true">
          <ReminderSymbol kind={kind} t={0} durationSec={20} still />
        </div>
        <div className="bb-hero-text">
          <p className="bb-eyebrow">{eyebrow}</p>
          <h2>{headline}</h2>
          <p className="bb-quiet" data-testid="dash-next">{when}</p>
        </div>
        <div className="bb-actions bb-hero-actions">
          <button className="bb-btn primary" data-testid="dash-break-now" onClick={onBreakNow}>Take a break</button>
          {paused
            ? <button className="bb-btn" data-testid="dash-resume" onClick={onResume}>Resume</button>
            : <>
                <button className="bb-btn" data-testid="dash-pause-15" onClick={() => onPause(15)}>Pause 15m</button>
                <button className="bb-btn" data-testid="dash-pause-60" onClick={() => onPause(60)}>Pause 1h</button>
              </>}
        </div>
      </section>

      <dl className="bb-panel bb-stats" aria-label="Today">
        <div>
          <dt>Active today</dt>
          <dd data-testid="dash-active">{formatActive(activeSec)}</dd>
        </div>
        <div>
          <dt>Breaks taken</dt>
          <dd data-testid="dash-done">{done}<span> of {shown}</span></dd>
        </div>
      </dl>
    </div>
  );
}
