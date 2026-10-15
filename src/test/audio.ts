import { vi } from 'vitest';

/** Observable Web Audio boundary: records what would reach the speakers. */
export function installAudioBoundary() {
  const oscillators: FakeOscillator[] = [];
  const gains: FakeGain[] = [];
  const parameter = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  class FakeOscillator {
    frequency = parameter();
    type = 'sine';
    onended: (() => void) | null = null;
    connect = vi.fn((target: unknown) => target);
    disconnect = vi.fn();
    start = vi.fn();
    stop = vi.fn();
  }
  class FakeGain {
    gain = parameter();
    connect = vi.fn((target: unknown) => target);
    disconnect = vi.fn();
  }
  const resume = vi.fn(async (): Promise<void> => undefined);
  class FakeContext {
    currentTime = 0;
    state = 'running';
    destination = {};
    resume = resume;
    createOscillator() {
      const oscillator = new FakeOscillator();
      oscillators.push(oscillator);
      return oscillator;
    }
    createGain() {
      const gain = new FakeGain();
      gains.push(gain);
      return gain;
    }
  }
  vi.stubGlobal('AudioContext', FakeContext);
  return { oscillators, gains, resume };
}
