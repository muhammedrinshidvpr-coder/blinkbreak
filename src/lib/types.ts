/**
 * Core domain types for BlinkBreak.
 * All durations are in seconds. All intervals count ACTIVE use, not wall-clock.
 */

export type ReminderKind = 'blink' | 'lookaway' | 'posture' | 'move' | 'rest';

export interface ReminderDefinition {
  kind: ReminderKind;
  /** Human label shown in UI */
  label: string;
  /** Active-use seconds between reminders */
  intervalSec: number;
  /** How long the reminder card stays / suggested duration */
  durationSec: number;
  enabled: boolean;
  /** Priority: higher wins when two reminders are due together */
  priority: number;
  snoozeSec: number;
}

export interface AppSettings {
  version: 1;
  reminders: Record<ReminderKind, ReminderDefinition>;
  /** Seconds of no input before timers pause */
  idleThresholdSec: number;
  quietHours: { enabled: boolean; start: string; end: string };
  sound: { enabled: boolean; volume: number };
  reducedMotion: boolean;
  autostart: boolean;
  fullscreenDefer: boolean;
  pauseUntilMs: number | null;
}

export type ReminderAction = 'done' | 'skip' | 'snooze';

/** Blink is a small top-center toast; everything else dims the screen. */
export type ReminderPresentation = 'toast' | 'overlay';

export function presentationFor(kind: ReminderKind): ReminderPresentation {
  return kind === 'blink' ? 'toast' : 'overlay';
}

/**
 * What a reminder records when its countdown runs out.
 * Blink and look-away are done by simply following the countdown; the rest need the user to get up.
 */
export function expiryActionFor(kind: ReminderKind): 'done' | 'skip' {
  return kind === 'blink' || kind === 'lookaway' ? 'done' : 'skip';
}

/** Compact duration label: 45s, 5m, 1h 30m. */
export function formatShortDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h}h ${min % 60}m` : `${h}h`;
}

export interface ReminderEvent {
  kind: ReminderKind;
  dueAtMs: number;
  title: string;
  body: string;
}

export interface DayStats {
  date: string; // YYYY-MM-DD
  activeSec: number;
  shown: Partial<Record<ReminderKind, number>>;
  completed: Partial<Record<ReminderKind, number>>;
  skipped: Partial<Record<ReminderKind, number>>;
  snoozed: Partial<Record<ReminderKind, number>>;
}

export const REMINDER_META: Record<ReminderKind, { title: string; body: string }> = {
  blink: {
    title: 'Time to blink',
    body: 'Relax your face. Blink slowly with the cartoon eye.',
  },
  lookaway: {
    title: 'Look far away',
    body: 'Look at something about 20 feet away for 20 seconds. (20-20-20 rule)',
  },
  posture: {
    title: 'Posture reset',
    body: 'Relax your shoulders. Support your back. Head balanced over your torso.',
  },
  move: {
    title: 'Move & stretch',
    body: 'Stand, roll your shoulders, shake out your hands, walk briefly.',
  },
  rest: {
    title: 'Take a longer rest',
    body: 'You have been at it a while. Step away for 10–15 minutes if you can.',
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  reminders: {
    blink: { kind: 'blink', label: 'Blink', intervalSec: 5 * 60, durationSec: 10, enabled: true, priority: 1, snoozeSec: 5 * 60 },
    lookaway: { kind: 'lookaway', label: 'Look away', intervalSec: 20 * 60, durationSec: 20, enabled: true, priority: 2, snoozeSec: 10 * 60 },
    posture: { kind: 'posture', label: 'Posture', intervalSec: 30 * 60, durationSec: 20, enabled: true, priority: 3, snoozeSec: 15 * 60 },
    move: { kind: 'move', label: 'Move', intervalSec: 60 * 60, durationSec: 300, enabled: true, priority: 4, snoozeSec: 15 * 60 },
    rest: { kind: 'rest', label: 'Long rest', intervalSec: 120 * 60, durationSec: 600, enabled: true, priority: 5, snoozeSec: 30 * 60 },
  },
  idleThresholdSec: 60,
  quietHours: { enabled: false, start: '22:00', end: '08:00' },
  sound: { enabled: false, volume: 0.4 },
  reducedMotion: false,
  autostart: true,
  fullscreenDefer: true,
  pauseUntilMs: null,
};

export function cloneSettings(s: AppSettings): AppSettings {
  return JSON.parse(JSON.stringify(s)) as AppSettings;
}

/** Validate raw settings (e.g. loaded from disk). Returns problems; caller falls back to defaults. */
export function validateSettings(raw: unknown): string[] {
  const problems: string[] = [];
  if (typeof raw !== 'object' || raw === null) return ['settings is not an object'];
  const s = raw as Record<string, unknown>;
  if (s.version !== 1) problems.push('unsupported version');
  const rems = s.reminders as Record<string, ReminderDefinition> | undefined;
  if (!rems) {
    problems.push('missing reminders');
    return problems;
  }
  for (const kind of ['blink', 'lookaway', 'posture', 'move', 'rest'] as ReminderKind[]) {
    const r = rems[kind];
    if (!r) {
      problems.push(`missing reminder ${kind}`);
      continue;
    }
    if (!(r.intervalSec >= 60 && r.intervalSec <= 8 * 3600)) problems.push(`bad interval for ${kind}`);
    if (!(r.durationSec >= 5 && r.durationSec <= 3600)) problems.push(`bad duration for ${kind}`);
  }
  if (typeof s.idleThresholdSec !== 'number' || s.idleThresholdSec < 10 || s.idleThresholdSec > 900) {
    problems.push('bad idleThresholdSec');
  }
  return problems;
}

export function sanitizeSettings(raw: unknown): AppSettings {
  const fallback = cloneSettings(DEFAULT_SETTINGS);
  if (typeof raw !== 'object' || raw === null) return fallback;
  const problems = validateSettings(raw);
  if (problems.length > 0) return fallback;
  const merged = { ...fallback, ...(raw as Partial<AppSettings>) };
  merged.reminders = { ...fallback.reminders, ...((raw as AppSettings).reminders ?? {}) };
  return merged;
}
