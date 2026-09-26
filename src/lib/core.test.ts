import { describe, it, expect } from 'vitest';
import { classifyActivity } from './activity';
import { chimeFor, sanitizeSettings, validateSettings, DEFAULT_SETTINGS } from './types';

describe('activity', () => {
  it('first sample counts nothing', () => {
    const r = classifyActivity(null, { atMs: 1000, idleMs: 0 }, 60);
    expect(r.activeSec).toBe(0);
  });

  it('active poll gap counts as active', () => {
    const r = classifyActivity({ atMs: 0, idleMs: 0 }, { atMs: 5000, idleMs: 2000 }, 60);
    expect(r.isIdle).toBe(false);
    expect(r.activeSec).toBe(5);
  });

  it('idle threshold pauses accrual', () => {
    const r = classifyActivity({ atMs: 0, idleMs: 0 }, { atMs: 5000, idleMs: 120_000 }, 60);
    expect(r.isIdle).toBe(true);
    expect(r.activeSec).toBe(0);
  });

  it('huge gap treated as sleep, not active', () => {
    const r = classifyActivity({ atMs: 0, idleMs: 0 }, { atMs: 8 * 3600_000, idleMs: 0 }, 60);
    expect(r.sleepGap).toBe(true);
    expect(r.activeSec).toBe(0);
  });
});

describe('settings validation', () => {
  it('accepts defaults', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual([]);
  });
  it('rejects garbage and sanitizes to defaults', () => {
    expect(validateSettings(null).length).toBeGreaterThan(0);
    const s = sanitizeSettings({ nonsense: true });
    expect(s.reminders.blink.intervalSec).toBe(DEFAULT_SETTINGS.reminders.blink.intervalSec);
  });
  it('rejects out-of-range intervals', () => {
    const bad = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    bad.reminders.blink.intervalSec = 5;
    expect(validateSettings(bad).length).toBeGreaterThan(0);
  });
});

describe('reminder presentation + timing rules', () => {
  it('blink is a toast, everything else is an overlay', async () => {
    const { presentationFor } = await import('./types');
    expect(presentationFor('blink')).toBe('toast');
    for (const kind of ['lookaway', 'posture', 'move', 'rest'] as const) expect(presentationFor(kind)).toBe('overlay');
  });

  it('expiry counts as done only where following the countdown is the exercise', async () => {
    const { expiryActionFor } = await import('./types');
    expect(expiryActionFor('blink')).toBe('done');
    expect(expiryActionFor('lookaway')).toBe('done');
    expect(expiryActionFor('posture')).toBe('skip');
    expect(expiryActionFor('move')).toBe('skip');
    expect(expiryActionFor('rest')).toBe('skip');
  });

  it('formats every default snooze length the way the button shows it', async () => {
    const { formatShortDuration, DEFAULT_SETTINGS } = await import('./types');
    const labels = Object.values(DEFAULT_SETTINGS.reminders).map((r) => formatShortDuration(r.snoozeSec));
    expect(labels).toEqual(['5m', '10m', '15m', '15m', '30m']);
    expect(formatShortDuration(45)).toBe('45s');
    expect(formatShortDuration(90 * 60)).toBe('1h 30m');
  });
});

describe('appearance setting', () => {
  it('defaults to system and repairs invalid saved values', async () => {
    const { sanitizeSettings, DEFAULT_SETTINGS } = await import('./types');
    expect(DEFAULT_SETTINGS.theme).toBe('system');
    const saved = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    delete saved.theme; // settings saved by v0.1.0
    expect(sanitizeSettings(saved).theme).toBe('system');
    expect(sanitizeSettings({ ...saved, theme: 'neon' }).theme).toBe('system');
    expect(sanitizeSettings({ ...saved, theme: 'dark' }).theme).toBe('dark');
  });

  it('resolves System from the Windows preference', async () => {
    const { resolveTheme } = await import('./theme');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });
});

describe('chime policy', () => {
  it('chimes only for big breaks, and only when switched on', () => {
    const off = { sound: { enabled: false, volume: 0.4 } };
    const on = { sound: { enabled: true, volume: 0.4 } };
    expect(chimeFor('lookaway', off)).toBe(false);
    expect(chimeFor('rest', on)).toBe(true);
    expect(chimeFor('posture', on)).toBe(true);
    expect(chimeFor('blink', on)).toBe(false);
  });
});
