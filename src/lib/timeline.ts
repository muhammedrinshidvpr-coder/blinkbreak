/**
 * Pure motion functions for the reminder symbols.
 * CONTRACT:
 * - GUARANTEES: every function is a pure function of elapsed seconds (deterministic, testable,
 *   recordable frame-exact); every looping motion fits a whole number of cycles into its reminder.
 * - DOES NOT: touch the DOM, timers, or React.
 */

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;
export const easeIn = (x: number) => x * x;

/** Soft spring with a tiny natural overshoot; 0 → 1, settled by x ≈ 1. */
export const spring = (x: number) => (x <= 0 ? 0 : x >= 1.2 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(5.2 * x));

/** Whole number of cycles closest to `idealPeriodSec` that fits `durationSec` exactly (at least 1). */
export function cyclesFor(durationSec: number, idealPeriodSec: number): number {
  return Math.max(1, Math.round(durationSec / idealPeriodSec));
}

/** Period that fits a whole number of cycles into the duration. */
export function periodFor(durationSec: number, idealPeriodSec: number): number {
  return durationSec / cyclesFor(durationSec, idealPeriodSec);
}

/** Phase 0..1 within the current cycle. */
const phase = (t: number, period: number) => (((t % period) + period) % period) / period;

/** Eye openness 1 (open) → 0 (closed). Slow blink near the end of each ~2.5 s cycle: lower, rest, lift. */
export function blinkOpenness(t: number, durationSec: number): number {
  const period = periodFor(durationSec, 2.5);
  const blinkLen = Math.min(0.9, period * 0.45);
  const p = (t % period) - (period - blinkLen - Math.min(0.3, period * 0.1));
  if (p < 0 || p > blinkLen) return 1;
  const u = p / blinkLen;
  if (u < 0.38) return 1 - easeInOut(u / 0.38);
  if (u < 0.52) return 0;
  return easeOut((u - 0.52) / 0.48);
}

/** Blinks fully completed by time t (for tests and progress). */
export function blinksDone(t: number, durationSec: number): number {
  const period = periodFor(durationSec, 2.5);
  return Math.min(cyclesFor(durationSec, 2.5), Math.floor((t + Math.min(0.3, period * 0.1)) / period));
}

/** Breath size 0 (empty) → 1 (full): inhale 4 s, hold 1 s, exhale 6 s, scaled to fit the duration. */
export function breath(t: number, durationSec: number): number {
  const u = phase(t, periodFor(durationSec, 11));
  if (u < 4 / 11) return easeInOut(u / (4 / 11));
  if (u < 5 / 11) return 1;
  return 1 - easeInOut((u - 5 / 11) / (6 / 11));
}

/** True while breathing in (for the "Breathe in / Breathe out" label). */
export function isInhaling(t: number, durationSec: number): boolean {
  return phase(t, periodFor(durationSec, 11)) < 5 / 11;
}

export function breathInstruction(t: number, durationSec: number): string {
  const u = phase(t, periodFor(durationSec, 11));
  return u < 4 / 11 ? 'Breathe in' : u < 5 / 11 ? 'Hold gently' : 'Breathe out';
}

/**
 * Generic "reach, hold, return" pose used by look-away (dot to horizon), posture (spine straightens),
 * and move (arms rise): 0 → 1 over the first 30 %, hold, back to 0 over the last 20 %.
 */
export function reach(t: number, durationSec: number, idealPeriodSec: number): number {
  const u = phase(t, periodFor(durationSec, idealPeriodSec));
  if (u < 0.3) return easeInOut(u / 0.3);
  if (u < 0.8) return 1;
  return 1 - easeInOut((u - 0.8) / 0.2);
}
