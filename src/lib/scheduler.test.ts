import { describe, it, expect } from 'vitest';
import { createSchedulerState, tick, applyAction, nextDueInSec, inQuietHours } from './scheduler';
import { DEFAULT_SETTINGS, cloneSettings } from './types';

describe('scheduler timing', () => {
  it('fires blink after 5 active minutes', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    const st = createSchedulerState();
    const t0 = Date.UTC(2026, 8, 24, 9, 0, 0);
    expect(tick(st, s, t0, 299)).toBeNull();
    const ev = tick(st, s, t0 + 1000, 1);
    expect(ev?.kind).toBe('blink');
  });

  it('idle seconds (activeSec=0) never trigger', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    const st = createSchedulerState();
    const t0 = Date.now();
    for (let i = 0; i < 100; i++) expect(tick(st, s, t0 + i * 1000, 0)).toBeNull();
  });

  it('20-20-20: lookaway wins over blink on priority when both due', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    const st = createSchedulerState();
    const ev = tick(st, s, Date.now(), 20 * 60);
    expect(ev?.kind).toBe('lookaway');
  });

  it('pause suppresses all reminders', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    s.pauseUntilMs = Date.now() + 3600_000;
    const st = createSchedulerState();
    expect(tick(st, s, Date.now(), 7200)).toBeNull();
    expect(nextDueInSec(st, s, Date.now())).toBeNull();
  });

  it('snooze delays only that kind', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    const st = createSchedulerState();
    const t0 = Date.now();
    expect(tick(st, s, t0, 5 * 60)?.kind).toBe('blink');
    applyAction(st, s, 'blink', 'snooze');
    expect(tick(st, s, t0 + 1000, 60)).toBeNull();
  });

  it('done resets timer to full interval', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    const st = createSchedulerState();
    const t0 = Date.now();
    tick(st, s, t0, 5 * 60);
    applyAction(st, s, 'blink', 'done');
    expect(nextDueInSec(st, s, t0)).toBe(5 * 60);
  });

  it('sleep gap never floods: max one event per tick', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    const st = createSchedulerState();
    const t0 = Date.now();
    expect(tick(st, s, t0, 8 * 3600)).not.toBeNull();
    expect(tick(st, s, t0 + 1000, 1)).toBeNull();
  });

  it('quiet hours across midnight suppress', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    s.quietHours = { enabled: true, start: '22:00', end: '08:00' };
    expect(inQuietHours(s, new Date(2026, 8, 24, 23, 30))).toBe(true);
    expect(inQuietHours(s, new Date(2026, 8, 24, 12, 0))).toBe(false);
  });

  it('backwards clock is ignored safely', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    const st = createSchedulerState();
    const t0 = Date.now();
    tick(st, s, t0, 100);
    expect(tick(st, s, t0 - 5000, 5000)).toBeNull();
  });
});
