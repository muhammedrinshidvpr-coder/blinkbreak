import { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import {
  DEFAULT_SETTINGS,
  REMINDER_META,
  cloneSettings,
  expiryActionFor,
  presentationFor,
  sanitizeSettings,
  type AppSettings,
  type DayStats,
  type ReminderEvent,
  type ReminderKind,
} from './lib/types';
import { createSchedulerState, tick, applyAction, nextDueInSec, isPaused, type SchedulerState } from './lib/scheduler';
import { classifyActivity } from './lib/activity';
import {
  getAutostartEnabled,
  getIdleSeconds,
  getWindowLabel,
  isFullscreenActive,
  isTauriRuntime,
  listen,
  showNativeReminder,
} from './lib/native';
import type { CardAction } from './components/ReminderCard';
import { useApplyTheme, useResolvedTheme } from './lib/theme';
import { NativeReminder } from './components/NativeReminder';
import { OverlayReminder } from './components/OverlayReminder';
import { BlinkToast } from './components/BlinkToast';
import { Dashboard } from './components/Dashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { Gallery } from './components/Gallery';
import { EyeSymbol } from './components/symbols';

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
  const resolvedTheme = useResolvedTheme(settings.theme);
  useApplyTheme(resolvedTheme, windowLabel !== 'reminder');
  const schedRef = useRef<SchedulerState>(createSchedulerState());
  const reminderVisibleRef = useRef(false);
  const presentingReminderRef = useRef(false);
  const pendingReminderRef = useRef<ReminderEvent | null>(null);

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

  const presentReminder = async (reminder: ReminderEvent): Promise<boolean> => {
    if (reminderVisibleRef.current || presentingReminderRef.current) return false;
    presentingReminderRef.current = true;

    try {
      if (isTauriRuntime() && settings.fullscreenDefer && await isFullscreenActive()) {
        pendingReminderRef.current ??= reminder;
        return false;
      }

      const showLocal = () => {
        reminderVisibleRef.current = true;
        setActiveReminder({ kind: reminder.kind });
      };

      pendingReminderRef.current = null;
      if (isTauriRuntime()) {
        reminderVisibleRef.current = true;
        try {
          await showNativeReminder({
            kind: reminder.kind,
            title: reminder.title,
            body: reminder.body,
            durationSec: settings.reminders[reminder.kind].durationSec,
            snoozeSec: settings.reminders[reminder.kind].snoozeSec,
            presentation: presentationFor(reminder.kind),
            expiryAction: expiryActionFor(reminder.kind),
            reducedMotion: settings.reducedMotion,
            theme: resolvedTheme,
          });
        } catch {
          reminderVisibleRef.current = false;
          showLocal();
        }
      } else {
        showLocal();
      }

      setStats((prev) => ({
        ...prev,
        shown: { ...prev.shown, [reminder.kind]: (prev.shown[reminder.kind] ?? 0) + 1 },
      }));
      return true;
    } finally {
      presentingReminderRef.current = false;
    }
  };

  useEffect(() => {
    if (windowLabel !== 'main') return;
    let unsubscribe: (() => void) | undefined;
    void listen<{ kind: ReminderKind; action: CardAction }>('blinkbreak:reminder-action', ({ kind, action }) => {
      reminderVisibleRef.current = false;
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

      if (pendingReminderRef.current && !reminderVisibleRef.current) {
        await presentReminder(pendingReminderRef.current);
        running = false;
        return;
      }
      if (reminderVisibleRef.current) {
        running = false;
        return;
      }

      const ev = tick(schedRef.current, settings, now, activity.activeSec);
      if (ev) await presentReminder(ev);
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
    reminderVisibleRef.current = false;
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
    void presentReminder({ kind, dueAtMs: Date.now(), ...REMINDER_META[kind] });
  };
  const handleBreakNowRef = useRef(handleBreakNow);
  useEffect(() => {
    handleBreakNowRef.current = handleBreakNow;
  });

  const paused = isPaused(settings, Date.now());

  if (windowLabel === 'reminder') return <NativeReminder />;

  const tabs = [
    { id: 'today', label: 'Today' },
    { id: 'gallery', label: 'Reminders' },
    { id: 'settings', label: 'Settings' },
  ] as const;

  return (
    <div className="bb-shell">
      <header className="bb-header">
        <div className="bb-brand" data-kind="blink">
          <span className="bb-brand-mark" aria-hidden="true"><EyeSymbol t={0} durationSec={10} still /></span>
          <h1>BlinkBreak</h1>
        </div>
        <nav className="bb-segmented" aria-label="Sections">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              className={tab === id ? 'is-active' : ''}
              aria-pressed={tab === id}
              data-testid={`tab-${id}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {activeReminder && presentationFor(activeReminder.kind) === 'toast' && (
        <BlinkToast
          durationSec={settings.reminders[activeReminder.kind].durationSec}
          reducedMotion={settings.reducedMotion}
          onAction={handleAction}
        />
      )}
      {activeReminder && presentationFor(activeReminder.kind) === 'overlay' && (
        <OverlayReminder
          kind={activeReminder.kind}
          title={REMINDER_META[activeReminder.kind].title}
          body={REMINDER_META[activeReminder.kind].body}
          durationSec={settings.reminders[activeReminder.kind].durationSec}
          snoozeSec={settings.reminders[activeReminder.kind].snoozeSec}
          reducedMotion={settings.reducedMotion}
          onAction={handleAction}
        />
      )}

      <main key={tab} className="bb-page">
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
        {tab === 'gallery' && <Gallery settings={settings} />}
        {tab === 'settings' && (
          <SettingsPanel settings={settings} onChange={setSettings} onReset={() => setSettings(cloneSettings(DEFAULT_SETTINGS))} />
        )}
      </main>

      <footer className="bb-footer">
        Based on the 20-20-20 rule and microbreak guidance. Encourages habits; not a medical device.
      </footer>
    </div>
  );
}
