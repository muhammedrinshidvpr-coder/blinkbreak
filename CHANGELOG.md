# Changelog

All notable changes to BlinkBreak are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- Fixed duplicate system tray icons where one icon showed the logo without a menu and a second blank icon held the menu.

## [0.7.0] - 2026-10-15

Gentle sounds that help you notice a reminder and know when a break is over.

### Added
- **Sound** settings with Soft bell, Wooden tap, and Airy tone, a volume slider, and
  separate Start and End preview buttons. All sounds are synthesized offline.
- An optional **End-of-break cue** when the countdown naturally finishes, so you can
  look away without watching the timer. Manual completion, dismissal, and snoozing
  stay silent.
- A brief, clear single-note cue when a blink reminder appears, plus a Blink preview
  button. It follows the existing sound setting and volume and has no end cue.
- A simple [download page](https://rinshidvp.github.io/blinkbreak/) explaining the
  app, with clearly labeled Windows, Mac, and Linux downloads and installation help.

### Changed
- The optional break chime now lives in Settings → Sound. Existing sound and reminder
  preferences are preserved; sound remains off by default.
- Blink cues have a stronger output and a short held note so they are easier to
  notice on laptop speakers. The volume slider still controls them; other break
  sounds keep their original level.

## [0.6.0] - 2026-10-10

Strict mode: breaks that don't wait for fullscreen apps.

### Added
- **Strict mode** (Settings → Fullscreen, off by default): breaks show even over fullscreen
  videos, games, and presentations instead of waiting, and you can still close them. Works on
  Windows, macOS, and Linux X11 desktops such as GNOME on Xorg. Wayland desktops don't let apps
  cover fullscreen windows, and Settings says so.
- `blinkbreak --break-now` starts a break in the running app, so you can bind it to a keyboard
  shortcut.
- CI now opens a real fullscreen window on Windows, macOS, and Linux and checks that the break
  appears above it.

### Changed
- A break you start yourself (**Take a break**, the tray menu, or `--break-now`) shows right
  away, even over a fullscreen app.

### Fixed
- On macOS, breaks now gently dim what's behind them, as on Windows and Linux. Before, the
  backdrop was solid, and the blink reminder showed as a white box instead of a small pill.

### Security
- Updated a build-time dependency (`source-map-js`) with a denial-of-service advisory. It is not
  part of the installed app.

## [0.5.0] - 2026-10-10

BlinkBreak now runs on macOS and Linux as well as Windows.

### Added
- **macOS** downloads for Apple Silicon (`BlinkBreak-Mac-AppleSilicon.dmg`) and Intel
  (`BlinkBreak-Mac-Intel.dmg`) Macs.
- **Linux** downloads as a Debian/Ubuntu package (`BlinkBreak-Linux.deb`) and a portable
  `BlinkBreak-Linux.AppImage`.
- The README and install guide link straight to the newest download for each computer.
- Active-use timing on macOS, and on Linux desktops that report idle time over D-Bus
  (GNOME/Mutter or freedesktop ScreenSaver).
- Settings and the Story tab say plainly what the current computer supports, such as
  fullscreen deferral being Windows-only for now.
- Every build is now installed and launched on Windows, macOS, and Linux in CI before it
  is published.

### Changed
- Downloads have plain names that say which computer they are for, such as
  `BlinkBreak-Windows-Setup.exe`, instead of version and CPU codes.
- **Start with Windows** is now **Start at login**, available on every platform.

### Fixed
- A new install now really starts at login, as the setting always said. Before, it stayed off
  until you switched it on yourself. Existing installs keep whatever you chose.
- On macOS, clicking BlinkBreak in the Dock brings the dashboard back after you close it.

### Known limitations
- The Mac app isn't notarized by Apple yet. The first time you open it, approve it once in
  **System Settings → Privacy & Security → Open Anyway**.
- Fullscreen deferral is Windows-only. On Linux desktops without a supported idle service,
  timers count while the app is open.

## [0.4.0] - 2026-09-30

A calmer study rhythm: related reminders no longer pile up, and the app now explains
how its screen-health routine works.

### Added
- A **Story** tab that follows a focused session from blinking and distance breaks through
  posture, movement, and a longer rest.
- Clear in-app explanations of active-use timing, interruption protections, local-only
  privacy, and the limits of the app's health guidance.

### Changed
- When several reminders become due together, BlinkBreak shows the highest-priority break
  and treats the other due reminders as covered instead of building a backlog.
- Automatic reminders now have at least five minutes of active computer use between them.
- The dashboard's next-reminder estimate includes that quiet spacing and resolves ties using
  the same health priority as the scheduler.

### Fixed
- A reminder deferred by fullscreen mode no longer freezes the other reminder timers; a more
  important break can replace it while it waits.
- Deferred reminders now continue to respect a newly started pause or quiet hours.

## [0.3.0] - 2026-09-26

A polish release: easier to read, easier to use with a keyboard, and calmer motion.

### Added
- **Soft chime** for big breaks (off by default). Settings → Reminders.
- The dashboard leads with your next reminder and says clearly when reminders are paused,
  in quiet hours, or all turned off.
- **Preview** plays the real reminder without counting toward your stats or moving the schedule.

### Changed
- Easier-to-read text: secondary text now meets 4.5:1 contrast in light and dark.
- Choice controls slide to your pick, and the theme picker works with the arrow keys.
- One motion setting: BlinkBreak calms its motion when either its own setting or Windows
  "reduce animations" is on. Reminders fade out instead of vanishing.
- Gallery symbols stay still until you hover them.
- The interval box lets you finish typing, then keeps the value between 1 and 480 minutes.
- "Start with Windows" waits for Windows to confirm and tells you if it fails. Reset keeps it.

### Fixed
- The blink reminder no longer shows a dark rectangle around the pill.
- The countdown ring and the reminder's closing time now always match.
- Reminder buttons work with the keyboard, and focus returns where it was afterward.

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

[Unreleased]: https://github.com/rinshidvp/blinkbreak/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/rinshidvp/blinkbreak/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/rinshidvp/blinkbreak/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/rinshidvp/blinkbreak/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/rinshidvp/blinkbreak/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/rinshidvp/blinkbreak/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/rinshidvp/blinkbreak/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rinshidvp/blinkbreak/releases/tag/v0.1.0
