import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { cloneSettings, DEFAULT_SETTINGS } from './lib/types';
import { installAudioBoundary } from './test/audio';

const native = vi.hoisted(() => ({
  runtime: true,
  fullscreen: true,
  platformCapabilities: { platform: 'windows', idle_supported: true, fullscreen_supported: true, over_fullscreen_supported: true } as {
    platform: string;
    idle_supported: boolean;
    fullscreen_supported: boolean;
    over_fullscreen_supported: boolean;
  } | null,
  showNativeReminder: vi.fn(async () => true),
  isFullscreenActive: vi.fn(async () => native.fullscreen),
  autostartOs: null as boolean | null,
  setAutostartEnabled: vi.fn(async (_enabled: boolean) => true),
}));

vi.mock('./lib/native', () => ({
  emitReminderAction: vi.fn(async () => undefined),
  getAutostartEnabled: vi.fn(async () => native.autostartOs),
  getIdleSeconds: vi.fn(async () => 0),
  getPlatformCapabilities: vi.fn(async () => native.platformCapabilities),
  platformSupportNote: (caps: NonNullable<typeof native.platformCapabilities>) => !caps.idle_supported
    ? `Idle-time detection isn't available on ${caps.platform} yet, so timers count while BlinkBreak is open. Fullscreen detection isn't available on ${caps.platform} yet, so reminders can't defer during fullscreen sessions.`
    : null,
  getWindowLabel: vi.fn(async () => 'main'),
  hideNativeReminder: vi.fn(async () => undefined),
  isFullscreenActive: native.isFullscreenActive,
  isTauriRuntime: () => native.runtime,
  listen: vi.fn(async () => () => undefined),
  setAutostartEnabled: native.setAutostartEnabled,
  showNativeReminder: native.showNativeReminder,
}));

vi.mock('./lib/activity', () => ({
  classifyActivity: () => ({ activeSec: 60, isIdle: false, sleepGap: false }),
}));

import App from './App';

