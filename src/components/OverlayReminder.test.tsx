import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReminderKind } from '../lib/types';
import { OverlayReminder } from './OverlayReminder';
import { EXIT_MS, REDUCED_EXIT_MS } from './useSettleOnce';

function renderOverlay({ kind = 'posture' as ReminderKind, durationSec = 10, snoozeSec = 900, reducedMotion = false } = {}) {
  const onAction = vi.fn();
  render(
    <OverlayReminder
      kind={kind}
      title="Posture reset"
      body="Relax your shoulders."
      durationSec={durationSec}
      snoozeSec={snoozeSec}
      reducedMotion={reducedMotion}
      onAction={onAction}
    />,
  );
  return onAction;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OverlayReminder', () => {
  it('signals natural expiry once even when the break is recorded as skipped', () => {
    const onTimerEnd = vi.fn();
    const onAction = vi.fn();
    render(<OverlayReminder kind="rest" title="Rest" body="b" durationSec={1} snoozeSec={600} onAction={onAction} onTimerEnd={onTimerEnd} />);
    act(() => vi.advanceTimersByTime(1_000));
    expect(onTimerEnd).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(2_000));
    expect(onTimerEnd).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith('skip');
  });

  it.each(['done', 'snooze', 'backdrop', 'escape'])('does not signal timer end after %s wins the expiry race', (action) => {
    const onTimerEnd = vi.fn();
    render(<OverlayReminder kind="lookaway" title="Look away" body="b" durationSec={1} snoozeSec={600} onAction={vi.fn()} onTimerEnd={onTimerEnd} />);
    act(() => vi.advanceTimersByTime(900));
    if (action === 'escape') fireEvent.keyDown(window, { key: 'Escape' });
    else fireEvent.click(screen.getByTestId(action === 'backdrop' ? 'reminder-overlay' : `reminder-${action}`));
    act(() => vi.advanceTimersByTime(1_000));
    expect(onTimerEnd).not.toHaveBeenCalled();
  });

  it('closes by itself when the countdown ends, after the exit animation', () => {
    const onAction = renderOverlay({ durationSec: 2 });

    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByTestId('reminder-overlay')).toHaveClass('is-leaving');
    expect(onAction).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(EXIT_MS));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith('skip');
  });

  it('records look-away expiry as done, because following the countdown is the exercise', () => {
    const onAction = renderOverlay({ kind: 'lookaway', durationSec: 1 });
    act(() => vi.advanceTimersByTime(1_000));
    act(() => vi.advanceTimersByTime(EXIT_MS));
    expect(onAction).toHaveBeenCalledWith('done');
  });

  it('dismisses as skipped from the backdrop or Escape', () => {
    const backdropAction = renderOverlay();
    fireEvent.click(screen.getAllByTestId('reminder-overlay')[0]);
    act(() => vi.advanceTimersByTime(EXIT_MS));
    expect(backdropAction).toHaveBeenCalledWith('skip');

    const escapeAction = renderOverlay();
    fireEvent.keyDown(window, { key: 'Escape' });
    act(() => vi.advanceTimersByTime(EXIT_MS));
    expect(escapeAction).toHaveBeenCalledWith('skip');
  });

  it('settles once when a manual action races the countdown', () => {
    const onAction = renderOverlay({ durationSec: 1 });

    fireEvent.click(screen.getByTestId('reminder-done'));
    fireEvent.click(screen.getByTestId('reminder-overlay'));
    act(() => vi.advanceTimersByTime(1_000 + EXIT_MS));

    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith('done');
  });

  it('settles after a short fade with reduced motion', () => {
    const onAction = renderOverlay({ reducedMotion: true });
    fireEvent.click(screen.getByTestId('reminder-done'));
    act(() => vi.advanceTimersByTime(REDUCED_EXIT_MS));
    expect(onAction).toHaveBeenCalledWith('done');
  });

  it('is a focused dialog in the browser and gives focus back when it closes', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(
      <OverlayReminder kind="posture" title="Sit tall" body="b" durationSec={20} snoozeSec={900} onAction={vi.fn()} />,
    );
    expect(screen.getByRole('dialog', { name: 'Sit tall' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(screen.getByTestId('reminder-snooze')).toHaveFocus(); // focus wraps inside the card
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('never takes focus in the native window (it must not steal typing)', () => {
    render(<OverlayReminder kind="posture" title="Sit tall" body="b" durationSec={20} snoozeSec={900} onAction={vi.fn()} manageFocus={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).toHaveFocus();
  });

  it('keeps it quiet: two actions, real snooze length, no hint text', () => {
    renderOverlay({ snoozeSec: 30 * 60 });
    expect(screen.getByTestId('reminder-snooze')).toHaveAccessibleName('Snooze 30m');
    expect(screen.getByTestId('reminder-snooze')).toHaveTextContent('Later 30m');
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.queryByText(/Esc|click outside/i)).not.toBeInTheDocument();
  });
});
