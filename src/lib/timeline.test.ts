import { describe, expect, it } from 'vitest';
import { blinkOpenness, blinksDone, breath, cyclesFor, isInhaling, periodFor, reach, spring } from './timeline';

describe('timeline', () => {
  it('fits a whole number of cycles into every default reminder duration', () => {
    expect(cyclesFor(10, 2.5)).toBe(4); // blink: 4 slow blinks
    expect(cyclesFor(600, 11)).toBe(55); // long rest: 55 breaths
    expect(cyclesFor(3, 20)).toBe(1); // never zero
    for (const d of [5, 10, 20, 300, 600]) {
      const p = periodFor(d, 2.5);
      expect(Number.isInteger(Math.round((d / p) * 1e9) / 1e9)).toBe(true);
    }
  });

  it('spring starts at 0, overshoots only slightly, and settles at 1', () => {
    expect(spring(0)).toBe(0);
    expect(spring(1.5)).toBe(1);
    const peak = Math.max(...Array.from({ length: 120 }, (_, i) => spring(i / 100)));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.05);
  });

  it('blink: open most of the time, fully closed at rest, four blinks in ten seconds', () => {
    expect(blinkOpenness(0.2, 10)).toBe(1);
    const samples = Array.from({ length: 1000 }, (_, i) => blinkOpenness(i / 100, 10));
    expect(Math.min(...samples)).toBe(0);
    expect(samples.filter((o) => o === 1).length).toBeGreaterThan(600);
    expect(blinksDone(9.99, 10)).toBe(4);
    expect(blinksDone(1, 10)).toBe(0);
  });

  it('breath follows inhale 4 s, hold 1 s, exhale 6 s', () => {
    const d = 11 * 3;
    expect(breath(0, d)).toBe(0);
    expect(breath(4.5, d)).toBe(1);
    expect(isInhaling(2, d)).toBe(true);
    expect(isInhaling(8, d)).toBe(false);
    expect(breath(10.99, d)).toBeLessThan(0.01);
  });

  it('reach rises, holds, and returns within one cycle', () => {
    expect(reach(0, 20, 20)).toBe(0);
    expect(reach(10, 20, 20)).toBe(1);
    expect(reach(19.99, 20, 20)).toBeLessThan(0.01);
  });
});
