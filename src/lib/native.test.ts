import { describe, expect, it } from 'vitest';
import {
  getAutostartEnabled,
  getIdleSeconds,
  hideNativeReminder,
  isTauriRuntime,
  listen,
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
    await expect(showNativeReminder({ kind: 'blink', title: 't', body: 'b' })).resolves.toBe(false);
    await expect(hideNativeReminder()).resolves.toBeUndefined();
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
});
