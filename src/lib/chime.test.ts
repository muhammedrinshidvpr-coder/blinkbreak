import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installAudioBoundary } from '../test/audio';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('offline sound playback', () => {
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
