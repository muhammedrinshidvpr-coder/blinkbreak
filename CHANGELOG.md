# Changelog

All notable changes to BlinkBreak are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-09-25

A new calm design: light, warm, minimal, with a dark mode.

### Added
- **Dark mode.** Settings → Appearance → System, Light, or Dark. Reminders follow it too.
- A new symbol and motion for every reminder, each showing the exercise and timed to fit the
  reminder exactly: slow blinks, a dot drifting to the horizon, a spine easing upright,
  arms lifting, and a breathing circle (4 s in, 6 s out) for the long rest.
- Long rest has its own symbol and a "Breathe in / Breathe out" guide.
- Settings are grouped (Appearance, Reminders, Schedule, System) with switches.

### Changed
- The blink reminder is a small pill at the top center: an eye inside a thin ring, and two words.
- Overlay reminders are a smaller card on a light frost, with just **Done** and **Later**
  (the snooze length is shown). Click outside to skip.
- Shorter, calmer reminder text throughout.
- Smaller blink window, so its invisible edges no longer catch clicks meant for the app behind it.

### Fixed
- With Windows "reduce animations" on, the countdown ring emptied instantly. It now drains
  normally while other motion stops.
- The development server no longer stalls on startup (it was scanning the Rust build folder).
- Updated development tools to fix security advisories (the installed app was not affected).

## [0.1.0] - 2026-09-25

First public release.

### Added
- Tray app with five reminders: blink (every 5 min), look away / 20-20-20
  (20 min), posture (30 min), move (60 min), and long rest (2 h).
- Blink reminder as a small animated emoji at the top center of the screen
  that blinks with you and floats away on its own.
- Dimmed overlay with cartoon cards for the other reminders, with Done,
  Snooze (showing the real snooze length), and Skip.
- Every reminder closes automatically, with a native safety timer in case the
  UI fails to close it.
- Reminders never take keyboard focus and wait while a fullscreen app is open.
- Timers count active use only (pause when idle or asleep).
- Settings: per-reminder on/off and interval, quiet hours, reduced motion,
  start with Windows (minimized to tray).
- Local-only daily stats. No network, accounts, or telemetry.

[Unreleased]: https://github.com/muhammedrinshidvpr-coder/blinkbreak/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/muhammedrinshidvpr-coder/blinkbreak/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/tag/v0.1.0
