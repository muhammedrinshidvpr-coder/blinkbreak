# BlinkBreak 👁️ — gentle cartoon health reminders

A lightweight Windows desktop app (Tauri 2 + React + Rust) that runs in the system tray and shows **gentle, dismissible, cartoon** reminders:

| Reminder | Default | What you see |
|---|---|---|
| Blink | every 5 min | cartoon eye blinking slowly (auto-closes) |
| Look away | every 20 min | mountains + 20s countdown (20-20-20 rule) |
| Posture | every 30 min | character sitting tall |
| Move | every 60 min | stretching character |
| Long rest | every 2 h | walk-away suggestion |

Health basis: AOA 20-20-20 rule, AAO blink/look-away guidance, OSHA microbreak + posture guidance.

## Run (frontend demo — no Rust needed)

```powershell
npm install
npm test        # unit + visual tests, multi-pass
npm run dev     # demo clock: 1 real second = 1 active minute
npm run build   # typecheck + production bundle
```

## Build the Windows installer (needs Rust + MSVC + WebView2)

```powershell
npm run tauri build   # -> src-tauri/target/release/bundle/nsis/BlinkBreak_*_setup.exe
```

Native shell (`src-tauri/src/lib.rs`): single instance, tray menu, `get_idle_secs` via Win32 `GetLastInputInfo`, focus-free reminder window, autostart plugin.

## Privacy

Fully local. No webcam, no keylogging, no cloud, no account. Only idle *seconds* are read from Windows.
