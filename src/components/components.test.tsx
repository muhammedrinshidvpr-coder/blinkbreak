import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { ReminderCard } from './ReminderCard';
import { Dashboard, type ScheduleStatus } from './Dashboard';
import { SettingsPanel } from './SettingsPanel';
import { BreathSymbol, EyeSymbol, HorizonSymbol, SpineSymbol, StretchSymbol, ProgressRing } from './symbols';
import { Gallery } from './Gallery';
import { NativeReminder } from './NativeReminder';
import { EXIT_MS } from './useSettleOnce';
import { DEFAULT_SETTINGS, cloneSettings } from '../lib/types';

/** Pretend Windows has "Show animations" turned off. */
function stubSystemReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reminder symbols', () => {
  it('eye closes during a blink and is open between blinks', () => {
    const { rerender } = render(<EyeSymbol t={0.2} durationSec={10} />);
    expect(screen.getByTestId('eye-symbol').dataset.openness).toBe('1.00');
    // first blink rests closed around t ≈ 1.7 s in a 10 s reminder
    const closedAt = Array.from({ length: 300 }, (_, i) => i / 100).find((t) => {
      rerender(<EyeSymbol t={t} durationSec={10} />);
      return screen.getByTestId('eye-symbol').dataset.openness === '0.00';
    });
    expect(closedAt).toBeGreaterThan(1);
    expect(closedAt).toBeLessThan(2.5);
  });

  it('still pose is calm and complete (reduced motion)', () => {
    render(<EyeSymbol t={1.7} durationSec={10} still />);
    expect(screen.getByTestId('eye-symbol').dataset.openness).toBe('1.00');
    render(<SpineSymbol t={0} durationSec={20} still />);
    expect(screen.getByTestId('spine-mid').getAttribute('cx')).toBe('20');
  });

  it('each motion shows its exercise', () => {
    const { unmount } = render(<HorizonSymbol t={0} durationSec={20} />);
    const nearY = Number(screen.getByTestId('horizon-dot').getAttribute('cy'));
    unmount();
    render(<HorizonSymbol t={10} durationSec={20} />);
    expect(Number(screen.getByTestId('horizon-dot').getAttribute('cy'))).toBeLessThan(nearY); // dot travels to the horizon

    render(<SpineSymbol t={0} durationSec={20} />);
    expect(Number(screen.getAllByTestId('spine-mid')[0].getAttribute('cx'))).toBeGreaterThan(20); // curved at start

    render(<StretchSymbol t={0} durationSec={20} />);
    render(<BreathSymbol t={4.5} durationSec={22} />);
    expect(Number(screen.getByTestId('breath-circle').getAttribute('r'))).toBeCloseTo(11); // full breath
  });

  it('progress ring drains over the reminder duration', () => {
    render(<ProgressRing durationSec={20} size={40}><span /></ProgressRing>);
    const ring = screen.getByTestId('progress-ring').closest('.bb-ring') as HTMLElement;
    expect(ring.style.getPropertyValue('--bb-duration')).toBe('20s');
  });
});

