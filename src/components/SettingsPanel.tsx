import type { ReactNode } from 'react';
import type { AppSettings, ReminderKind, ThemeSetting } from '../lib/types';
import { setAutostartEnabled } from '../lib/native';

const KINDS: ReminderKind[] = ['blink', 'lookaway', 'posture', 'move', 'rest'];
const THEMES: { id: ThemeSetting; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function Switch({ checked, onChange, testId, label }: { checked: boolean; onChange: (v: boolean) => void; testId: string; label: string }) {
  return (
    <input
      type="checkbox"
      role="switch"
      className="bb-switch"
      aria-label={label}
      data-testid={testId}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bb-group" aria-label={title}>
      <h2>{title}</h2>
      <div className="bb-list">{children}</div>
    </section>
  );
}

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
    <div className="bb-settings" data-testid="settings">
      <Group title="Appearance">
        <div className="bb-item">
          <span>Theme</span>
          <div className="bb-segmented small" role="radiogroup" aria-label="Theme">
            {THEMES.map(({ id, label }) => (
              <button
                key={id}
                role="radio"
                aria-checked={settings.theme === id}
                className={settings.theme === id ? 'is-active' : ''}
                data-testid={`settings-theme-${id}`}
                onClick={() => set((s) => { s.theme = id; })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="bb-item">
          <span>Reduce motion</span>
          <Switch label="Reduce motion" testId="settings-reduced-motion" checked={settings.reducedMotion} onChange={(v) => set((s) => { s.reducedMotion = v; })} />
        </label>
      </Group>

      <Group title="Reminders">
        {KINDS.map((k) => (
          <div className="bb-item" key={k} data-testid={`settings-row-${k}`}>
            <span>{settings.reminders[k].label}</span>
            <span className="bb-item-controls">
              <label className="bb-inline-field">
                every
                <input
                  className="bb-input" type="number" min={1} max={480} data-testid={`settings-interval-${k}`}
                  aria-label={`${settings.reminders[k].label} interval in minutes`}
                  value={Math.round(settings.reminders[k].intervalSec / 60)}
                  onChange={(e) => set((s) => { s.reminders[k].intervalSec = Math.max(60, Number(e.target.value) * 60 || 60); })}
                />
                min
              </label>
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

      <Group title="Schedule">
        <label className="bb-item">
          <span>Quiet hours</span>
          <Switch label="Quiet hours" testId="settings-quiet" checked={settings.quietHours.enabled} onChange={(v) => set((s) => { s.quietHours.enabled = v; })} />
        </label>
        <div className="bb-item">
          <span className="bb-quiet">From</span>
          <input
            className="bb-input" type="time" data-testid="settings-quiet-start" aria-label="Quiet hours start"
            value={settings.quietHours.start}
            onChange={(e) => { const v = e.target.value; if (v) set((s) => { s.quietHours.start = v; }); }}
          />
        </div>
        <div className="bb-item">
          <span className="bb-quiet">To</span>
          <input
            className="bb-input" type="time" data-testid="settings-quiet-end" aria-label="Quiet hours end"
            value={settings.quietHours.end}
            onChange={(e) => { const v = e.target.value; if (v) set((s) => { s.quietHours.end = v; }); }}
          />
        </div>
      </Group>

      <Group title="System">
        <label className="bb-item" title="Launch BlinkBreak in the system tray when you sign in to Windows">
          <span>Start with Windows</span>
          <Switch
            label="Start with Windows"
            testId="settings-autostart"
            checked={settings.autostart}
            onChange={(enabled) => {
              set((s) => { s.autostart = enabled; });
              void setAutostartEnabled(enabled);
            }}
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
