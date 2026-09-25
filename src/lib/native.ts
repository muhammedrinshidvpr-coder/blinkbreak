import type { ReminderPresentation, ResolvedTheme } from './types';

export interface ReminderPayload {
  kind: string;
  title: string;
  body: string;
  durationSec: number;
  snoozeSec: number;
  presentation: ReminderPresentation;
  /** Action the native watchdog records if the reminder window never reports back. */
  expiryAction: 'done' | 'skip';
  /** Sent with each reminder: the reminder window's own settings copy is only read at startup. */
  reducedMotion: boolean;
  theme: ResolvedTheme;
  /** Play the soft chime when the reminder appears. */
  chime: boolean;
  /** Chime level 0..1. */
  volume: number;
}

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

export function isTauriRuntime(): boolean {
  return Boolean((window as TauriWindow).__TAURI_INTERNALS__);
}

export async function getWindowLabel(): Promise<string> {
  if (!isTauriRuntime()) return 'main';
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow().label;
}

export async function getIdleSeconds(): Promise<number | null> {
  if (!isTauriRuntime()) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<number>('get_idle_secs');
}

export async function showNativeReminder(payload: ReminderPayload): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('show_reminder', payload as unknown as Record<string, unknown>);
  return true;
}

export async function hideNativeReminder(): Promise<void> {
  if (!isTauriRuntime()) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('hide_reminder');
}

export async function isFullscreenActive(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('is_fullscreen_active');
  } catch {
    return false;
  }
}

export async function emitReminderAction(payload: { kind: string; action: string }): Promise<void> {
  if (!isTauriRuntime()) return;
  const { emit } = await import('@tauri-apps/api/event');
  await emit('blinkbreak:reminder-action', payload);
}

export async function listen<T>(event: string, handler: (payload: T) => void): Promise<() => void> {
  if (!isTauriRuntime()) return () => undefined;
  const { listen: subscribe } = await import('@tauri-apps/api/event');
  return subscribe<T>(event, (eventPayload) => handler(eventPayload.payload));
}

/** Enable/disable OS login autostart. No-op outside Tauri (returns false). */
export async function setAutostartEnabled(enabled: boolean): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  const { enable, disable } = await import('@tauri-apps/plugin-autostart');
  if (enabled) await enable();
  else await disable();
  return true;
}

/** Read actual OS autostart state. Null outside Tauri. */
export async function getAutostartEnabled(): Promise<boolean | null> {
  if (!isTauriRuntime()) return null;
  const { isEnabled } = await import('@tauri-apps/plugin-autostart');
  return isEnabled();
}
