/**
 * Activity classification: decides how many ACTIVE seconds elapsed between polls.
 * The native side (Rust GetLastInputInfo) reports idleMs; this pure module turns
 * a poll sequence into active seconds, handling sleep/wake gaps.
 * Pure + fully unit-testable (no OS calls here).
 */

export interface ActivitySample {
  atMs: number;
  /** Milliseconds since last keyboard/mouse input, as reported by OS */
  idleMs: number;
}

export interface ActivityResult {
  activeSec: number;
  isIdle: boolean;
  /** True when the gap suggests sleep/hibernate (wall gap >> poll gap) */
  sleepGap: boolean;
}

/**
 * @param prev previous sample (null on first poll)
 * @param curr current sample
 * @param idleThresholdSec user setting: idleMs above this => user away
 * @param maxPollGapSec clamp: gaps larger than this are treated as sleep/away, not active
 */
export function classifyActivity(
  prev: ActivitySample | null,
  curr: ActivitySample,
  idleThresholdSec: number,
  maxPollGapSec = 300,
): ActivityResult {
  if (!prev) return { activeSec: 0, isIdle: curr.idleMs / 1000 >= idleThresholdSec, sleepGap: false };
  const gapSec = (curr.atMs - prev.atMs) / 1000;
  if (gapSec <= 0) return { activeSec: 0, isIdle: true, sleepGap: false };
  if (gapSec > maxPollGapSec) {
    // Slept or clock jumped: count nothing as active.
    return { activeSec: 0, isIdle: true, sleepGap: true };
  }
  const idleSec = curr.idleMs / 1000;
  const isIdle = idleSec >= idleThresholdSec;
  if (isIdle) return { activeSec: 0, isIdle: true, sleepGap: false };
  // Active for the whole poll gap (idle time within gap is unknown; OS idleMs is "now").
  // Conservative: count min(gap, gap - idleSec + small grace). Simple: count full gap when not idle now.
  return { activeSec: Math.min(gapSec, maxPollGapSec), isIdle: false, sleepGap: false };
}
