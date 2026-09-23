import type { AppSettings, ReminderKind } from '../lib/types';
import { setAutostartEnabled } from '../lib/native';

const KINDS: ReminderKind[] = ['blink', 'lookaway', 'posture', 'move', 'rest'];

export function SettingsPanel({
  settings,
  onChange,
  onReset,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onReset: () => void;
}) {
  const set = (fn: (s: AppSettings) => void) => {
    const copy: AppSettings = JSON.parse(JSON.stringify(settings));
    fn(copy);
    onChange(copy);
  };
  return (
    <section className="bb-card" data-testid="settings" aria-label="Settings">
      <h2>Settings</h2>
      {KINDS.map((k) => (
        <div className="bb-row" key={k} data-testid={`settings-row-${k}`}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 140 }}>
            <input
              type="checkbox"
              data-testid={`settings-enabled-${k}`}
              checked={settings.reminders[k].enabled}
              onChange={(e) => set((s) => { s.reminders[k].enabled = e.target.checked; })}
            />
            {settings.reminders[k].label}
          </label>
          <label className="bb-field">Every (min)
            <input
              className="bb-input" type="number" min={1} max={480} data-testid={`settings-interval-${k}`}
              value={Math.round(settings.reminders[k].intervalSec / 60)}
              onChange={(e) => set((s) => { s.reminders[k].intervalSec = Math.max(60, Number(e.target.value) * 60 || 60); })}
            />
          </label>
        </div>
      ))}
      <div className="bb-row">
        <label className="bb-field">Card position
          <select
            className="bb-input" data-testid="settings-position"
            value={settings.reminderPosition}
            onChange={(e) => set((s) => { s.reminderPosition = e.target.value as AppSettings['reminderPosition']; })}
          >
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-right">Top right</option>
            <option value="top-left">Top left</option>
            <option value="center">Center</option>
          </select>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox" data-testid="settings-reduced-motion"
            checked={settings.reducedMotion}
            onChange={(e) => set((s) => { s.reducedMotion = e.target.checked; })}
          />
          Reduced motion
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox" data-testid="settings-quiet"
            checked={settings.quietHours.enabled}
            onChange={(e) => set((s) => { s.quietHours.enabled = e.target.checked; })}
          />
          Quiet hours ({settings.quietHours.start}–{settings.quietHours.end})
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }} title="Launch BlinkBreak in the system tray when you sign in to Windows">
          <input
            type="checkbox" data-testid="settings-autostart"
            checked={settings.autostart}
            onChange={(e) => {
              const enabled = e.target.checked;
              set((s) => { s.autostart = enabled; });
              void setAutostartEnabled(enabled);
            }}
          />
          Start with Windows
        </label>
      </div>
      <div className="bb-row">
        <button className="bb-btn warn" data-testid="settings-reset" onClick={onReset}>Reset to recommended</button>
      </div>
      <p className="bb-note">All data stays on this computer. No camera, no account, no cloud.</p>
    </section>
  );
}
