import type { SoundTone } from './types';

export type SoundCue = 'start' | 'end' | 'blink';

const VOICES: Record<SoundTone, { frequency: number; attack: number; decay: number; partials: readonly [number, number][] }> = {
  bell: { frequency: 523.25, attack: 0.018, decay: 0.95, partials: [[1, 0.7], [2.76, 0.12]] },
  wood: { frequency: 392, attack: 0.008, decay: 0.22, partials: [[1, 0.8], [2.8, 0.2]] },
  air: { frequency: 440, attack: 0.12, decay: 0.8, partials: [[1, 0.5], [1.006, 0.3], [2, 0.1]] },
};

let context: AudioContext | null = null;
let request = 0;
let active: { gain: GainNode; sources: OscillatorNode[] } | null = null;

function fadePrevious(ctx: AudioContext) {
  if (!active) return;
  const { gain, sources } = active;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.025);
  for (const source of sources) source.stop(now + 0.03);
  active = null;
}

function schedule(ctx: AudioContext, volume: number, tone: SoundTone, cue: SoundCue) {
  const profile = VOICES[tone];
  const gain = ctx.createGain();
  gain.gain.value = volume * 0.18 * (cue === 'blink' ? 0.55 : 1);
  gain.connect(ctx.destination);
  const playing = { gain, sources: [] as OscillatorNode[] };
  active = playing;
  const notes = cue === 'blink' ? [1] : cue === 'start' ? [1, 1.5] : [1.5, 1];
  const attack = cue === 'blink' ? Math.min(profile.attack, 0.012) : profile.attack;
  const decay = cue === 'blink' ? Math.min(profile.decay, 0.18) : profile.decay;
  let remaining = notes.length * profile.partials.length;

  notes.forEach((note, index) => {
    for (const [ratio, level] of profile.partials) {
      const start = ctx.currentTime + 0.01 + index * 0.18;
      const end = start + attack + decay;
      const source = ctx.createOscillator();
      const envelope = ctx.createGain();
      source.type = 'sine';
      source.frequency.value = profile.frequency * note * ratio;
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(level, start + attack);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      source.connect(envelope).connect(gain);
      source.onended = () => {
        source.disconnect();
        envelope.disconnect();
        if (--remaining === 0) {
          gain.disconnect();
          if (active === playing) active = null;
        }
      };
      playing.sources.push(source);
      source.start(start);
      source.stop(end + 0.01);
    }
  });
}

/**
 * Offline, gentle cues. Never throws: unsupported or blocked audio means silence.
 * Resume before scheduling; rapid previews replace one another instead of piling up.
 * Policy (when to play) belongs to the caller, not the audio engine.
 */
export function playChime(volume: number, tone: SoundTone = 'bell', cue: SoundCue = 'start'): void {
  const currentRequest = ++request;
  try {
    if (context) fadePrevious(context);
    if (!Number.isFinite(volume) || volume <= 0) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!context || context.state === 'closed') context = new Ctx();
    const ctx = context;
    void ctx.resume().then(() => {
      if (currentRequest !== request || ctx.state !== 'running') return;
      schedule(ctx, Math.min(1, volume), tone, cue);
    }).catch(() => undefined);
  } catch {
    // Sound must never prevent a reminder from showing or closing.
  }
}
