import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReminderKind } from '../lib/types';
import { OverlayReminder } from './OverlayReminder';
import { EXIT_MS } from './useSettleOnce';

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
    fireEvent.click(screen.getByTestId('reminder-skip'));
    act(() => vi.advanceTimersByTime(1_000 + EXIT_MS));

    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith('done');
  });

  it('settles immediately with reduced motion', () => {
    const onAction = renderOverlay({ reducedMotion: true });
    fireEvent.click(screen.getByTestId('reminder-done'));
    expect(onAction).toHaveBeenCalledWith('done');
  });

  it('labels snooze with the real snooze length and no Esc hint', () => {
    renderOverlay({ snoozeSec: 30 * 60 });
    expect(screen.getByTestId('reminder-snooze')).toHaveTextContent('Snooze 30m');
    expect(screen.queryByText(/Esc/)).not.toBeInTheDocument();
  });
});
