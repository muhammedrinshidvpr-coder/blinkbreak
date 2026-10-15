import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installAudioBoundary } from '../test/audio';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('offline sound playback', () => {
  it.each(['bell', 'wood', 'air'] as const)('makes the %s blink cue one clearer note with a short hold and a longer decay', async (tone) => {
    const audio = installAudioBoundary();
    const { playChime } = await import('./chime');
    playChime(0.4, tone, 'start');
    await Promise.resolve();
    const count = audio.oscillators.length;
    const startGain = audio.gains[0].gain.value;
    playChime(0.4, tone, 'blink');
    await Promise.resolve();
    const blink = audio.oscillators.slice(count);
    expect(blink).toHaveLength(count / 2);
    expect(blink[0].frequency.value).toBe(audio.oscillators[0].frequency.value);
    const master = audio.gains.slice().reverse().find((gain) => gain.gain.value > 0);
    expect(master?.gain.value).toBeCloseTo(startGain * 3);
    for (const oscillator of blink) {
      expect(oscillator.start).toHaveBeenCalledExactlyOnceWith(0.01);
      expect(oscillator.stop.mock.calls[0][0]).toBeGreaterThanOrEqual(0.468);
      expect(oscillator.stop.mock.calls[0][0]).toBeLessThanOrEqual(0.472);
    }
    const blinkEnvelopes = audio.gains.slice(count + 2);
    expect(blinkEnvelopes).toHaveLength(blink.length);
    for (const envelope of blinkEnvelopes) {
      const [peak, peakAt] = envelope.gain.exponentialRampToValueAtTime.mock.calls[0];
      expect(envelope.gain.setValueAtTime).toHaveBeenCalledWith(peak, peakAt + 0.06);
    }
  });

  it('offers a stronger full-volume blink without changing other cues or losing slider control', async () => {
    const audio = installAudioBoundary();
    const { playChime } = await import('./chime');
    for (const volume of [0.25, 0.5, 1, 2]) {
      const offset = audio.gains.length;
      playChime(volume, 'bell', 'blink');
      await Promise.resolve();
      expect(audio.gains[offset].gain.value).toBeCloseTo(Math.min(1, volume) * 0.54);
    }
    const offset = audio.gains.length;
    playChime(1, 'bell', 'start');
    await Promise.resolve();
    expect(audio.gains[offset].gain.value).toBeCloseTo(0.18);
    playChime(0, 'bell', 'blink');
    const count = audio.oscillators.length;
    await Promise.resolve();
    expect(audio.oscillators).toHaveLength(count);
  });

  it.each(['bell', 'wood', 'air'] as const)('plays a soft %s start and a distinct descending end, at the requested volume', async (tone) => {
    const audio = installAudioBoundary();
    const { playChime } = await import('./chime');
    playChime(0.3, tone, 'start');
    await Promise.resolve();
    const start = audio.oscillators.map((osc) => osc.frequency.value);
    expect(start.length).toBeGreaterThanOrEqual(4);
    expect(start[0]).toBeLessThan(start[start.length / 2]);
    expect(audio.gains[0].gain.value).toBeCloseTo(0.054);
    expect(audio.oscillators.every((osc) => osc.start.mock.calls.length === 1 && osc.stop.mock.calls.length === 1)).toBe(true);
    playChime(0.3, tone, 'end');
    await Promise.resolve();
    const end = audio.oscillators.slice(start.length).map((osc) => osc.frequency.value);
    expect(end[0]).toBe(start[start.length / 2]);
    expect(end[end.length / 2]).toBe(start[0]);
  });

  it('makes tone choices audibly distinct rather than just relabeling one sound', async () => {
    const audio = installAudioBoundary();
    const { playChime } = await import('./chime');
    const frequencies: number[] = [];
    for (const tone of ['bell', 'wood', 'air'] as const) {
      const offset = audio.oscillators.length;
      playChime(0.4, tone);
      await Promise.resolve();
      frequencies.push(audio.oscillators[offset].frequency.value);
    }
    expect(new Set(frequencies).size).toBe(3);
  });

  it('stays silent at zero or invalid volume', async () => {
    const audio = installAudioBoundary();
    const { playChime } = await import('./chime');
    for (const volume of [0, -1, NaN, Infinity]) playChime(volume);
    await Promise.resolve();
    expect(audio.oscillators).toHaveLength(0);
  });

  it('does not schedule an old preview when context resume finishes late', async () => {
    const audio = installAudioBoundary();
    let finish!: () => void;
    audio.resume.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { playChime } = await import('./chime');
    playChime(0.4, 'bell');
    const finishOld = finish;
    playChime(0.4, 'wood');
    finishOld();
    await Promise.resolve();
    expect(audio.oscillators).toHaveLength(0);
    finish();
    await Promise.resolve();
    expect(audio.oscillators[0].frequency.value).toBe(392);
  });

  it('fades overlapping previews and disconnects their audio nodes when finished', async () => {
    const audio = installAudioBoundary();
    const { playChime } = await import('./chime');
    playChime(0.4);
    await Promise.resolve();
    const old = audio.oscillators.slice();
    playChime(0.4, 'air');
    await Promise.resolve();
    expect(audio.gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.025);
    old.forEach((osc) => osc.onended?.());
    expect(audio.gains[0].disconnect).toHaveBeenCalledOnce();
    expect(old.every((osc) => osc.disconnect.mock.calls.length === 1)).toBe(true);
  });

  it('tolerates missing or blocked audio without rejecting outward', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const { playChime } = await import('./chime');
    expect(() => playChime(0.4)).not.toThrow();
    const audio = installAudioBoundary();
    audio.resume.mockRejectedValueOnce(new Error('blocked'));
    expect(() => playChime(0.4)).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(audio.oscillators).toHaveLength(0);
  });
});
