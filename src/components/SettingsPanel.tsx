import { useEffect, useState, type ReactNode } from 'react';
import type { AppSettings, ReminderKind, ThemeSetting } from '../lib/types';
import { SegmentedControl } from './SegmentedControl';
import { playChime } from '../lib/chime';

const KINDS: ReminderKind[] = ['blink', 'lookaway', 'posture', 'move', 'rest'];
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

export function SettingsPanel({
  settings,
  onChange,
  onReset,
  autostartAvailable = false,
  onAutostartChange,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onReset: () => void;
  /** Start-with-Windows only exists in the desktop app. */
  autostartAvailable?: boolean;
  /** Applies the change in Windows; resolves once the OS accepted it, rejects otherwise. */
  onAutostartChange?: (enabled: boolean) => Promise<void>;
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
      setAutostartError("Windows didn't accept the change. Please try again.");
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
        <label className="bb-item">
          <span>Soft chime on breaks</span>
          <Switch
            label="Soft chime on breaks"
            testId="settings-chime"
            checked={settings.sound.enabled}
            onChange={(v) => {
              set((s) => { s.sound.enabled = v; });
              if (v) playChime(settings.sound.volume); // let people hear what they turned on
            }}
          />
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
            : !autostartAvailable && <p className="bb-note">Available in the desktop app.</p>
        }
      >
        <label className={`bb-item ${autostartAvailable ? '' : 'is-disabled'}`} title="Launch BlinkBreak in the system tray when you sign in to Windows">
          <span>Start with Windows</span>
          <Switch
            label="Start with Windows"
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
