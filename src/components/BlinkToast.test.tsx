import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlinkToast } from './BlinkToast';
import { NativeReminder } from './NativeReminder';
import { EXIT_MS } from './useSettleOnce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BlinkToast', () => {
  it('counts down and closes by itself as done after the exit animation', () => {
    const onAction = vi.fn();
    render(<BlinkToast durationSec={10} onAction={onAction} />);
    expect(screen.getByTestId('blink-toast-countdown')).toHaveTextContent('10s');

    act(() => vi.advanceTimersByTime(4_000));
    expect(screen.getByTestId('blink-toast-countdown')).toHaveTextContent('6s');

    act(() => vi.advanceTimersByTime(6_000));
    expect(screen.getByTestId('blink-toast')).toHaveClass('is-leaving');
    expect(onAction).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(EXIT_MS));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith('done');
  });

  it('click on the emoji is done, × is skip, and only the first one counts', () => {
    const onAction = vi.fn();
    render(<BlinkToast durationSec={10} onAction={onAction} />);
    fireEvent.click(screen.getByTestId('blink-toast-skip'));
    fireEvent.click(screen.getByTestId('blink-toast'));
    act(() => vi.advanceTimersByTime(20_000));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith('skip');
  });

  it('times the ring to the full duration and fits about four blinks', () => {
    render(<BlinkToast durationSec={10} onAction={vi.fn()} />);
    const toast = screen.getByTestId('blink-toast');
    expect(toast.style.getPropertyValue('--bb-toast-duration')).toBe('10s');
    expect(toast.style.getPropertyValue('--bb-blink-period')).toBe('2.5s');
  });

  it('reduced motion disables animation and settles without delay', () => {
    const onAction = vi.fn();
    render(<BlinkToast durationSec={5} reducedMotion onAction={onAction} />);
    expect(screen.getByTestId('blink-toast')).toHaveClass('reduced-motion');
    fireEvent.click(screen.getByTestId('blink-toast'));
    expect(onAction).toHaveBeenCalledWith('done');
  });
});

describe('NativeReminder routing', () => {
  it('shows the blink toast for toast payloads and the overlay otherwise', async () => {
    const handlers: Array<(payload: unknown) => void> = [];
    vi.doMock('../lib/native', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../lib/native')>()),
      listen: async (_event: string, handler: (payload: unknown) => void) => {
        handlers.push(handler);
        return () => undefined;
      },
    }));
    vi.resetModules();
    const { NativeReminder: Routed } = await import('./NativeReminder');
    render(<Routed />);
    await act(async () => {});

    const base = { title: 't', body: 'b', durationSec: 10, snoozeSec: 600, reducedMotion: false };
    act(() => handlers[0]({ ...base, kind: 'blink', presentation: 'toast', expiryAction: 'done' }));
    expect(screen.getByTestId('blink-toast')).toBeInTheDocument();
    expect(screen.queryByTestId('reminder-overlay')).not.toBeInTheDocument();

    act(() => handlers[0]({ ...base, kind: 'lookaway', presentation: 'overlay', expiryAction: 'done' }));
    expect(screen.getByTestId('reminder-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('reminder-snooze')).toHaveTextContent('Snooze 10m');
    vi.doUnmock('../lib/native');
  });

  it('is inert before any payload arrives', () => {
    render(<NativeReminder />);
    expect(screen.queryByTestId('blink-toast')).not.toBeInTheDocument();
  });
});
