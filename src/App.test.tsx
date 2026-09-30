import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { cloneSettings, DEFAULT_SETTINGS } from './lib/types';

const native = vi.hoisted(() => ({
  fullscreen: true,
  showNativeReminder: vi.fn(async () => true),
  isFullscreenActive: vi.fn(async () => native.fullscreen),
}));

vi.mock('./lib/native', () => ({
  emitReminderAction: vi.fn(async () => undefined),
  getAutostartEnabled: vi.fn(async () => null),
  getIdleSeconds: vi.fn(async () => 0),
  getWindowLabel: vi.fn(async () => 'main'),
  hideNativeReminder: vi.fn(async () => undefined),
  isFullscreenActive: native.isFullscreenActive,
  isTauriRuntime: () => true,
  listen: vi.fn(async () => () => undefined),
  setAutostartEnabled: vi.fn(async () => true),
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
    native.showNativeReminder.mockClear();
    native.isFullscreenActive.mockClear();
  });

  afterEach(() => {
    cleanup();
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
});
