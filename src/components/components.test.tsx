import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReminderCard } from './ReminderCard';
import { Dashboard } from './Dashboard';
import { SettingsPanel } from './SettingsPanel';
import { BlinkEye } from './cartoon/BlinkEye';
import { LookAway } from './cartoon/LookAway';
import { PostureReset } from './cartoon/PostureReset';
import { MoveStretch } from './cartoon/MoveStretch';
import { NativeReminder } from './NativeReminder';
import { DEFAULT_SETTINGS, cloneSettings } from '../lib/types';

describe('cartoon visuals', () => {
  it('renders each cartoon with accessible label', () => {
    render(<BlinkEye />);
    expect(screen.getByTestId('blink-eye')).toBeInTheDocument();
    render(<LookAway />);
    expect(screen.getByTestId('look-away')).toBeInTheDocument();
    render(<PostureReset />);
    expect(screen.getByTestId('posture-reset')).toBeInTheDocument();
    render(<MoveStretch />);
    expect(screen.getByTestId('move-stretch')).toBeInTheDocument();
  });

  it('reduced motion disables animation class', () => {
    const { container } = render(<BlinkEye reducedMotion />);
    expect(container.querySelector('.reduced-motion')).not.toBeNull();
  });
});

describe('ReminderCard', () => {
  it('shows countdown and fires done/skip/snooze', () => {
    const onAction = vi.fn();
    render(<ReminderCard kind="blink" title="Time to blink" body="Blink!" durationSec={20} onAction={onAction} />);
    expect(screen.getByTestId('reminder-blink')).toBeInTheDocument();
    expect(screen.getByTestId('reminder-countdown').textContent).toContain('20s');
    fireEvent.click(screen.getByTestId('reminder-done'));
    expect(onAction).toHaveBeenCalledWith('done');
    fireEvent.click(screen.getByTestId('reminder-snooze'));
    expect(onAction).toHaveBeenCalledWith('snooze');
    fireEvent.click(screen.getByTestId('reminder-skip'));
    expect(onAction).toHaveBeenCalledWith('skip');
  });

  it('renders correct cartoon per kind', () => {
    const onAction = vi.fn();
    const { rerender } = render(<ReminderCard kind="lookaway" title="t" body="b" durationSec={20} onAction={onAction} />);
    expect(screen.getByTestId('look-away')).toBeInTheDocument();
    rerender(<ReminderCard kind="posture" title="t" body="b" durationSec={20} onAction={onAction} />);
    expect(screen.getByTestId('posture-reset')).toBeInTheDocument();
    rerender(<ReminderCard kind="move" title="t" body="b" durationSec={20} onAction={onAction} />);
    expect(screen.getByTestId('move-stretch')).toBeInTheDocument();
  });
});

describe('NativeReminder', () => {
  it('renders a safe fallback card before the native event arrives', () => {
    render(<NativeReminder reducedMotion />);
    expect(screen.getByRole('alertdialog', { name: 'Blink, friend' })).toBeInTheDocument();
    expect(screen.getByText('Relax your face and blink slowly.')).toBeInTheDocument();
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
