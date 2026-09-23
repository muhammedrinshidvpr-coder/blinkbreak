import { describe, it, expect } from 'vitest';
import { classifyActivity } from './activity';
import { sanitizeSettings, validateSettings, DEFAULT_SETTINGS } from './types';

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
