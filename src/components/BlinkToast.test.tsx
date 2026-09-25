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
    expect(screen.getByTestId('blink-toast')).toHaveAccessibleName('Blink slowly, 10 seconds left');

    act(() => vi.advanceTimersByTime(4_000));
    expect(screen.getByTestId('blink-toast')).toHaveAccessibleName('Blink slowly, 6 seconds left');

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

  it('says only two words and times its ring to the full duration', () => {
    render(<BlinkToast durationSec={10} onAction={vi.fn()} />);
    expect(screen.getByTestId('blink-toast')).toHaveTextContent(/^Blink slowly$/);
    const ring = screen.getByTestId('progress-ring').closest('.bb-ring') as HTMLElement;
    expect(ring.style.getPropertyValue('--bb-duration')).toBe('10s');
    expect(screen.getByTestId('eye-symbol')).toBeInTheDocument();
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

    const base = { title: 't', body: 'b', durationSec: 10, snoozeSec: 600, reducedMotion: false, theme: 'dark' };
    act(() => handlers[0]({ ...base, kind: 'blink', presentation: 'toast', expiryAction: 'done' }));
    expect(screen.getByTestId('blink-toast')).toBeInTheDocument();
    expect(screen.queryByTestId('reminder-overlay')).not.toBeInTheDocument();

    act(() => handlers[0]({ ...base, kind: 'lookaway', presentation: 'overlay', expiryAction: 'done' }));
    expect(screen.getByTestId('reminder-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('reminder-snooze')).toHaveAccessibleName('Snooze 10m');
    expect(document.documentElement.dataset.theme).toBe('dark'); // theme travels with the payload
    vi.doUnmock('../lib/native');
  });

  it('is inert before any payload arrives', () => {
    render(<NativeReminder />);
    expect(screen.queryByTestId('blink-toast')).not.toBeInTheDocument();
  });
});
