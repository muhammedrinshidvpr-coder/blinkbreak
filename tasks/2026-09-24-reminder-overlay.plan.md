# Reminder Overlay Implementation Plan

Date: 2026-09-24
Status: Implemented, verified, and packaged as a Windows NSIS installer

## Objective

Replace the small native reminder window with a polished, dimmed overlay covering the monitor under the pointer. The centered cartoon reminder must remain dismissible, defer while another application is fullscreen, and disappear automatically when its configured duration expires.

## Contracts

- `ReminderPayload` carries `kind`, `title`, `body`, and `durationSec` from the scheduler to the reminder window.
- `prepareReminderOverlay()` sizes and positions the reusable native reminder window to the monitor under the pointer, falling back to the primary monitor.
- `isFullscreenActive()` asks the native shell whether the foreground application covers its monitor; failures return `false` so reminders are not silently lost.
- `OverlayReminder` accepts a reminder payload, reduced-motion preference, and action callback. It emits exactly one `skip` for backdrop click, Escape, or countdown expiry.

## Orchestration

Scheduler or manual break -> check fullscreen deferral -> prepare active-monitor overlay -> emit payload and show native window -> render veil and centered card -> Done/Snooze/Skip/backdrop/Escape/expiry -> emit one action -> hide overlay -> update scheduler and stats in the main window.

Browser preview keeps its current in-dashboard reminder path and gains automatic expiry through the shared card countdown.

## Boundaries

In scope:
- Active-monitor sizing and positioning.
- Fullscreen foreground-window detection on Windows.
- Overlay visuals, responsive layout, entrance animation, and reduced-motion behavior.
- Automatic dismissal at the configured reminder duration.
- Native and manual-break integration plus focused tests.

Out of scope:
- New settings or persistence schema changes.
- Sound, notification, or scheduler redesign.
- New dependencies.
- Installer signing or changes unrelated to reminders.

Must follow:
- Reuse the existing reminder window; never stack windows.
- Do not focus the overlay when it appears.
- Preserve existing action/stat semantics; expiry is `skip`.
- Keep all browser/non-Tauri bridge calls safe.

## Decisions

- Use physical monitor coordinates from Tauri directly, avoiding DPI conversion drift.
- Carry `durationSec` in the event rather than duplicating duration rules in the reminder window.
- Treat native detection errors as not-fullscreen; a failed check must not discard a due reminder.
- Use an action settlement guard so competing dismissal paths emit once.
- Keep the full configured duration for every overlay, including move and rest.

## Verification

1. Unit/component tests prove expiry, backdrop, Escape, one-shot settlement, and browser bridge fallbacks.
2. `npm test`, `npm run lint`, and `npm run build` pass.
3. `cargo fmt --check` and `cargo check` pass.
4. Browser visual inspection confirms responsive overlay composition and no console errors.

## Acceptance Criteria

- The native overlay covers the pointer's current monitor with a dim veil and centered cartoon card.
- It does not request focus when shown and stays above normal windows.
- Backdrop click, Escape, and countdown expiry record one skipped action and hide the overlay.
- Configured durations are used for every reminder kind.
- Fullscreen foreground applications defer scheduled and manual reminders when the setting is enabled.
- Existing tests remain green and new behavior has feature-level tests.

## Execution Steps

1. Extend native payload/window bridge and Tauri permissions/configuration.
2. Add Windows fullscreen detection and register the native command.
3. Add card expiry support and the overlay component/styles.
4. Wire scheduled and manual native reminders through one show path.
5. Add tests, run all verification, and correct any regressions.
