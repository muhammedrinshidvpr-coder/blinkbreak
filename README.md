<div align="center">

# BlinkBreak 👁️

**Gentle cartoon reminders to blink, look away, and move.**<br>
A tiny, private Windows tray app for long screen sessions.

[![Download for Windows](https://img.shields.io/badge/Download-Windows%20installer-2aa8a0?style=for-the-badge&logo=windows)](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest)

[![Latest release](https://img.shields.io/github/v/release/muhammedrinshidvpr-coder/blinkbreak)](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest)
[![Build](https://github.com/muhammedrinshidvpr-coder/blinkbreak/actions/workflows/build-windows.yml/badge.svg)](https://github.com/muhammedrinshidvpr-coder/blinkbreak/actions/workflows/build-windows.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Windows 10 | 11](https://img.shields.io/badge/Windows-10%20%7C%2011-0078d4)

<img src="docs/screenshots/blink-demo.gif" alt="The blink reminder drops in at the top of the screen, blinks slowly, counts down, and floats away" width="520">

</div>

## Why BlinkBreak?

- 🔒 **Private by design.** No internet, no account, no tracking. Nothing ever leaves your PC.
- 🤫 **Never gets in your way.** Reminders don't steal your typing, and they wait while you're in a fullscreen game, video, or presentation.
- ⏱️ **Closes by itself.** Every reminder leaves on its own when its time is up. There's nothing to click away.

## What it reminds you to do

<img src="docs/screenshots/cartoons.png" alt="Cartoon reminders: blink, look away, posture reset, move and stretch" width="100%">

| Reminder | Every (active use) | Shown for | Looks like |
|---|---|---|---|
| 👁️ Blink | 5 min | 10 s | a little emoji at the top center that blinks with you |
| 🏔️ Look away | 20 min | 20 s (the 20-20-20 rule) | overlay with mountains and a countdown |
| 🪑 Posture | 30 min | 20 s | overlay with a character sitting tall |
| 🤸 Move | 60 min | 5 min | overlay with a stretching character |
| ☕ Long rest | 2 h | 10 min | overlay suggesting a proper break |

Timers count **active use only**, so they pause when you step away or your PC
sleeps. Every interval, quiet hours, reduced motion, and start-with-Windows
can be changed in **Settings**.

The overlay reminders gently dim the monitor you're using:

<img src="docs/screenshots/overlay.png" alt="Look-away reminder overlay with Done, Snooze 10m and Skip buttons" width="720">

**Done** records the break, **Snooze** shows its real length (10m, 15m, 30m…),
and **Skip** (or clicking outside the card) dismisses it. When time runs out,
blink and look-away count as done (following the countdown *is* the exercise).
The others count as skipped.

## Install

1. **[Download the latest installer](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest)**
   (`BlinkBreak_x.y.z_x64-setup.exe`, about 2 MB).
2. Run it. No admin rights needed; it installs just for you.
3. BlinkBreak starts in your **system tray** (bottom right, maybe under the ^ arrow).
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

No. If a fullscreen app is in front, reminders wait until you leave
fullscreen. Reminders also never take keyboard focus, so your typing keeps
going where it was.
</details>

<details>
<summary><b>How do I pause it or turn a reminder off?</b></summary>

Tray icon → **Pause 15 min**, or open the dashboard for **Pause 1h**. In
**Settings** you can switch each reminder on/off, change how often it
appears, and set quiet hours.
</details>

<details>
<summary><b>Does it start with Windows?</b></summary>

Yes, by default, quietly in the tray. Turn it off in **Settings → Start with Windows**.
</details>

<details>
<summary><b>How do I uninstall it?</b></summary>

Windows **Settings → Apps → Installed apps → BlinkBreak → Uninstall**.
Quit it from the tray first.
</details>

<details>
<summary><b>What data does it collect?</b></summary>

None. The only thing it reads from Windows is how many seconds since your last
keyboard/mouse input (to know whether you're active). Settings and daily stats
stay on your machine.
</details>

<details>
<summary><b>Mac or Linux?</b></summary>

Not yet. It's Windows-only today. Follow or help with
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

Desktop app (needs [Rust](https://rustup.rs) stable MSVC + Visual Studio C++ build tools):

```powershell
npm run tauri dev     # run the desktop app with hot reload
npm run tauri build   # -> src-tauri/target/release/bundle/nsis/BlinkBreak_*_setup.exe
```

> Only one BlinkBreak can run at a time. Quit the installed copy from the tray
> before `npm run tauri dev`, or the dev build will hand over to it and exit.

Built with [Tauri 2](https://tauri.app), React, TypeScript, and Rust.

## Contributing

Ideas, bug reports, cartoons, and PRs are all welcome. Good places to start are
issues labelled
[`good first issue`](https://github.com/muhammedrinshidvpr-coder/blinkbreak/labels/good%20first%20issue).
See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Questions →
[Discussions](https://github.com/muhammedrinshidvpr-coder/blinkbreak/discussions).
Security reports → [SECURITY.md](SECURITY.md). What's changed →
[CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
