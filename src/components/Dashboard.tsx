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
  const shown = Object.values(stats.shown).reduce((a, b) => a + (b ?? 0), 0);
  const done = Object.values(stats.completed).reduce((a, b) => a + (b ?? 0), 0);
  return (
    <section className="bb-card" data-testid="dashboard" aria-label="Today dashboard">
      <h2>Today</h2>
      <div className="bb-row" style={{ gap: 24 }}>
        <div><div className="bb-kpi" data-testid="dash-active">{mm}m</div><div className="bb-note">active use</div></div>
        <div><div className="bb-kpi" data-testid="dash-next">{nextInSec === null ? '—' : `${Math.ceil(nextInSec / 60)}m`}</div><div className="bb-note">until next nudge</div></div>
        <div><div className="bb-kpi" data-testid="dash-done">{done}/{shown}</div><div className="bb-note">breaks done / shown</div></div>
      </div>
      <div className="bb-row">
        <button className="bb-btn primary" data-testid="dash-break-now" onClick={onBreakNow}>Take a break now</button>
        {paused
          ? <button className="bb-btn" data-testid="dash-resume" onClick={onResume}>Resume</button>
          : <>
              <button className="bb-btn" data-testid="dash-pause-15" onClick={() => onPause(15)}>Pause 15m</button>
              <button className="bb-btn" data-testid="dash-pause-60" onClick={() => onPause(60)}>Pause 1h</button>
            </>}
      </div>
      {paused && <p className="bb-note" data-testid="dash-paused-note">Reminders paused. Take your time.</p>}
    </section>
  );
}
