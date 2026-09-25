import type { DayStats } from '../lib/types';

export function Dashboard({
  activeSec,
  nextInSec,
  paused,
  stats,
  onBreakNow,
  onPause,
  onResume,
}: {
  activeSec: number;
  nextInSec: number | null;
  paused: boolean;
  stats: DayStats;
  onBreakNow: () => void;
  onPause: (min: number) => void;
  onResume: () => void;
}) {
  const mm = Math.floor(activeSec / 60);
  const active = mm >= 60 ? `${Math.floor(mm / 60)}h ${mm % 60}m` : `${mm}m`;
  const shown = Object.values(stats.shown).reduce((a, b) => a + (b ?? 0), 0);
  const done = Object.values(stats.completed).reduce((a, b) => a + (b ?? 0), 0);
  return (
    <section className="bb-panel" data-testid="dashboard" aria-label="Today">
      <dl className="bb-stats">
        <div>
          <dt>Active today</dt>
          <dd data-testid="dash-active">{active}</dd>
        </div>
        <div>
          <dt>{paused ? 'Paused' : 'Next reminder'}</dt>
          <dd data-testid="dash-next">{nextInSec === null ? '—' : `${Math.ceil(nextInSec / 60)}m`}</dd>
        </div>
        <div>
          <dt>Breaks taken</dt>
          <dd data-testid="dash-done">{done}<span>/{shown}</span></dd>
        </div>
      </dl>
      <div className="bb-actions">
        <button className="bb-btn primary" data-testid="dash-break-now" onClick={onBreakNow}>Take a break</button>
        {paused
          ? <button className="bb-btn" data-testid="dash-resume" onClick={onResume}>Resume</button>
          : <>
              <button className="bb-btn" data-testid="dash-pause-15" onClick={() => onPause(15)}>Pause 15m</button>
              <button className="bb-btn" data-testid="dash-pause-60" onClick={() => onPause(60)}>Pause 1h</button>
            </>}
      </div>
      {paused && <p className="bb-quiet" data-testid="dash-paused-note">Reminders are paused. Take your time.</p>}
    </section>
  );
}
