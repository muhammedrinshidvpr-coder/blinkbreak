/**
 * Soft two-note chime synthesized with Web Audio (no audio file to ship or load).
 * CONTRACT:
 * - GUARANTEES: never throws; a missing or blocked AudioContext means silence.
 * - DOES NOT: decide when to chime (see `chimeFor` in types.ts).
 */
const NOTES = [
  { freq: 659.25, at: 0 }, // E5
  { freq: 987.77, at: 0.12 }, // B5
];

let context: AudioContext | null = null;

export function playChime(volume: number): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    context ??= new Ctx();
    const ctx = context;
    void ctx.resume().catch(() => undefined);
    const peak = Math.min(1, Math.max(0, volume)) * 0.25;
    for (const { freq, at } of NOTES) {
      const start = ctx.currentTime + at;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Quick soft attack, long bell-like decay.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.7);
    }
  } catch {
    // Audio is a nicety; never let it break a reminder.
  }
}
