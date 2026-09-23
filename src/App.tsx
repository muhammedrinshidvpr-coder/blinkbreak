import { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import { DEFAULT_SETTINGS, cloneSettings, sanitizeSettings, type AppSettings, type DayStats, type ReminderKind } from './lib/types';
import { createSchedulerState, tick, applyAction, nextDueInSec, isPaused, type SchedulerState } from './lib/scheduler';
import { classifyActivity } from './lib/activity';
import {
  getAutostartEnabled,
  getIdleSeconds,
  getWindowLabel,
  isTauriRuntime,
  listen,
  showNativeReminder,
} from './lib/native';
import { ReminderCard, type CardAction } from './components/ReminderCard';
import { NativeReminder } from './components/NativeReminder';
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
  const [windowLabel, setWindowLabel] = useState('main');
  const schedRef = useRef<SchedulerState>(createSchedulerState());
  const activeReminderRef = useRef(activeReminder);

  useEffect(() => {
    activeReminderRef.current = activeReminder;
  }, [activeReminder]);

  useEffect(() => {
    void getWindowLabel().then(setWindowLabel);
    // Trust the OS as source of truth for login autostart (user may change it outside the app).
    void getAutostartEnabled().then((enabled) => {
      if (enabled !== null) setSettings((s) => (s.autostart === enabled ? s : { ...s, autostart: enabled }));
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    if (windowLabel !== 'main') return;
    let unsubscribe: (() => void) | undefined;
    void listen<{ kind: ReminderKind; action: CardAction }>('blinkbreak:reminder-action', ({ kind, action }) => {
      applyAction(schedRef.current, settings, kind, action);
      setStats((prev) => {
        const key = action === 'done' ? 'completed' : action === 'skip' ? 'skipped' : 'snoozed';
        return { ...prev, [key]: { ...prev[key], [kind]: (prev[key][kind] ?? 0) + 1 } };
      });
    }).then((cleanup) => { unsubscribe = cleanup; });
    return () => unsubscribe?.();
  }, [settings, windowLabel]);

  // Tray menu actions from Rust (work even while the dashboard is hidden).
  useEffect(() => {
    if (windowLabel !== 'main') return;
    let offPause: (() => void) | undefined;
    let offBreak: (() => void) | undefined;
    void listen('blinkbreak:pause-15', () => {
      setSettings((s) => ({ ...s, pauseUntilMs: Date.now() + 15 * 60_000 }));
    }).then((cleanup) => { offPause = cleanup; });
    void listen('blinkbreak:break-now', () => {
      handleBreakNowRef.current();
    }).then((cleanup) => { offBreak = cleanup; });
    return () => { offPause?.(); offBreak?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowLabel]);

  // Tauri supplies real Windows idle time. Browser preview mode uses one
  // active second per wall-clock second so the complete flow stays testable.
  useEffect(() => {
    if (windowLabel !== 'main') return;
    let previous: { atMs: number; idleMs: number } | null = null;
    let running = false;
    const poll = async () => {
      if (running) return;
      running = true;
      const now = Date.now();
      const idleSeconds = await getIdleSeconds();
      const sample = { atMs: now, idleMs: (idleSeconds ?? 0) * 1000 };
      const activity = idleSeconds === null
        ? { activeSec: 1, sleepGap: false }
        : classifyActivity(previous, sample, settings.idleThresholdSec);
      previous = sample;
      if (activity.sleepGap || activity.activeSec <= 0) {
        running = false;
        return;
      }
      setStats((prev) => ({ ...prev, activeSec: prev.activeSec + activity.activeSec }));
      const ev = tick(schedRef.current, settings, now, activity.activeSec);
      if (ev && !activeReminderRef.current) {
        const showLocal = () => {
          setActiveReminder({ kind: ev.kind });
          setStats((prev) => ({ ...prev, shown: { ...prev.shown, [ev.kind]: (prev.shown[ev.kind] ?? 0) + 1 } }));
        };
        if (isTauriRuntime()) {
          try {
            await showNativeReminder({ kind: ev.kind, title: ev.title, body: ev.body });
            setStats((prev) => ({ ...prev, shown: { ...prev.shown, [ev.kind]: (prev.shown[ev.kind] ?? 0) + 1 } }));
          } catch {
            showLocal();
          }
        } else {
          showLocal();
        }
      }
      running = false;
    };
    const id = window.setInterval(() => void poll(), 1000);
    void poll();
    return () => window.clearInterval(id);
  }, [settings, windowLabel]);

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

  const handleBreakNow = () => {
    const kind: ReminderKind = 'lookaway';
    setActiveReminder({ kind });
    setStats((prev) => ({ ...prev, shown: { ...prev.shown, [kind]: (prev.shown[kind] ?? 0) + 1 } }));
  };
  const handleBreakNowRef = useRef(handleBreakNow);
  useEffect(() => {
    handleBreakNowRef.current = handleBreakNow;
  });

  const paused = isPaused(settings, Date.now());

  if (windowLabel === 'reminder') return <NativeReminder reducedMotion={settings.reducedMotion} />;

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
        <div className="bb-reminder-overlay">
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
            onBreakNow={handleBreakNow}
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
