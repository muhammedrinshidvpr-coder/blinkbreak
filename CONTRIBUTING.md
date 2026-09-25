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
| `src/lib/` | Pure logic: scheduler, activity classification, motion timeline, theme, types, Tauri bridge |
| `src/components/` | UI: blink toast, overlay, reminder card, symbols, dashboard, settings |
| `src-tauri/src/lib.rs` | Native shell: tray, idle time, reminder window + close watchdog, fullscreen check |
| `.github/workflows/` | CI on every push and PR; `release.yml` publishes installers for version tags |
| `scripts/release-notes.mjs` | Builds release notes from `CHANGELOG.md` + installer checksums |

## Release flow

Every push to `master` and every pull request runs the tests and builds the
Windows installer (uploaded as a workflow artifact).

To publish a release:

1. Bump `version` in `package.json`, `src-tauri/tauri.conf.json`, and
   `src-tauri/Cargo.toml` (all three must match).
2. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [0.2.0] - YYYY-MM-DD`
   (add a fresh empty `## [Unreleased]` above it) and update the links at the bottom.
3. Commit, then tag and push: `git tag v0.2.0 && git push origin v0.2.0`.
4. `release.yml` checks the tag matches the app version, runs the tests, builds
   the installer, and publishes a GitHub Release. The notes are that version's
   CHANGELOG section plus install help and a `SHA256SUMS.txt` checksum.

Please add a line under `## [Unreleased]` in `CHANGELOG.md` for any
user-visible change in your PR.
