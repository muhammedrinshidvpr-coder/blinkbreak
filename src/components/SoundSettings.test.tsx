import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloneSettings, DEFAULT_SETTINGS } from '../lib/types';
import { installAudioBoundary } from '../test/audio';

afterEach(() => vi.unstubAllGlobals());

describe('Sound settings', () => {
  it('lets people preview both selected cues while automatic sound is off, and save the end-cue preference', async () => {
    const audio = installAudioBoundary();
    const { SettingsPanel } = await import('./SettingsPanel');
    function Settings() {
      const [settings, setSettings] = useState(cloneSettings(DEFAULT_SETTINGS));
      return <SettingsPanel settings={settings} onChange={setSettings} onReset={() => {}} />;
    }
    render(<Settings />);
    fireEvent.click(screen.getByRole('radio', { name: 'Airy tone' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '60' } });
    expect(screen.getByRole('radio', { name: 'Airy tone' })).toBeChecked();
    expect(screen.getByTestId('settings-chime')).not.toBeChecked();
    expect(audio.oscillators).toHaveLength(0);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Preview blink sound' })));
    expect(audio.oscillators).toHaveLength(3); // one airy note, not the two-note break cue
    expect(audio.oscillators[0].frequency.value).toBe(440);
    expect(audio.gains[0].gain.value).toBeCloseTo(0.6 * 0.54);
    const blinkCount = audio.oscillators.length;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Preview start sound' })));
    expect(audio.oscillators[blinkCount].frequency.value).toBe(440);
    expect(audio.gains[blinkCount + 1].gain.value).toBeCloseTo(0.108);
    const startCount = audio.oscillators.length;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Preview end sound' })));
    expect(audio.oscillators[startCount].frequency.value).toBe(660);

    fireEvent.click(screen.getByTestId('settings-chime'));
    expect(screen.getByTestId('settings-end-cue')).toBeEnabled();
    fireEvent.click(screen.getByTestId('settings-end-cue'));
    expect(screen.getByTestId('settings-end-cue')).not.toBeChecked();
    fireEvent.click(screen.getByTestId('settings-chime'));
    expect(screen.getByTestId('settings-end-cue')).toBeDisabled();
    fireEvent.click(screen.getByTestId('settings-chime'));
    expect(screen.getByTestId('settings-end-cue')).not.toBeChecked();

    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '0' } });
    const count = audio.oscillators.length;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Preview start sound' })));
    expect(audio.oscillators).toHaveLength(count);
  });
});
