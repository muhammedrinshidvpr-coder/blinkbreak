import type { ReminderKind } from '../lib/types';
import { ReminderSymbol } from './symbols';

const STORY_STEPS: Array<{
  kind: ReminderKind;
  when: string;
  title: string;
  body: string;
}> = [
  {
    kind: 'blink',
    when: '5 min',
    title: 'Begin softly',
    body: 'A small blink prompt brings back the slow, complete blinks that focused screen work can make easy to forget.',
  },
  {
    kind: 'lookaway',
    when: '20 min',
    title: 'Find the horizon',
    body: 'Your gaze leaves the near screen for 20 seconds, giving close-focus work a simple change of distance.',
  },
  {
    kind: 'posture',
    when: '30 min',
    title: 'Return to upright',
    body: 'A quiet check invites your shoulders down, your back supported, and your setup back into a comfortable shape.',
  },
  {
    kind: 'move',
    when: '60 min',
    title: 'Let the body move',
    body: 'Standing, stretching, or taking a short walk breaks up a long stretch of sitting without ending the study day.',
  },
  {
    kind: 'rest',
    when: '2 hours',
    title: 'Step away fully',
    body: 'A longer pause gives your eyes and body time away from the workstation before the next focused chapter.',
  },
];

export function HowItWorks({
  idleSensingSupported = true,
  fullscreenSensingSupported = true,
}: {
  idleSensingSupported?: boolean;
  fullscreenSensingSupported?: boolean;
}) {
  return (
    <div className="bb-story" data-testid="how-it-works">
      <section className="bb-panel bb-story-intro" aria-labelledby="story-title">
        <p className="bb-eyebrow">A day with BlinkBreak</p>
        <h2 id="story-title">You keep your focus. Small pauses keep the rhythm.</h2>
        <p className="bb-story-lead">
          {idleSensingSupported
            ? 'BlinkBreak counts active computer use, not time on the clock.'
            : 'On this platform, BlinkBreak counts time while the app is open because system-wide idle sensing is not available yet.'}{' '}
          With the recommended settings, five gentle reminders form a path from tiny eye breaks to real time away from the screen.
        </p>
        <p className="bb-story-promise">You work. BlinkBreak waits for the right moment.</p>
      </section>

      <section className="bb-panel bb-story-journey" aria-labelledby="journey-title">
        <div className="bb-story-section-heading">
          <p className="bb-eyebrow">The default healthy rhythm</p>
          <h2 id="journey-title">As a focused session unfolds</h2>
        </div>
        <div className="bb-story-path">
          {STORY_STEPS.map((step) => (
            <article className="bb-story-step" data-kind={step.kind} key={step.kind}>
              <div className="bb-story-symbol">
                <ReminderSymbol kind={step.kind} t={0} durationSec={20} still />
              </div>
              <p className="bb-story-time">At {step.when}</p>
              <div className="bb-story-copy">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="bb-story-customize">Every step can be adjusted or turned off in Settings.</p>
      </section>

      <section className="bb-story-focus" aria-labelledby="focus-title">
        <div className="bb-story-section-heading">
          <p className="bb-eyebrow">Built around attention</p>
          <h2 id="focus-title">Helpful, never a pile-up</h2>
        </div>
        <div className="bb-story-focus-grid">
          <article className="bb-story-detail">
            <span className="bb-story-number" aria-hidden="true">01</span>
            <h3>One voice at a time</h3>
            <p>If reminders meet, the most complete break speaks for the others. There is no waiting backlog.</p>
          </article>
          <article className="bb-story-detail">
            <span className="bb-story-number" aria-hidden="true">02</span>
            <h3>Five quiet minutes</h3>
            <p>After any reminder closes, at least five active minutes pass before another can appear.</p>
          </article>
          <article className="bb-story-detail">
            <span className="bb-story-number" aria-hidden="true">03</span>
            <h3>Your context matters</h3>
            <p>
              {idleSensingSupported
                ? 'Timers pause when you are idle or asleep.'
                : 'System-wide idle sensing is not available, so timers cannot pause just because you step away.'}{' '}
              {fullscreenSensingSupported
                ? 'Fullscreen work can defer a reminder.'
                : 'Reminders cannot detect or defer for fullscreen apps on this platform yet.'}{' '}
              Desktop alerts are designed not to take keyboard focus.
            </p>
          </article>
        </div>
      </section>

      <section className="bb-panel bb-story-private" aria-labelledby="privacy-title">
        <div>
          <p className="bb-eyebrow">Private by design</p>
          <h2 id="privacy-title">It notices time, not you.</h2>
        </div>
        <p>
          {idleSensingSupported
            ? 'BlinkBreak reads only how long your keyboard and mouse have been idle.'
            : 'BlinkBreak does not read system-wide keyboard or mouse idle time on this platform yet.'}{' '}
          There is no camera, account, cloud,
          app-name tracking, or key recording. Your settings and daily totals stay on this computer.
        </p>
      </section>

      <p className="bb-story-disclaimer">
        BlinkBreak supports healthy screen habits. It is not a medical device and does not diagnose, prevent, or treat a condition.
      </p>
    </div>
  );
}
