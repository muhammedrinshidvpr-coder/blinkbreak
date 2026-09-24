# Blink Toast + Reminder Polish Plan

Date: 2026-09-24
Status: Implemented — automated checks pass; live Tauri check pending

## Objective

Make reminders prettier and less disruptive, and make them close on time every time:
the blink reminder becomes a small animated emoji at the top-center of the screen that
blinks with the user and then leaves by itself; the bigger reminders keep the overlay,
with timing, labels, and closing fixed so they behave the way they say they do.

## What review + testing found (current uncommitted overlay work)

`npm test`: 32/32 pass. The tests only cover the React countdown. The problems are in how the pieces connect:

1. **Blink is too heavy.** A full-monitor dimmed overlay every 5 min for 10 s = 12 screen takeovers/hour for the lightest reminder.
2. **Closing depends on one JS path.** The overlay hides only if the reminder webview's timer fires *and* its `emit` + `hide_reminder` both succeed. If any step fails, the overlay stays up and the main window's `reminderVisibleRef` stays `true` forever, so **every later reminder stops** (`App.tsx` poll returns early).
3. **Wrong time on Snooze.** Button always says "Snooze 5m", but real snooze is 5/10/15/15/30 min per kind (`types.ts` `snoozeSec`).
4. **Misleading hint.** "Press Esc to skip": the overlay is shown without focus on purpose, so Esc never reaches it in the native app.
5. **Expiry counts as "skipped".** If you blink or look away for the full countdown, that gets recorded as a skip, so the stats get worse the more you follow along.
6. **No exit animation.** The window just disappears at 0 s. The entrance is animated but the exit is not.

## Contracts

- `ReminderPayload` gains `presentation: 'toast' | 'overlay'` (blink → toast; all others → overlay). Derived in one place (`presentationFor(kind)`).
- `show_reminder` (Rust) takes `presentation`: toast sizes the reusable `reminder` window to ~420×200 logical px, centered horizontally, 24 px from the top of the pointer's monitor. Overlay keeps the full-monitor behavior.
- `show_reminder` starts a **native deadline**: after `duration_sec + 3 s`, if that same reminder (sequence id) is still showing, Rust hides the window and emits `blinkbreak:reminder-action { kind, action }` itself. `hide_reminder` clears the sequence so the deadline does nothing.
- `BlinkToast` props: `durationSec`, `reducedMotion`, `onAction`. Emits exactly one action. Click on the toast = done, × = skip, expiry = done.
- `ReminderCard` shows the real snooze length from settings (`snoozeSec` passed through the payload).
- Every reminder plays a ~300 ms exit animation, *then* settles. The settle guard stays one-shot.

## The blink emoji (visual spec)

- Custom SVG emoji face (not a font emoji, because font emoji eyelids can't animate): warm yellow radial gradient, soft blush, glossy highlight, eyelids that close over the eyes, gentle smile.
- A thin progress ring around the face shows the remaining time and empties smoothly over `durationSec`.
- A frosted-glass pill next to it: "Blink slowly with me" + a tiny "8s" counter.
- Motion: spring drop-in from above (450 ms) → slow blinks timed so the count fits the duration (`--blink-period = durationSec / 4`, so 4 relaxed blinks in 10 s) → sparkle twinkle → rise-and-fade exit (300 ms).
- Reduced motion: no drop, no blinks; fade only, and the ring still counts down.

## Timing table (after change)

| Kind | Every (active use) | Shown for | Style | On expiry |
|---|---|---|---|---|
| Blink | 5 min | 10 s | top-center emoji toast | done |
| Look away | 20 min | 20 s (20-20-20) | overlay | done |
| Posture | 30 min | 20 s | overlay | skip |
| Move | 60 min | 5 min | overlay | skip |
| Long rest | 120 min | 10 min | overlay | skip |

Blink and look-away finish as done because watching the countdown *is* the exercise. The others need you to actually get up, so they finish as skipped unless you press Done.

## Boundaries

In scope: blink toast component + styles, presentation mode in bridge/Rust, native deadline watchdog, snooze label, overlay exit animation + hint text, expiry-as-done rule, tests.
Out of scope: settings schema changes, new dependencies, sound, scheduler algorithm changes.
Must follow: one reusable `reminder` window (never stack); never focus it; browser preview keeps working (toast renders top-center in-page).

## Execution Steps

1. `types.ts`/`native.ts`: add `presentation`, `snoozeSec`, `presentationFor()`, and an `expiryAction(kind)` rule.
2. `lib.rs`: toast sizing/positioning; sequence counter + deadline thread that hides the window and emits the action; `hide_reminder` clears it. `cargo fmt` + `cargo check`.
3. `BlinkToast.tsx` + CSS (emoji SVG, ring, pill, keyframes, reduced motion).
4. `OverlayReminder`/`ReminderCard`: exit animation before settle, real snooze label, "Click outside to skip" hint, expiry action per kind.
5. `NativeReminder` + `App.tsx`: route blink → toast, others → overlay; pass `snoozeSec`/`presentation`.
6. Tests (below), then `npm test`, `npm run lint`, `npm run build`, and try it live with `npm run tauri dev` using Take a break now + a temporary 1-min blink interval.

## Verification

- BlinkToast: auto-closes once at duration + exit; click → done; × → skip; racing click + expiry → one action; reduced motion has no blink animation class.
- Snooze label reads 10m for look away, 30m for rest.
- Expiry records done for blink/lookaway, skip for posture.
- NativeReminder renders the toast for blink and the overlay for the others.
- Manual: the toast appears top-center on the monitor with the pointer, doesn't steal typing focus, and disappears by itself. After killing the reminder webview's JS (devtools), the Rust deadline still hides the window and reminders keep coming.

## Acceptance Criteria

- Blink appears as a small animated emoji at the top center and never dims the screen.
- Every reminder closes by itself on time, even if the webview's JS path fails.
- Displayed times (countdown, snooze) match the real settings.
- All existing and new tests pass; lint/build/cargo check pass.
