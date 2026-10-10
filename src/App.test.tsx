import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { cloneSettings, DEFAULT_SETTINGS } from './lib/types';

const native = vi.hoisted(() => ({
  fullscreen: true,
  platformCapabilities: { platform: 'windows', idle_supported: true, fullscreen_supported: true } as {
    platform: string;
    idle_supported: boolean;
    fullscreen_supported: boolean;
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
  isTauriRuntime: () => true,
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
    native.fullscreen = true;
    native.platformCapabilities = { platform: 'windows', idle_supported: true, fullscreen_supported: true };
    native.showNativeReminder.mockClear();
    native.isFullscreenActive.mockClear();
    native.autostartOs = null;
    native.setAutostartEnabled.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
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
    expect(native.showNativeReminder).toHaveBeenCalledWith(expect.objectContaining({ kind: 'posture' }));
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
    native.platformCapabilities = { platform: 'linux', idle_supported: false, fullscreen_supported: false };
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
