import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReminderCard } from './ReminderCard';
import { Dashboard } from './Dashboard';
import { SettingsPanel } from './SettingsPanel';
import { BreathSymbol, EyeSymbol, HorizonSymbol, SpineSymbol, StretchSymbol, ProgressRing } from './symbols';
import { Gallery } from './Gallery';
import { NativeReminder } from './NativeReminder';
import { DEFAULT_SETTINGS, cloneSettings } from '../lib/types';

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

  it('renders the matching symbol per kind', () => {
    const onAction = vi.fn();
    const { rerender } = render(<ReminderCard kind="posture" title="t" body="b" durationSec={20} onAction={onAction} />);
    expect(screen.getByTestId('spine-mid')).toBeInTheDocument();
    rerender(<ReminderCard kind="move" title="t" body="b" durationSec={20} onAction={onAction} />);
    expect(screen.getByTestId('stretch-arms')).toBeInTheDocument();
    rerender(<ReminderCard kind="rest" title="t" body="b" durationSec={600} onAction={onAction} />);
    expect(screen.getByTestId('breath-circle')).toBeInTheDocument();
    expect(screen.getByText(/Breathe (in|out)/)).toBeInTheDocument();
  });
});

describe('NativeReminder', () => {
  it('stays inert until a native reminder payload arrives', () => {
    render(<NativeReminder />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('Dashboard', () => {
  it('pause/resume buttons work', () => {
    const onPause = vi.fn();
    const onResume = vi.fn();
    const stats = { date: '2026-09-24', activeSec: 60, shown: {}, completed: {}, skipped: {}, snoozed: {} };
    const { rerender } = render(
      <Dashboard activeSec={90} nextInSec={300} paused={false} stats={stats} onBreakNow={vi.fn()} onPause={onPause} onResume={onResume} />,
    );
    fireEvent.click(screen.getByTestId('dash-pause-15'));
    expect(onPause).toHaveBeenCalledWith(15);
    rerender(
      <Dashboard activeSec={90} nextInSec={null} paused={true} stats={stats} onBreakNow={vi.fn()} onPause={onPause} onResume={onResume} />,
    );
    fireEvent.click(screen.getByTestId('dash-resume'));
    expect(onResume).toHaveBeenCalled();
  });
});

describe('SettingsPanel', () => {
  it('toggles reminder and edits interval', () => {
    const onChange = vi.fn();
    const s = cloneSettings(DEFAULT_SETTINGS);
    render(<SettingsPanel settings={s} onChange={onChange} onReset={vi.fn()} />);
    fireEvent.click(screen.getByTestId('settings-enabled-blink'));
    expect(onChange).toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('settings-interval-blink'), { target: { value: '10' } });
    const updated = onChange.mock.calls.map((c) => c[0]).pop();
    expect(updated.reminders.blink.intervalSec).toBe(600);
  });

  it('edits quiet-hours start and end times and has no dead card-position setting', () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={cloneSettings(DEFAULT_SETTINGS)} onChange={onChange} onReset={vi.fn()} />);
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

  it('exposes a Windows autostart toggle that persists the setting', () => {
    const onChange = vi.fn();
    const s = cloneSettings(DEFAULT_SETTINGS);
    render(<SettingsPanel settings={s} onChange={onChange} onReset={vi.fn()} />);
    const toggle = screen.getByTestId('settings-autostart');
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls.map((c) => c[0]).pop();
    expect(updated.autostart).toBe(!DEFAULT_SETTINGS.autostart);
  });
});
