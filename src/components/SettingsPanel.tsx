import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { AppSettings, ReminderKind, SoundTone, ThemeSetting } from '../lib/types';
import { SegmentedControl } from './SegmentedControl';
import { playChime } from '../lib/chime';

const KINDS: ReminderKind[] = ['blink', 'lookaway', 'posture', 'move', 'rest'];
const TONES: { id: SoundTone; label: string; detail: string; bars: readonly number[] }[] = [
  { id: 'bell', label: 'Soft bell', detail: 'Warm & rounded', bars: [10, 22, 30, 20, 12] },
  { id: 'wood', label: 'Wooden tap', detail: 'Short & grounded', bars: [8, 28, 16, 10, 6] },
  { id: 'air', label: 'Airy tone', detail: 'Light & spacious', bars: [12, 18, 24, 22, 16] },
];
const THEMES: { id: ThemeSetting; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];
export const MIN_INTERVAL_MIN = 1;
export const MAX_INTERVAL_MIN = 480;

function Switch({ checked, onChange, testId, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; testId: string; label: string; disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      role="switch"
      className="bb-switch"
      aria-label={label}
      data-testid={testId}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

function Group({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section className="bb-group" aria-label={title}>
      <h2>{title}</h2>
      <div className="bb-list">{children}</div>
      {note}
    </section>
  );
}

/**
 * Minutes field that lets people type freely; the value is clamped and committed on
 * blur or Enter, and Escape restores the saved value. Invalid drafts never reach settings.
 */
function IntervalField({ label, minutes, testId, onCommit }: {
  label: string; minutes: number; testId: string; onCommit: (minutes: number) => void;
}) {
  const [draft, setDraft] = useState(String(minutes));
  useEffect(() => setDraft(String(minutes)), [minutes]);
  const commit = () => {
    const parsed = Math.round(Number(draft));
    if (draft.trim() === '' || !Number.isFinite(parsed)) {
      setDraft(String(minutes));
      return;
    }
    const next = Math.min(MAX_INTERVAL_MIN, Math.max(MIN_INTERVAL_MIN, parsed));
    setDraft(String(next));
    if (next !== minutes) onCommit(next);
  };
  return (
    <label className="bb-inline-field">
      every
      <input
        className="bb-input" type="number" inputMode="numeric"
        min={MIN_INTERVAL_MIN} max={MAX_INTERVAL_MIN} data-testid={testId}
        aria-label={`${label} interval in minutes`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setDraft(String(minutes));
        }}
      />
      min
    </label>
  );
}

/** What strict mode does on this computer, in one or two plain sentences. */
export function strictModeNote(strictMode: boolean, fullscreenWaitSupported: boolean, overFullscreenSupported: boolean): string {
  if (!strictMode) {
    return fullscreenWaitSupported
      ? 'Off: breaks wait until you leave a fullscreen video, game, or presentation.'
      : "Off: breaks don't cover fullscreen videos, games, or presentations.";
  }
  return overFullscreenSupported
    ? 'On: breaks show even over fullscreen videos, games, and presentations. You can still close them.'
    : "On, but this desktop (Wayland) doesn't let apps appear above fullscreen windows, so breaks may stay behind them.";
}

export function SettingsPanel({
  settings,
  onChange,
  onReset,
  autostartAvailable = false,
  onAutostartChange,
  supportNote = null,
  fullscreenWaitSupported = true,
  overFullscreenSupported = true,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onReset: () => void;
  /** Login autostart only exists in the desktop app. */
  autostartAvailable?: boolean;
  /** Applies the change in the OS; resolves once the OS accepted it, rejects otherwise. */
  onAutostartChange?: (enabled: boolean) => Promise<void>;
  /** Honest note when the current platform lacks idle/fullscreen sensing. */
  supportNote?: string | null;
  /** The OS can tell when a fullscreen app is open, so gentle breaks wait for it (Windows). */
  fullscreenWaitSupported?: boolean;
  /** Strict-mode breaks can appear above fullscreen apps (not on Linux Wayland). */
  overFullscreenSupported?: boolean;
}) {
  const [autostartPending, setAutostartPending] = useState(false);
  const [autostartError, setAutostartError] = useState<string | null>(null);
  const set = (fn: (s: AppSettings) => void) => {
    const copy: AppSettings = JSON.parse(JSON.stringify(settings));
    fn(copy);
    onChange(copy);
  };
  const changeAutostart = async (enabled: boolean) => {
    if (!onAutostartChange) return;
    setAutostartPending(true);
    setAutostartError(null);
    try {
      await onAutostartChange(enabled);
    } catch {
      setAutostartError("The system didn't accept the change. Please try again.");
    } finally {
      setAutostartPending(false);
    }
  };
  const quietOff = !settings.quietHours.enabled;

  return (
    <div className="bb-settings" data-testid="settings">
      <Group title="Appearance">
        <div className="bb-item">
          <span>Theme</span>
          <SegmentedControl
            radio small label="Theme" testPrefix="settings-theme"
            value={settings.theme} options={THEMES}
            onChange={(id) => set((s) => { s.theme = id; })}
          />
        </div>
        <label className="bb-item">
          <span>Reduce motion</span>
          <Switch label="Reduce motion" testId="settings-reduced-motion" checked={settings.reducedMotion} onChange={(v) => set((s) => { s.reducedMotion = v; })} />
        </label>
      </Group>

      <Group title="Reminders">
        {KINDS.map((k) => (
          <div className={`bb-item ${settings.reminders[k].enabled ? '' : 'is-off'}`} key={k} data-testid={`settings-row-${k}`}>
            <span>{settings.reminders[k].label}</span>
            <span className="bb-item-controls">
              <IntervalField
                label={settings.reminders[k].label}
                testId={`settings-interval-${k}`}
                minutes={Math.round(settings.reminders[k].intervalSec / 60)}
                onCommit={(min) => set((s) => { s.reminders[k].intervalSec = min * 60; })}
              />
              <Switch
                label={`${settings.reminders[k].label} reminder`}
                testId={`settings-enabled-${k}`}
                checked={settings.reminders[k].enabled}
                onChange={(v) => set((s) => { s.reminders[k].enabled = v; })}
              />
            </span>
          </div>
        ))}
      </Group>

      <Group title="Sound" note={<p className="bb-note">Blink uses a brief, clear single-note start cue with no end sound. Previews work even when reminder sounds are off.</p>}>
        <label className="bb-item">
          <span className="bb-setting-copy">Gentle reminder sounds<small>A soft invitation, never an alarm.</small></span>
          <Switch label="Gentle reminder sounds" testId="settings-chime" checked={settings.sound.enabled}
            onChange={(v) => set((s) => { s.sound.enabled = v; })} />
        </label>
        <div className="bb-sound-studio">
          <fieldset className="bb-tone-picker">
            <legend>Sound character</legend>
            <div className="bb-tone-options">
              {TONES.map((tone) => (
                <label className={`bb-tone ${settings.sound.tone === tone.id ? 'is-selected' : ''}`} key={tone.id}>
                  <input type="radio" name="sound-tone" value={tone.id} aria-label={tone.label}
                    data-testid={`settings-tone-${tone.id}`} checked={settings.sound.tone === tone.id}
                    onChange={() => set((s) => { s.sound.tone = tone.id; })} />
                  <span className="bb-tone-check" aria-hidden="true">{settings.sound.tone === tone.id ? '✓' : ''}</span>
                  <span className="bb-tone-wave" aria-hidden="true">{tone.bars.map((height, i) => <i key={i} style={{ height }} />)}</span>
                  <span className="bb-tone-label">{tone.label}</span>
                  <span className="bb-tone-detail">{tone.detail}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="bb-volume-heading">
            <label htmlFor="sound-volume">Volume</label>
            <output htmlFor="sound-volume" data-testid="settings-volume-value">{Math.round(settings.sound.volume * 100)}%</output>
          </div>
          <input id="sound-volume" className="bb-volume" type="range" min="0" max="100" step="1"
            style={{ '--sound-volume': `${settings.sound.volume * 100}%` } as CSSProperties}
            data-testid="settings-volume" value={Math.round(settings.sound.volume * 100)}
            aria-valuetext={`${Math.round(settings.sound.volume * 100)} percent`}
            onChange={(e) => { const volume = Number(e.target.value) / 100; set((s) => { s.sound.volume = volume; }); }} />
          <div className="bb-sound-previews" role="group" aria-label="Preview sounds">
            <span>Preview</span>
            <button className="bb-btn" type="button" data-testid="settings-preview-blink"
              aria-label="Preview blink sound" onClick={() => playChime(settings.sound.volume, settings.sound.tone, 'blink')}>
              <span aria-hidden="true">·</span> Blink
            </button>
            <button className="bb-btn" type="button" data-testid="settings-preview-start"
              aria-label="Preview start sound" onClick={() => playChime(settings.sound.volume, settings.sound.tone, 'start')}>
              <span aria-hidden="true">↗</span> Start
            </button>
            <button className="bb-btn" type="button" data-testid="settings-preview-end"
              aria-label="Preview end sound" onClick={() => playChime(settings.sound.volume, settings.sound.tone, 'end')}>
              <span aria-hidden="true">↘</span> End
            </button>
          </div>
        </div>
        <label className={`bb-item ${settings.sound.enabled ? '' : 'is-disabled'}`}>
          <span className="bb-setting-copy">End-of-break cue<small>Hear when time is up, without looking back.</small></span>
          <Switch label="End-of-break cue" testId="settings-end-cue" checked={settings.sound.endCue}
            disabled={!settings.sound.enabled} onChange={(v) => set((s) => { s.sound.endCue = v; })} />
        </label>
      </Group>

      <Group
        title="Fullscreen"
        note={
          <p className="bb-note" data-testid="settings-strict-note">
            {strictModeNote(settings.strictMode, fullscreenWaitSupported, overFullscreenSupported)}
          </p>
        }
      >
        <label className="bb-item" title="Show breaks even over fullscreen videos, games, and presentations">
          <span>Strict mode</span>
          <Switch label="Strict mode" testId="settings-strict" checked={settings.strictMode} onChange={(v) => set((s) => { s.strictMode = v; })} />
        </label>
      </Group>

      <Group title="Schedule">
        <label className="bb-item">
          <span>Quiet hours</span>
          <Switch label="Quiet hours" testId="settings-quiet" checked={settings.quietHours.enabled} onChange={(v) => set((s) => { s.quietHours.enabled = v; })} />
        </label>
        <div className={`bb-item ${quietOff ? 'is-disabled' : ''}`}>
          <span>From</span>
          <input
            className="bb-input" type="time" data-testid="settings-quiet-start" aria-label="Quiet hours start"
            disabled={quietOff}
            value={settings.quietHours.start}
            onChange={(e) => { const v = e.target.value; if (v) set((s) => { s.quietHours.start = v; }); }}
          />
        </div>
        <div className={`bb-item ${quietOff ? 'is-disabled' : ''}`}>
          <span>To</span>
          <input
            className="bb-input" type="time" data-testid="settings-quiet-end" aria-label="Quiet hours end"
            disabled={quietOff}
            value={settings.quietHours.end}
            onChange={(e) => { const v = e.target.value; if (v) set((s) => { s.quietHours.end = v; }); }}
          />
        </div>
      </Group>

      <Group
        title="System"
        note={
          autostartError
            ? <p className="bb-note is-error" role="alert" data-testid="settings-autostart-error">{autostartError}</p>
            : <>
                {!autostartAvailable && <p className="bb-note">Available in the desktop app.</p>}
                {supportNote && <p className="bb-note" data-testid="settings-platform-note">{supportNote}</p>}
              </>
        }
      >
        <label className={`bb-item ${autostartAvailable ? '' : 'is-disabled'}`} title="Launch BlinkBreak when you sign in">
          <span>Start at login</span>
          <Switch
            label="Start at login"
            testId="settings-autostart"
            checked={settings.autostart}
            disabled={!autostartAvailable || autostartPending}
            onChange={(enabled) => void changeAutostart(enabled)}
          />
        </label>
      </Group>

      <div className="bb-settings-footer">
        <button className="bb-btn quiet" data-testid="settings-reset" onClick={onReset}>Reset to recommended</button>
        <p className="bb-quiet">Everything stays on this computer. No camera, no account, no cloud.</p>
      </div>
    </div>
  );
}