async function flushPoll(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('App reminder orchestration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 30, 9, 0, 0));
    localStorage.clear();
    native.runtime = true;
    native.fullscreen = true;
    native.platformCapabilities = { platform: 'windows', idle_supported: true, fullscreen_supported: true, over_fullscreen_supported: true };
    native.showNativeReminder.mockClear();
    native.isFullscreenActive.mockClear();
    native.autostartOs = null;
    native.setAutostartEnabled.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('keeps accruing during fullscreen and presents the highest-priority pending reminder', async () => {
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.reminders.blink.intervalSec = 60;
    settings.reminders.posture.intervalSec = 120;
    settings.reminders.lookaway.enabled = false;
    settings.reminders.move.enabled = false;
    settings.reminders.rest.enabled = false;
    localStorage.setItem('blinkbreak.settings.v1', JSON.stringify(settings));

    render(<App />);
    await flushPoll();
    expect(native.showNativeReminder).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTimeAsync(1000));
    native.fullscreen = false;
    await act(async () => vi.advanceTimersByTimeAsync(1000));

    expect(native.showNativeReminder).toHaveBeenCalledTimes(1);
    expect(native.showNativeReminder).toHaveBeenCalledWith(expect.objectContaining({ kind: 'posture', overFullscreen: false }));
  });

  it('saves sound controls and plays the selected start and timer-end cues through a real break', async () => {
    native.runtime = false;
    const audio = installAudioBoundary();
    render(<App />);
    await flushPoll();
    fireEvent.click(screen.getByTestId('tab-settings'));
    expect(screen.getByTestId('settings-chime')).not.toBeChecked();
    expect(screen.getByTestId('settings-end-cue')).toBeDisabled();
    fireEvent.click(screen.getByTestId('settings-chime'));
    fireEvent.click(screen.getByRole('radio', { name: 'Wooden tap' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '25' } });
    expect(screen.getByTestId('settings-volume-value')).toHaveTextContent('25%');
    await flushPoll();
    expect(audio.oscillators).toHaveLength(0); // editing controls is silent
    expect(JSON.parse(localStorage.getItem('blinkbreak.settings.v1')!).sound).toEqual({ enabled: true, volume: 0.25, tone: 'wood', endCue: true });

    fireEvent.click(screen.getByTestId('tab-today'));
    fireEvent.click(screen.getByTestId('dash-break-now'));
    await flushPoll();
    expect(audio.oscillators[0].frequency.value).toBe(392);
    expect(audio.gains[0].gain.value).toBeCloseTo(0.045);
    const startCount = audio.oscillators.length;
    await act(async () => vi.advanceTimersByTimeAsync(20_000));
    expect(audio.oscillators).toHaveLength(startCount * 2);
    expect(audio.oscillators[startCount].frequency.value).toBe(588);
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(screen.queryByTestId('reminder-overlay')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('blinkbreak.stats.v1')!).completed.lookaway).toBe(1);
  });

  it('sends current sound settings to the native window rather than its startup copy', async () => {
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.sound = { enabled: true, volume: 0.17, tone: 'air', endCue: false };
    localStorage.setItem('blinkbreak.settings.v1', JSON.stringify(settings));
    render(<App />);
    await flushPoll();
    fireEvent.click(screen.getByTestId('dash-break-now'));
    await flushPoll();
    expect(native.showNativeReminder).toHaveBeenCalledWith(expect.objectContaining({ chime: true, tone: 'air', volume: 0.17, endChime: false }));
  });

  it('requests a native blink start cue without requesting an end cue', async () => {
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.sound.enabled = true;
    settings.strictMode = true;
    settings.reminders.blink.intervalSec = 60;
    localStorage.setItem('blinkbreak.settings.v1', JSON.stringify(settings));
    render(<App />);
    await flushPoll();
    expect(native.showNativeReminder).toHaveBeenCalledWith(expect.objectContaining({ kind: 'blink', chime: true, endChime: false }));
  });

  it('plays the short blink cue in the local presentation path without an expiry sound', async () => {
    vi.resetModules();
    const { default: LocalApp } = await import('./App');
    native.runtime = false;
    const audio = installAudioBoundary();
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.sound.enabled = true;
    settings.reminders.blink.intervalSec = 60;
    settings.reminders.blink.durationSec = 5;
    localStorage.setItem('blinkbreak.settings.v1', JSON.stringify(settings));
    render(<LocalApp />);
    await flushPoll();
    expect(screen.getByTestId('blink-toast')).toBeInTheDocument();
    expect(audio.oscillators).toHaveLength(2);
    expect(audio.gains[0].gain.value).toBeCloseTo(0.4 * 0.54);
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(screen.queryByTestId('blink-toast')).not.toBeInTheDocument();
    expect(audio.oscillators).toHaveLength(2);
  });

  it('shows a due break over a fullscreen app in strict mode', async () => {
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.strictMode = true;
    settings.reminders.blink.intervalSec = 60;
    localStorage.setItem('blinkbreak.settings.v1', JSON.stringify(settings));

    render(<App />);
    await flushPoll();

    expect(native.fullscreen).toBe(true);
    expect(native.showNativeReminder).toHaveBeenCalledTimes(1);
    expect(native.showNativeReminder).toHaveBeenCalledWith(expect.objectContaining({ kind: 'blink', overFullscreen: true }));
  });

  it('shows a break you ask for right away, even over fullscreen without strict mode', async () => {
    render(<App />);
    await flushPoll();
    expect(native.showNativeReminder).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('dash-break-now'));
    await flushPoll();

    expect(native.showNativeReminder).toHaveBeenCalledWith(expect.objectContaining({ kind: 'lookaway', overFullscreen: true }));
  });

  it('explains on Linux Wayland that strict mode cannot cover fullscreen windows', async () => {
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.strictMode = true;
    localStorage.setItem('blinkbreak.settings.v1', JSON.stringify(settings));
    native.platformCapabilities = { platform: 'linux', idle_supported: true, fullscreen_supported: false, over_fullscreen_supported: false };
    render(<App />);
    await flushPoll();

    fireEvent.click(screen.getByTestId('tab-settings'));

    expect(screen.getByTestId('settings-strict')).toBeChecked();
    expect(screen.getByTestId('settings-strict-note')).toHaveTextContent('Wayland');
  });

  it('does not release a fullscreen-pending reminder after the schedule is paused', async () => {
    const settings = cloneSettings(DEFAULT_SETTINGS);
    settings.reminders.blink.intervalSec = 60;
    localStorage.setItem('blinkbreak.settings.v1', JSON.stringify(settings));

    render(<App />);
    await flushPoll();
    native.fullscreen = false;
    fireEvent.click(screen.getByTestId('dash-pause-15'));
    await flushPoll();
    await act(async () => vi.advanceTimersByTimeAsync(1000));

    expect(native.showNativeReminder).not.toHaveBeenCalled();
  });

  it('opens the health story from the main navigation', async () => {
    render(<App />);
    await flushPoll();

    fireEvent.click(screen.getByTestId('tab-story'));

    expect(screen.getByTestId('how-it-works')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'You keep your focus. Small pauses keep the rhythm.' })).toBeInTheDocument();
  });

  it('shows platform limitations in Settings when native sensing is unsupported', async () => {
    native.platformCapabilities = { platform: 'linux', idle_supported: false, fullscreen_supported: false, over_fullscreen_supported: false };
    render(<App />);
    await flushPoll();

    fireEvent.click(screen.getByTestId('tab-settings'));

    expect(screen.getByTestId('settings-platform-note')).toHaveTextContent('timers count while BlinkBreak is open');
    expect(screen.getByTestId('settings-platform-note')).toHaveTextContent('reminders can\'t defer during fullscreen');
  });

  it('shows a cautious fallback note when native capability lookup fails', async () => {
    native.platformCapabilities = null;
    render(<App />);
    await flushPoll();

    fireEvent.click(screen.getByTestId('tab-settings'));

    expect(screen.getByTestId('settings-platform-note')).toHaveTextContent('Treat idle and fullscreen detection as unavailable');
  });

  it('turns on start at login for a fresh install', async () => {
    vi.stubEnv('DEV', false);
    native.autostartOs = false;
    render(<App />);
    await flushPoll();

    expect(native.setAutostartEnabled).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByTestId('tab-settings'));
    expect(screen.getByTestId('settings-autostart')).toBeChecked();
  });

  it('keeps start at login off when an existing install turned it off', async () => {
    vi.stubEnv('DEV', false);
    native.autostartOs = false;
    localStorage.setItem('blinkbreak.settings.v1', JSON.stringify(cloneSettings(DEFAULT_SETTINGS)));
    render(<App />);
    await flushPoll();

    expect(native.setAutostartEnabled).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('tab-settings'));
    expect(screen.getByTestId('settings-autostart')).not.toBeChecked();
  });

  it('shows start at login off when a fresh install cannot enable it', async () => {
    vi.stubEnv('DEV', false);
    native.autostartOs = false;
    native.setAutostartEnabled.mockRejectedValueOnce(new Error('denied'));
    render(<App />);
    await flushPoll();

    fireEvent.click(screen.getByTestId('tab-settings'));
    expect(screen.getByTestId('settings-autostart')).not.toBeChecked();
  });

  it('never registers a dev build to start at login', async () => {
    vi.stubEnv('DEV', true);
    native.autostartOs = false;
    render(<App />);
    await flushPoll();

    expect(native.setAutostartEnabled).not.toHaveBeenCalled();
  });
});
