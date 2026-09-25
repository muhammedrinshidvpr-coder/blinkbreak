# Changelog

All notable changes to BlinkBreak are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/muhammedrinshidvpr-coder/blinkbreak/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/tag/v0.1.0