describe('Gallery', () => {
  it('shows all five reminders with their schedule', () => {
    render(<Gallery settings={cloneSettings(DEFAULT_SETTINGS)} />);
    for (const k of ['blink', 'lookaway', 'posture', 'move', 'rest']) expect(screen.getByTestId(`gallery-${k}`)).toBeInTheDocument();
    expect(screen.getByTestId('gallery-lookaway')).toHaveTextContent('Every 20m · 20s');
  });

  it('previews the real reminder locally and closes it on Done', () => {
    vi.useFakeTimers();
    render(<Gallery settings={cloneSettings(DEFAULT_SETTINGS)} />);
    fireEvent.click(screen.getByTestId('gallery-preview-posture'));
    expect(screen.getByRole('dialog', { name: 'Sit tall' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reminder-done'));
    act(() => vi.advanceTimersByTime(EXIT_MS));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('rests still until a tile is hovered or focused', () => {
    render(<Gallery settings={cloneSettings(DEFAULT_SETTINGS)} />);
    expect(screen.getByTestId('spine-mid').getAttribute('cx')).toBe('20');
  });
});

describe('ReminderCard', () => {
  it('shows symbol, title, one line, and fires done/snooze', () => {
    const onAction = vi.fn();
    render(<ReminderCard kind="lookaway" title="Look far away" body="20 feet, 20 seconds" durationSec={20} snoozeSec={600} onAction={onAction} />);
    expect(screen.getByTestId('reminder-lookaway')).toHaveTextContent('Look far away');
    expect(screen.getByTestId('reminder-countdown').textContent).toContain('20s');
    expect(screen.getByTestId('horizon-dot')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reminder-done'));
    expect(onAction).toHaveBeenCalledWith('done');
    fireEvent.click(screen.getByTestId('reminder-snooze'));
    expect(onAction).toHaveBeenCalledWith('snooze');
    expect(screen.getByTestId('reminder-snooze')).toHaveAccessibleName('Snooze 10m');
  });

  it('holds the calm still pose when Windows asks for less motion, even if the app setting is off', () => {
    stubSystemReducedMotion(true);
    render(<ReminderCard kind="posture" title="t" body="b" durationSec={20} onAction={vi.fn()} />);
    expect(screen.getByTestId('spine-mid').getAttribute('cx')).toBe('20');
  });

  it('shows a visible time left only for long breaks', () => {
    const { rerender } = render(<ReminderCard kind="rest" title="t" body="b" durationSec={600} onAction={vi.fn()} />);
    expect(screen.getByTestId('reminder-countdown')).toHaveClass('bb-duration');
    expect(screen.getByTestId('reminder-countdown')).toHaveTextContent('10:00 left');
    rerender(<ReminderCard kind="lookaway" title="t" body="b" durationSec={20} onAction={vi.fn()} />);
    expect(screen.getByTestId('reminder-countdown')).toHaveClass('bb-sr-only');
  });

  it('renders the matching symbol per kind', () => {
    const onAction = vi.fn();
    const { rerender } = render(<ReminderCard kind="posture" title="t" body="b" durationSec={20} onAction={onAction} />);
    expect(screen.getByTestId('spine-mid')).toBeInTheDocument();
    rerender(<ReminderCard kind="move" title="t" body="b" durationSec={20} onAction={onAction} />);
    expect(screen.getByTestId('stretch-arms')).toBeInTheDocument();
    rerender(<ReminderCard kind="rest" title="t" body="b" durationSec={600} onAction={onAction} />);
    expect(screen.getByTestId('breath-circle')).toBeInTheDocument();
    expect(screen.getByText(/Breathe (in|out)|Hold gently/)).toBeInTheDocument();
  });
});

describe('NativeReminder', () => {
  it('stays inert until a native reminder payload arrives', () => {
    render(<NativeReminder />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('Dashboard', () => {
  const stats = { date: '2026-09-24', activeSec: 60, shown: {}, completed: {}, skipped: {}, snoozed: {} };
  const renderDash = (status: ScheduleStatus, handlers: { onPause?: () => void; onResume?: () => void } = {}) =>
    render(<Dashboard activeSec={90} status={status} stats={stats} onBreakNow={vi.fn()} onPause={handlers.onPause ?? vi.fn()} onResume={handlers.onResume ?? vi.fn()} />);

  it('pause/resume buttons work', () => {
    const onPause = vi.fn();
    const onResume = vi.fn();
    const { unmount } = renderDash({ state: 'active', next: { kind: 'lookaway', inSec: 300 } }, { onPause });
    fireEvent.click(screen.getByTestId('dash-pause-15'));
    expect(onPause).toHaveBeenCalledWith(15);
    unmount();
    renderDash({ state: 'paused', untilMs: Date.now() + 60_000 }, { onResume });
    fireEvent.click(screen.getByTestId('dash-resume'));
    expect(onResume).toHaveBeenCalled();
  });

  it('names the next reminder and explains why nothing is coming', () => {
    const { unmount } = renderDash({ state: 'active', next: { kind: 'lookaway', inSec: 290 } });
    expect(screen.getByRole('heading', { name: 'Look far away' })).toBeInTheDocument();
    expect(screen.getByTestId('dash-next')).toHaveTextContent('in 5m');
    unmount();
    const quiet = renderDash({ state: 'quiet', until: '8:00 AM' });
    expect(screen.getByText('Quiet hours')).toBeInTheDocument();
    expect(screen.getByTestId('dash-next')).toHaveTextContent('until 8:00 AM');
    quiet.unmount();
    renderDash({ state: 'off' });
    expect(screen.getByText('All reminders are off')).toBeInTheDocument();
  });
});

describe('SettingsPanel', () => {
  it('toggles reminder and edits interval', () => {
    const onChange = vi.fn();
    const s = cloneSettings(DEFAULT_SETTINGS);
    render(<SettingsPanel settings={s} onChange={onChange} onReset={vi.fn()} />);
    fireEvent.click(screen.getByTestId('settings-enabled-blink'));
    expect(onChange).toHaveBeenCalled();
    const field = screen.getByTestId('settings-interval-blink');
    fireEvent.change(field, { target: { value: '10' } });
    fireEvent.blur(field);
    const updated = onChange.mock.calls.map((c) => c[0]).pop();
    expect(updated.reminders.blink.intervalSec).toBe(600);
  });

  it('lets an interval be cleared while typing, then clamps or restores it on commit', () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={cloneSettings(DEFAULT_SETTINGS)} onChange={onChange} onReset={vi.fn()} />);
    const field = screen.getByTestId('settings-interval-blink') as HTMLInputElement;
    fireEvent.change(field, { target: { value: '' } });
    expect(field.value).toBe(''); // no jump to "1" mid-edit
    fireEvent.blur(field);
    expect(field.value).toBe('5');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: '999' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(field.value).toBe('480');
    expect(onChange.mock.lastCall?.[0].reminders.blink.intervalSec).toBe(480 * 60);
  });

  it('moves the theme with arrow keys like a native radio group', () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={cloneSettings(DEFAULT_SETTINGS)} onChange={onChange} onReset={vi.fn()} />);
    const system = screen.getByTestId('settings-theme-system');
    expect(screen.getByTestId('settings-theme-light')).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(system, { key: 'ArrowRight' });
    expect(onChange.mock.lastCall?.[0].theme).toBe('light');
    expect(screen.getByTestId('settings-theme-light')).toHaveFocus();
    fireEvent.keyDown(system, { key: 'End' });
    expect(onChange.mock.lastCall?.[0].theme).toBe('dark');
  });

  it('disables quiet-hour times while quiet hours are off', () => {
    render(<SettingsPanel settings={cloneSettings(DEFAULT_SETTINGS)} onChange={vi.fn()} onReset={vi.fn()} />);
    expect(screen.getByTestId('settings-quiet-start')).toBeDisabled();
    expect(screen.getByTestId('settings-quiet-end')).toBeDisabled();
  });

  it('edits quiet-hours start and end times and has no dead card-position setting', () => {
    const onChange = vi.fn();
    const s = cloneSettings(DEFAULT_SETTINGS);
    s.quietHours.enabled = true;
    render(<SettingsPanel settings={s} onChange={onChange} onReset={vi.fn()} />);
    fireEvent.change(screen.getByTestId('settings-quiet-start'), { target: { value: '21:30' } });
    expect(onChange.mock.lastCall?.[0].quietHours.start).toBe('21:30');
    fireEvent.change(screen.getByTestId('settings-quiet-end'), { target: { value: '07:15' } });
    expect(onChange.mock.lastCall?.[0].quietHours.end).toBe('07:15');
    expect(screen.queryByTestId('settings-position')).not.toBeInTheDocument();
  });

  it('switches appearance between system, light, and dark', () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={cloneSettings(DEFAULT_SETTINGS)} onChange={onChange} onReset={vi.fn()} />);
    expect(screen.getByTestId('settings-theme-system')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('settings-theme-dark'));
    expect(onChange.mock.lastCall?.[0].theme).toBe('dark');
  });

  it('asks Windows to change autostart and waits while it does', async () => {
    let finish!: () => void;
    const onAutostartChange = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<SettingsPanel settings={cloneSettings(DEFAULT_SETTINGS)} onChange={vi.fn()} onReset={vi.fn()} autostartAvailable onAutostartChange={onAutostartChange} />);
    const toggle = screen.getByTestId('settings-autostart');
    fireEvent.click(toggle);
    expect(onAutostartChange).toHaveBeenCalledWith(!DEFAULT_SETTINGS.autostart);
    expect(toggle).toBeDisabled();
    await act(async () => finish());
    expect(toggle).toBeEnabled();
    expect(screen.queryByTestId('settings-autostart-error')).not.toBeInTheDocument();
  });

  it('says so when Windows refuses the autostart change', async () => {
    const onAutostartChange = vi.fn(() => Promise.reject(new Error('denied')));
    render(<SettingsPanel settings={cloneSettings(DEFAULT_SETTINGS)} onChange={vi.fn()} onReset={vi.fn()} autostartAvailable onAutostartChange={onAutostartChange} />);
    await act(async () => { fireEvent.click(screen.getByTestId('settings-autostart')); });
    expect(screen.getByTestId('settings-autostart-error')).toHaveTextContent("Windows didn't accept");
  });

  it('turns off the autostart switch outside the desktop app', () => {
    render(<SettingsPanel settings={cloneSettings(DEFAULT_SETTINGS)} onChange={vi.fn()} onReset={vi.fn()} />);
    expect(screen.getByTestId('settings-autostart')).toBeDisabled();
    expect(screen.getByText('Available in the desktop app.')).toBeInTheDocument();
  });
});
