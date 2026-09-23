import { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import { DEFAULT_SETTINGS, cloneSettings, sanitizeSettings, type AppSettings, type DayStats, type ReminderKind } from './lib/types';
import { createSchedulerState, tick, applyAction, nextDueInSec, isPaused, type SchedulerState } from './lib/scheduler';
import { ReminderCard, type CardAction } from './components/ReminderCard';
import { Dashboard } from './components/Dashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { BlinkEye } from './components/cartoon/BlinkEye';
import { LookAway } from './components/cartoon/LookAway';
import { PostureReset } from './components/cartoon/PostureReset';
import { MoveStretch } from './components/cartoon/MoveStretch';

const STATS_KEY = 'blinkbreak.stats.v1';
const SETTINGS_KEY = 'blinkbreak.settings.v1';

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function freshStats(): DayStats {
  return { date: todayKey(), activeSec: 0, shown: {}, completed: {}, skipped: {}, snoozed: {} };
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? sanitizeSettings(JSON.parse(raw)) : cloneSettings(DEFAULT_SETTINGS);
    } catch {
      return cloneSettings(DEFAULT_SETTINGS);
    }
  });
  const [stats, setStats] = useState<DayStats>(() => {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      const parsed = raw ? (JSON.parse(raw) as DayStats) : freshStats();
      return parsed.date === todayKey() ? parsed : freshStats();
    } catch {
      return freshStats();
    }
  });
  const [activeReminder, setActiveReminder] = useState<{ kind: ReminderKind } | null>(null);
  const [tab, setTab] = useState<'today' | 'gallery' | 'settings'>('today');
  const schedRef = useRef<SchedulerState>(createSchedulerState());

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  // Demo engine: in the desktop app Rust feeds real active seconds.
  // In the browser preview we simulate 1 active second per real second.
  useEffect(() => {
    const id = setInterval(() => {
      setStats((prev) => ({ ...prev, activeSec: prev.activeSec + 1 }));
      const ev = tick(schedRef.current, settings, Date.now(), 1);
      if (ev && !activeReminder) {
        setActiveReminder({ kind: ev.kind });
        setStats((prev) => ({ ...prev, shown: { ...prev.shown, [ev.kind]: (prev.shown[ev.kind] ?? 0) + 1 } }));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [settings, activeReminder]);

  const nextIn = useMemo(
    () => nextDueInSec(schedRef.current, settings, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, stats.activeSec, activeReminder],
  );

  const handleAction = (a: CardAction) => {
    if (!activeReminder) return;
    applyAction(schedRef.current, settings, activeReminder.kind, a);
    const kind = activeReminder.kind;
    setStats((prev) => {
      const key = a === 'done' ? 'completed' : a === 'skip' ? 'skipped' : 'snoozed';
      return { ...prev, [key]: { ...prev[key], [kind]: ((prev[key][kind] ?? 0) + 1) } };
    });
    setActiveReminder(null);
  };

  const paused = isPaused(settings, Date.now());

  return (
    <div className="bb-shell">
      <header className="bb-hero">
        <div style={{ fontSize: 48 }} aria-hidden>👁️</div>
        <div>
          <h1>BlinkBreak</h1>
          <p>Gentle cartoon nudges to blink, look away, sit well, and move. Always dismissible, never blocking.</p>
        </div>
      </header>

      <nav className="bb-tabs" aria-label="Sections">
        <button className={`bb-btn ${tab === 'today' ? 'primary' : ''}`} data-testid="tab-today" onClick={() => setTab('today')}>Today</button>
        <button className={`bb-btn ${tab === 'gallery' ? 'primary' : ''}`} data-testid="tab-gallery" onClick={() => setTab('gallery')}>Cartoon gallery</button>
        <button className={`bb-btn ${tab === 'settings' ? 'primary' : ''}`} data-testid="tab-settings" onClick={() => setTab('settings')}>Settings</button>
      </nav>

      {activeReminder && (
        <div style={{ marginTop: 16 }}>
          <ReminderCard
            kind={activeReminder.kind}
            title={{ blink: 'Time to blink', lookaway: 'Look far away', posture: 'Posture reset', move: 'Move & stretch', rest: 'Take a longer rest' }[activeReminder.kind]}
            body="A gentle nudge — dismiss any time. Your work is never blocked."
            durationSec={settings.reminders[activeReminder.kind].durationSec}
            reducedMotion={settings.reducedMotion}
            onAction={handleAction}
          />
        </div>
      )}

      <div className="bb-grid">
        {tab === 'today' && (
          <Dashboard
            activeSec={stats.activeSec}
            nextInSec={nextIn}
            paused={paused}
            stats={stats}
            onBreakNow={() => {
              setActiveReminder({ kind: 'lookaway' });
              setStats((prev) => ({ ...prev, shown: { ...prev.shown, lookaway: (prev.shown.lookaway ?? 0) + 1 } }));
            }}
            onPause={(min) => setSettings((s) => ({ ...s, pauseUntilMs: Date.now() + min * 60_000 }))}
            onResume={() => setSettings((s) => ({ ...s, pauseUntilMs: null }))}
          />
        )}
        {tab === 'gallery' && (
          <>
            <div className="bb-card" data-testid="gallery-blink"><h2>Blink</h2><div className="bb-stage"><BlinkEye reducedMotion={settings.reducedMotion} /></div></div>
            <div className="bb-card" data-testid="gallery-lookaway"><h2>Look away (20-20-20)</h2><div className="bb-stage"><LookAway reducedMotion={settings.reducedMotion} /></div></div>
            <div className="bb-card" data-testid="gallery-posture"><h2>Posture reset</h2><div className="bb-stage"><PostureReset reducedMotion={settings.reducedMotion} /></div></div>
            <div className="bb-card" data-testid="gallery-move"><h2>Move & stretch</h2><div className="bb-stage"><MoveStretch reducedMotion={settings.reducedMotion} /></div></div>
          </>
        )}
        {tab === 'settings' && (
          <SettingsPanel settings={settings} onChange={setSettings} onReset={() => setSettings(cloneSettings(DEFAULT_SETTINGS))} />
        )}
      </div>

      <p className="bb-note" style={{ marginTop: 20 }}>
        Health basis: 20-20-20 rule (AOA), frequent blinking + distance breaks (AAO), microbreaks + posture variety (OSHA).
        This app encourages habits; it is not a medical device.
      </p>
    </div>
  );
}
