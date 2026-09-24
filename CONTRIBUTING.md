# Contributing to BlinkBreak

Thanks for stopping by. Small, focused PRs are the easiest to review and merge.

## Quick start

```powershell
npm install
npm test        # unit + component tests (must stay green)
npm run lint    # TypeScript check (must stay clean)
npm run dev     # browser demo — same UI, simulated activity clock
npm run build   # typecheck + production bundle
```

The Windows installer needs Rust (stable, MSVC target) plus the
Visual Studio C++ build tools, then:

```powershell
npm run tauri build
# -> src-tauri/target/release/bundle/nsis/BlinkBreak_*_setup.exe
```

## Ground rules

- **Always gentle, never blocking.** Every reminder must be dismissible and
  must never steal keyboard focus. This is the project's core promise — PRs
  that break it won't merge.
- **Local-only.** No network calls, no telemetry, no accounts. If your change
  needs the network, it needs a discussion first (open an issue).
- **Tests for behavior.** Bug fixes and features should include or update a
  test that fails without the change (`npm test`).
- **Keep it small.** One concern per PR. Pure scheduler/activity logic lives
  in `src/lib/` precisely so it stays unit-testable without a screen or OS.

## Project layout

| Path | What lives there |
|---|---|
| `src/lib/` | Pure logic: scheduler, activity classification, types, Tauri bridge |
| `src/components/` | UI: overlay, reminder card, cartoons, dashboard, settings |
| `src-tauri/src/lib.rs` | Native shell: tray, idle time, overlay window, fullscreen check |
| `.github/workflows/` | CI: tests on every push, NSIS installer build on `master` |

## Release flow

Pushes to `master` run CI (tests, then the Windows installer build) and the
installer is uploaded as a workflow artifact. Versioned GitHub Releases are
cut manually from a green `master`.
