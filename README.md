<div align="center">

# BlinkBreak

**Calm reminders to blink, look away, and move.**<br>
A small, private desktop app for long screen sessions. Windows, macOS, and Linux builds share the same calm UI.

[![Download](https://img.shields.io/badge/Download-Windows_%7C_macOS_%7C_Linux-1d1d1f?style=for-the-badge)](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest)

[![Latest release](https://img.shields.io/github/v/release/muhammedrinshidvpr-coder/blinkbreak?color=7f9f8f)](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest)
[![Build](https://github.com/muhammedrinshidvpr-coder/blinkbreak/actions/workflows/build-desktop.yml/badge.svg)](https://github.com/muhammedrinshidvpr-coder/blinkbreak/actions/workflows/build-desktop.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-7f9f8f)

<img src="docs/screenshots/blink-demo.gif" alt="A small pill at the top of the screen: an eye blinks slowly inside a thin ring that drains, then the pill fades away" width="480">

</div>

## Why BlinkBreak?

- **Private.** No internet, no account, no tracking. Nothing leaves your computer.
- **Quiet.** Reminders are designed not to take keyboard focus. Fullscreen deferral is currently supported on Windows.
- **Brief.** Every reminder leaves on its own when its time is up.

## Reminders

Each reminder is a small symbol whose motion *is* the exercise. It is timed to
fit the reminder exactly, and a thin ring shows the time left.

<p align="center">
  <img src="docs/screenshots/lookaway-demo.gif" alt="Look far away: a dot drifts out to a thin horizon line" width="300">
  &nbsp;&nbsp;
  <img src="docs/screenshots/rest-demo.gif" alt="Step away, in dark mode: a circle breathes in and out" width="300">
</p>

| Reminder | Every (active use) | For | Motion |
|---|---|---|---|
| Blink | 5 min | 10 s | an eye lowers its lid, rests, and lifts: four slow blinks |
| Look away | 20 min | 20 s | a dot drifts out to the horizon (the 20-20-20 rule) |
| Posture | 30 min | 20 s | a curved column of dots eases upright |
| Move | 60 min | 5 min | arms lift in one slow arc |
| Long rest | 2 h | 10 min | a circle breathes: in for 4 s, out for 6 s |

Windows and macOS timers count **active use only**, so they pause when you step away.
Linux uses GNOME/Mutter or freedesktop ScreenSaver idle data when available; otherwise timers count while the app is open.
**Done** records the break, **Later** snoozes it (the length is shown), and clicking
anywhere outside the card dismisses it. When time runs out, blink and look-away
count as done, because following the countdown *is* the exercise.

## Light and dark

BlinkBreak follows your system appearance by default. Choose **Settings → Appearance → Light** or **Dark** to set it yourself.

<p align="center">
  <img src="docs/screenshots/app-light.png" alt="Reminders tab in the light theme" width="49%">
  <img src="docs/screenshots/app-dark.png" alt="Settings in the dark theme" width="49%">
</p>

## Install

**New to this?** Follow the [step-by-step install guide](docs/INSTALL.md). It takes about a minute.

1. **[Download the latest installer](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest)**:
   Windows (`BlinkBreak_x.y.z_x64-setup.exe`, about 2 MB), macOS (`BlinkBreak_x.y.z_x64.dmg`
   or Apple Silicon `..._aarch64.dmg`), or Linux (`.deb` or portable `.AppImage`).
2. Run/install it. Windows needs no admin rights and installs just for you; on macOS drag
    BlinkBreak to Applications; on Linux install the `.deb` or mark the `.AppImage` executable.
    macOS release DMGs are signed and notarized. Fullscreen deferral is currently Windows-only; Linux idle sensing depends on the desktop session (see below).
3. BlinkBreak starts in your **system tray / menu bar**.
   Right-click it for **Open dashboard**, **Take a break now**, **Pause 15 min**, and **Quit**.

## FAQ

<details>
<summary><b>Windows says "Windows protected your PC". Is it safe?</b></summary>

The installer isn't code-signed yet (signing certificates cost money), so
SmartScreen doesn't recognise it. Click **More info → Run anyway**. Each
release lists a SHA-256 checksum you can compare with
`Get-FileHash .\BlinkBreak_x.y.z_x64-setup.exe`. Or build it yourself from
source; the code is short enough to read.
</details>

<details>
<summary><b>Will it interrupt my game, movie, or presentation?</b></summary>

On Windows, if a fullscreen app is in front, reminders wait until you leave
fullscreen. macOS/Linux do not have system-wide fullscreen detection yet.
Reminders are designed not to take keyboard focus, so your typing keeps going where it was.
</details>

<details>
<summary><b>How do I pause it or turn a reminder off?</b></summary>

Tray icon → **Pause 15 min**, or open the dashboard for **Pause 1h**. In
**Settings** you can switch each reminder on/off, change how often it
appears, set quiet hours, and pick light or dark.
</details>

<details>
<summary><b>Does it start at login?</b></summary>

Yes, by default, quietly in the tray / menu bar. Turn it off in **Settings → Start at login**.
</details>

<details>
<summary><b>How do I uninstall it?</b></summary>

Windows **Settings → Apps → Installed apps → BlinkBreak → Uninstall**.
On macOS delete BlinkBreak from Applications; on Linux remove the `.deb` (`sudo apt remove blinkbreak`)
or delete the `.AppImage`.
Quit it from the tray first.
</details>

<details>
<summary><b>What data does it collect?</b></summary>

None. The only thing it reads from your OS is how many seconds since your last
keyboard/mouse input (to know whether you're active). Idle sensing is supported on Windows
and macOS. On Linux it uses Mutter or freedesktop ScreenSaver D-Bus where available;
otherwise the app says so in Settings.
Settings and daily stats stay on your machine.
</details>

<details>
<summary><b>Mac or Linux limitations?</b></summary>

Both install and remind normally. Idle sensing is supported on macOS and on Linux sessions
that expose the relevant D-Bus service. System-wide fullscreen detection is only implemented
on Windows; on Linux without a supported idle service, timers count while the app is open.
Further native sensing improvements are tracked in
[issue #5](https://github.com/muhammedrinshidvpr-coder/blinkbreak/issues/5).
</details>

## Health basis

Based on the AOA 20-20-20 rule, AAO guidance on blinking and distance breaks,
and OSHA microbreak and posture guidance. BlinkBreak encourages healthy
habits; it is not a medical device.

## Build from source

Frontend only (browser demo with a simulated activity clock, no Rust needed):

```powershell
npm install
npm test        # unit + component tests
npm run lint    # TypeScript check
npm run dev     # browser demo at http://localhost:1420
```

Desktop app (needs [Rust](https://rustup.rs) stable; Windows also needs MSVC + Visual Studio C++ build tools):

```powershell
npm run tauri dev     # run the desktop app with hot reload
npm run tauri build   # Windows -> src-tauri/target/release/bundle/nsis/BlinkBreak_*_setup.exe
```

Linux needs WebKitGTK system packages first (Debian/Ubuntu):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
npm run tauri build -- --bundles deb,appimage
```

macOS:

```bash
npm run tauri build -- --bundles dmg
```

> Only one BlinkBreak can run at a time. Quit the installed copy from the tray
> before `npm run tauri dev`, or the dev build will hand over to it and exit.

Built with [Tauri 2](https://tauri.app), React, TypeScript, and Rust.

## Contributing

Ideas, bug reports, designs, and PRs are all welcome. Good places to start are
issues labelled
[`good first issue`](https://github.com/muhammedrinshidvpr-coder/blinkbreak/labels/good%20first%20issue).
See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Questions →
[Discussions](https://github.com/muhammedrinshidvpr-coder/blinkbreak/discussions).
Security reports → [SECURITY.md](SECURITY.md). What's changed →
[CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
