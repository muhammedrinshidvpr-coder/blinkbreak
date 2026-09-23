# BlinkBreak — Implementation Plan
Date: 2026-09-24 / Status: v0.1 BUILT & VERIFIED (frontend) — Tauri bundle pending toolchain
Decisions: Windows-first, always-gentle reminders, reminder-only posture (no camera), local-only.

## 1. Data Models (BACKBONE)
- `ReminderKind = blink | lookaway | posture | move | rest` (`src/lib/types.ts`)
- `ReminderDefinition { kind, label, intervalSec, durationSec, enabled, priority, snoozeSec }`
- `AppSettings { version:1, reminders, idleThresholdSec:60, quietHours, sound, reducedMotion, reminderPosition, autostart, fullscreenDefer, pauseUntilMs }`
- `DayStats { date, activeSec, shown/completed/skipped/snoozed per kind }`
- Defaults: blink 5m/10s, lookaway 20m/20s (20-20-20), posture 30m/20s, move 60m/5m, rest 120m/10m.
- `validateSettings` / `sanitizeSettings`: corrupt disk data falls back to defaults (never crash).

## 2. Orchestration (A → B → C)
- Browser/demo: `setInterval 1s → tick(sched, settings, now, 1 activeSec) → ReminderEvent? → ReminderCard → handleAction → applyAction + stats`.
- Desktop (Tauri): Rust `get_idle_secs` (GetLastInputInfo) polled → `classifyActivity(prev, curr, threshold)` → activeSec → same `tick()` path → Rust `show_reminder` (emit + show, NO focus steal) → user Done/Skip/Snooze → `hide_reminder`.
- Scheduler emits max ONE event per tick; losers decay to 90% (no floods after sleep).
- Priority on collision: rest > move > posture > lookaway > blink.

## 3. Integration Points
- `src-tauri/src/lib.rs`: commands `get_idle_secs`, `show_reminder`, `hide_reminder`; tray menu (open/pause-15/quit); single-instance; autostart; store+notification plugins.
- `tauri.conf.json`: main window (920×720) + reminder window (360×420, transparent, alwaysOnTop, focus:false, hidden until due); NSIS per-user installer.
- Frontend persists settings/stats to localStorage (browser) — swapped to Tauri Store in desktop wiring (same JSON shape).

## 4. Error Strategy
- Fail-safe to defaults on bad settings; backwards clock ignored; sleep gaps clamp (≤1.5× interval per kind per tick); reminder window reused (never stacked); all reminders dismissible.

## 5. Testing Strategy (multi-pass, all executed)
- `src/lib/scheduler.test.ts` (9): blink timing, idle=0, priority, pause, snooze, done-reset, sleep-no-flood, quiet-hours-midnight, backwards-clock.
- `src/lib/core.test.ts` (7): activity classify (first/active/idle/sleep) + settings validation/sanitize.
- `src/components/components.test.tsx` (6): cartoon render ×4, card actions, dashboard pause, settings edit.
- Browser passes: Today render; break-now → 20s→18s countdown, floor 0; Done dismiss + stats; gallery ×4; settings; favicon; 0 console errors.
- `tsc --noEmit` clean; `vite build` clean. RESULT: 22/22 tests, all green.

## 6. Key Decisions (why)
- Tauri 2 over Electron: tray + transparent no-focus windows + ~600KB-class shell + WebView2 (no bundled Chromium) + macOS/Linux-portable later.
- React+TS+Vite frontend: custom SVG cartoons beat any component library for this use case.
- Pure scheduler/activity modules (no DOM/OS): deterministic unit tests with controllable clock.
- No webcam v1: privacy, reliability, weight (revisit only as opt-in later).

## 7. Acceptance Criteria (v0.1 — all met for frontend)
- [x] 22/22 tests pass, tsc clean, prod build clean, 0 browser console errors
- [x] Every reminder dismissible; countdowns tick and floor at 0
- [x] Idle/active separation tested; sleep never floods
- [ ] Tauri `cargo build` + NSIS installer (needs Rust MSVC toolchain on Windows — NOT installed here)
- [ ] Day-long soak + multi-monitor/DPI/fullscreen manual tests (needs installed app)

## 8. Next Steps
1. Install Rust + MSVC Build Tools + WebView2 SDK → `cargo tauri build` → NSIS setup.exe.
2. Wire frontend demo clock to `get_idle_secs` invoke + `blinkbreak:reminder` listener.
3. Icon set (`src-tauri/icons/`), signed installer, fullscreen-defer behavior.
4. Soak test 1 working day; multi-monitor/DPI pass.
