# Security Policy

## Reporting a vulnerability

BlinkBreak is a local-only desktop app with no servers, accounts, or network
calls — but the codebase still touches the OS (tray, autostart, idle time,
fullscreen detection), so reports are welcome.

- **Do not open a public issue** for a suspected vulnerability.
- Preferred: use GitHub's private
  [**Report a vulnerability**](https://github.com/muhammedrinshidvpr-coder/blinkbreak/security/advisories/new)
  form (Security tab). Only maintainers can see it.
- Or email **muhammedrinshidvpr@gmail.com** with a description and, if
  possible, steps to reproduce.
- You can expect an acknowledgement within a few days and a fix or mitigation
  plan as soon as reasonably possible.

## Scope

- In scope: the Tauri shell (`src-tauri/`), the frontend (`src/`), build and
  release workflows (`.github/workflows/`).
- Out of scope: social engineering, physical access to a machine, and issues
  in upstream dependencies (report those upstream, but a heads-up is
  appreciated).

## Privacy note

BlinkBreak intentionally collects nothing: no telemetry, no crash reporting,
no accounts, no network requests. The only OS signal it reads is idle seconds
(via Win32 `GetLastInputInfo`) to tell active use apart from idle time.
