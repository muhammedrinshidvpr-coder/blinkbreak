import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReminderPayload } from '../lib/native';
import { installAudioBoundary } from '../test/audio';

const bridge = vi.hoisted(() => ({
  receive: null as ((event: { payload: ReminderPayload }) => void) | null,
  emit: vi.fn(async () => undefined),
  invoke: vi.fn(async () => undefined),
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: async (_name: string, handler: NonNullable<typeof bridge.receive>) => {
    bridge.receive = handler;
    return () => { bridge.receive = null; };
  },
  emit: bridge.emit,
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: bridge.invoke }));

const payload: ReminderPayload = {
  kind: 'lookaway', title: 'Look far away', body: 'b', durationSec: 1, snoozeSec: 600,
  presentation: 'overlay', expiryAction: 'done', reducedMotion: true, theme: 'light',
  chime: true, volume: 0.2, tone: 'wood', endChime: true, overFullscreen: false,
};

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal('__TAURI_INTERNALS__', {});
  bridge.receive = null;
  bridge.emit.mockClear();
  bridge.invoke.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function show(next: ReminderPayload) {
  const { NativeReminder } = await import('./NativeReminder');
  render(<NativeReminder />);
  await act(async () => {});
  await act(async () => { bridge.receive?.({ payload: next }); });
}

describe('Native reminder sound', () => {
  it('uses each incoming preference for start and expiry, then still closes and records completion', async () => {
    const audio = installAudioBoundary();
    await show(payload);
    expect(audio.oscillators[0].frequency.value).toBe(392);
    const count = audio.oscillators.length;
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(audio.oscillators[count].frequency.value).toBe(588);
    await act(async () => vi.advanceTimersByTimeAsync(200));
    expect(bridge.invoke).toHaveBeenCalledWith('hide_reminder');
    expect(bridge.emit).toHaveBeenCalledWith('blinkbreak:reminder-action', { kind: 'lookaway', action: 'done' });
    expect(screen.queryByTestId('reminder-overlay')).not.toBeInTheDocument();
  });

  it('does not play an end cue when it is switched off', async () => {
    const audio = installAudioBoundary();
    await show({ ...payload, endChime: false });
    const count = audio.oscillators.length;
    await act(async () => vi.advanceTimersByTimeAsync(1_200));
    expect(audio.oscillators).toHaveLength(count);
  });

  it('does not sound when dismissed before timer expiry', async () => {
    const audio = installAudioBoundary();
    await show(payload);
    const count = audio.oscillators.length;
    fireEvent.click(screen.getByTestId('reminder-snooze'));
    await act(async () => vi.advanceTimersByTimeAsync(1_200));
    expect(audio.oscillators).toHaveLength(count);
    expect(bridge.emit).toHaveBeenCalledWith('blinkbreak:reminder-action', { kind: 'lookaway', action: 'snooze' });
  });

  it('plays a short, quieter cue when blink appears, and never an end cue', async () => {
    const audio = installAudioBoundary();
    await show({ ...payload, kind: 'blink', presentation: 'toast' });
    expect(audio.oscillators).toHaveLength(2); // one wood note with two partials
    expect(audio.gains[0].gain.value).toBeCloseTo(0.2 * 0.18 * 0.55);
    expect(audio.oscillators[0].stop.mock.calls[0][0]).toBeLessThanOrEqual(0.212);
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await act(async () => vi.advanceTimersByTimeAsync(200));
    expect(audio.oscillators).toHaveLength(2);
    expect(bridge.emit).toHaveBeenCalledWith('blinkbreak:reminder-action', { kind: 'blink', action: 'done' });
  });

  it('keeps blink silent when automatic sound is off', async () => {
    const audio = installAudioBoundary();
    await show({ ...payload, kind: 'blink', presentation: 'toast', chime: false, endChime: false });
    await act(async () => vi.advanceTimersByTimeAsync(1_200));
    expect(audio.oscillators).toHaveLength(0);
  });
});
