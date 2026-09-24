# BlinkBreak 👁️ — gentle cartoon health reminders

[![Build Windows installer](https://github.com/muhammedrinshidvpr-coder/blinkbreak/actions/workflows/build-windows.yml/badge.svg)](https://github.com/muhammedrinshidvpr-coder/blinkbreak/actions/workflows/build-windows.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

A lightweight Windows desktop app (Tauri 2 + React + Rust) that lives in the
system tray and shows **gentle, dismissible, cartoon reminders** — blink, look
away, sit well, move. Always dismissible, never blocking.

![BlinkBreak dashboard](docs/screenshots/dashboard.png)

## How reminders appear

When a reminder is due, a soft dimmed overlay covers the monitor you're using,
with a centered cartoon card. It never steals keyboard focus.

- **Done / Snooze 5m / Skip** buttons, or click outside the card, or press `Esc`.
- Every reminder **closes automatically** when its time runs out (logged as skipped).
- Fullscreen games, videos, and presentations are never interrupted —
  reminders wait politely until fullscreen ends.
- No two reminders ever stack.

![Reminder overlay](docs/screenshots/overlay.png)

## Reminders

| Reminder | Default | What you see |
|---|---|---|
| Blink | every 5 min | cartoon eye blinking slowly (auto-closes after 10s) |
| Look away | every 20 min | mountains + countdown (20-20-20 rule) |
| Posture | every 30 min | character sitting tall |
| Move | every 60 min | stretching character |
| Long rest | every 2 h | step-away suggestion |

Health basis: AOA 20-20-20 rule, AAO blink/look-away guidance, OSHA
microbreak + posture guidance. This app encourages habits; it is not a medical
device.

## Run it

Frontend demo — no Rust needed (same UI, simulated activity clock):

```powershell
npm install
npm test        # unit + component tests
npm run lint    # TypeScript check
npm run dev     # browser demo
npm run build   # typecheck + production bundle
```

Windows installer — needs Rust (stable MSVC) + Visual Studio C++ build tools:

```powershell
npm run tauri build
# -> src-tauri/target/release/bundle/nsis/BlinkBreak_*_setup.exe
```

## Start with Windows

1. Install the app and open **Settings → Start with Windows** (on by default).
2. On sign-in, BlinkBreak launches **minimized to the system tray** — no dashboard popup.
3. The tray menu offers **Open dashboard**, **Take a break now**, **Pause 15 min**,
   and **Quit**. Closing the dashboard hides it back to the tray; only Quit exits.

> The toggle writes a per-user login entry (Windows Run key) pointing at the
> installed app with a `--minimized` flag. Unchecking it removes the entry.

## Privacy

Fully local. No webcam, no keylogging, no cloud, no account, no telemetry.
The only OS signal the app reads is idle *seconds* (Win32 `GetLastInputInfo`)
to tell active use apart from idle time. Don't take our word for it — the
source is short enough to read in one sitting.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports:
[SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
