import { describe, expect, it } from 'vitest';
import {
  getAutostartEnabled,
  getIdleSeconds,
  getPlatformCapabilities,
  hideNativeReminder,
  isFullscreenActive,
  isTauriRuntime,
  listen,
  platformSupportNote,
  setAutostartEnabled,
  showNativeReminder,
} from './native';

describe('native bridge outside Tauri (browser/jsdom)', () => {
  it('detects non-Tauri runtime', () => {
    expect(isTauriRuntime()).toBe(false);
  });

  it('idle time is null so the demo clock drives the scheduler', async () => {
    await expect(getIdleSeconds()).resolves.toBeNull();
  });

  it('reminder invoke paths safely report unavailable', async () => {
    await expect(showNativeReminder({
      kind: 'blink', title: 't', body: 'b', durationSec: 10, snoozeSec: 300, presentation: 'toast', expiryAction: 'done', reducedMotion: false, theme: 'light', chime: false, volume: 0.4,
    })).resolves.toBe(false);
    await expect(hideNativeReminder()).resolves.toBeUndefined();
    await expect(isFullscreenActive()).resolves.toBe(false);
  });

  it('event subscribe returns a working no-op cleanup', async () => {
    const cleanup = await listen('blinkbreak:pause-15', () => {});
    expect(() => cleanup()).not.toThrow();
  });

  it('autostart reads/writes safely report unavailable', async () => {
    await expect(getAutostartEnabled()).resolves.toBeNull();
    await expect(setAutostartEnabled(true)).resolves.toBe(false);
    await expect(setAutostartEnabled(false)).resolves.toBe(false);
  });

  it('platform capabilities are null outside Tauri', async () => {
    await expect(getPlatformCapabilities()).resolves.toBeNull();
  });

  it('describes only platform signals that are unsupported', () => {
    expect(platformSupportNote({ platform: 'windows', idle_supported: true, fullscreen_supported: true })).toBeNull();
    expect(platformSupportNote({ platform: 'macos', idle_supported: false, fullscreen_supported: true })).toBe("Idle-time detection isn't available on macos yet, so timers count while BlinkBreak is open.");
    expect(platformSupportNote({ platform: 'linux', idle_supported: false, fullscreen_supported: false })).toBe("Idle-time detection isn't available on linux yet, so timers count while BlinkBreak is open. Fullscreen detection isn't available on linux yet, so reminders can't defer during fullscreen sessions.");
  });
});
