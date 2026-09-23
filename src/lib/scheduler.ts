/**
 * Gentle scheduler.
 * CONTRACT:
 * - GUARANTEES: counts only active-use seconds; one due reminder at a time;
 *   sleep gaps never produce reminder floods (max one emitted per tick).
 * - EXPECTS: caller advances time monotonically via tick(nowMs, activeSec).
 * - DOES NOT: touch DOM, windows, or system clocks.
 */
import { AppSettings, ReminderEvent, ReminderKind, REMINDER_META } from './types';

export interface SchedulerState {
  /** Active-use seconds accumulated toward each kind since last due/dismiss */
  accruedSec: Record<ReminderKind, number>;
  lastTickMs: number | null;
}

const KINDS: ReminderKind[] = ['blink', 'lookaway', 'posture', 'move', 'rest'];

export function createSchedulerState(): SchedulerState {
  return {
    accruedSec: { blink: 0, lookaway: 0, posture: 0, move: 0, rest: 0 },
    lastTickMs: null,
  };
}

export function isPaused(settings: AppSettings, nowMs: number): boolean {
  return settings.pauseUntilMs !== null && nowMs < settings.pauseUntilMs;
}

export function inQuietHours(settings: AppSettings, now: Date): boolean {
  if (!settings.quietHours.enabled) return false;
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = toMin(settings.quietHours.start);
  const end = toMin(settings.quietHours.end);
  if (start === end) return false;
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end; // crosses midnight
}

/**
 * Advance scheduler by activeSec seconds of real computer use.
 * Returns at most ONE reminder (highest priority among due).
 * Large gaps (sleep) are clamped: each kind accrues at most 1.5x its interval per tick.
 */
export function tick(
  state: SchedulerState,
  settings: AppSettings,
  nowMs: number,
  activeSec: number,
  nowDate = new Date(nowMs),
): ReminderEvent | null {
  if (state.lastTickMs !== null && nowMs < state.lastTickMs) {
    // Clock moved backwards: ignore, keep state.
    return null;
  }
  state.lastTickMs = nowMs;

  if (activeSec < 0) activeSec = 0;
  if (activeSec === 0) return null;
  if (isPaused(settings, nowMs)) return null;
  if (inQuietHours(settings, nowDate)) return null;

  // Clamp absurd jumps (e.g. resumed after 8h sleep counted as active): max +1 interval each.
  for (const kind of KINDS) {
    const def = settings.reminders[kind];
    if (!def.enabled) continue;
    const add = Math.min(activeSec, def.intervalSec * 1.5 - state.accruedSec[kind]);
    state.accruedSec[kind] = Math.max(0, state.accruedSec[kind] + Math.max(0, add));
  }

  const due = KINDS.filter((k) => {
    const def = settings.reminders[k];
    return def.enabled && state.accruedSec[k] >= def.intervalSec;
  }).sort((a, b) => settings.reminders[b].priority - settings.reminders[a].priority);

  if (due.length === 0) return null;
  const winner = due[0];
  // Reset winner; decay others slightly so a second reminder can surface soon but not instantly.
  state.accruedSec[winner] = 0;
  for (const k of due.slice(1)) {
    state.accruedSec[k] = settings.reminders[k].intervalSec * 0.9;
  }
  return {
    kind: winner,
    dueAtMs: nowMs,
    title: REMINDER_META[winner].title,
    body: REMINDER_META[winner].body,
  };
}

/** Record user action on a reminder: done/skip resets its timer; snooze pushes it forward. */
export function applyAction(
  state: SchedulerState,
  settings: AppSettings,
  kind: ReminderKind,
  action: 'done' | 'skip' | 'snooze',
): void {
  const def = settings.reminders[kind];
  if (action === 'snooze') {
    // Negative accrual = must accumulate snoozeSec before reaching interval.
    state.accruedSec[kind] = def.intervalSec - def.snoozeSec;
    if (state.accruedSec[kind] < 0) state.accruedSec[kind] = 0;
  } else {
    state.accruedSec[kind] = 0;
  }
}

/** Seconds until next due reminder (for tray tooltip / dashboard). Null when paused/all disabled. */
export function nextDueInSec(state: SchedulerState, settings: AppSettings, nowMs: number): number | null {
  if (isPaused(settings, nowMs)) return null;
  let best: number | null = null;
  for (const kind of KINDS) {
    const def = settings.reminders[kind];
    if (!def.enabled) continue;
    const remain = def.intervalSec - state.accruedSec[kind];
    if (best === null || remain < best) best = remain;
  }
  return best === null ? null : Math.max(0, Math.round(best));
}
