#!/usr/bin/env bash
# Usage: scripts/smoke-test.sh <bundle-dir>
# CI smoke test for the installers in <bundle-dir> (src-tauri/target/release/bundle):
# installs each one the way a user would, launches BlinkBreak, and fails if it exits
# or panics within SMOKE_SECONDS (default 20).
# macOS also checks the DMG layout, CPU architecture, and code signature:
# SMOKE_MACOS_SIGNING=adhoc (default) expects an ad-hoc signature, =notarized expects
# Gatekeeper to accept the app with a stapled notarization ticket.
# It installs packages and kills BlinkBreak processes, so run it on CI runners only.
set -euo pipefail

bundle_dir=${1:?usage: smoke-test.sh <bundle-dir>}
seconds=${SMOKE_SECONDS:-20}
work=$(mktemp -d)
shopt -s nullglob

# Errors go to stderr so they still show when raised inside $(...).
fail() {
  echo "::error::$*" >&2
  exit 1
}

# only_file <description> <files...>: prints the single match, or fails.
only_file() {
  local description=$1
  shift
  [ "$#" -eq 1 ] || fail "expected exactly one $description, found $#: $*"
  echo "$1"
}

stop_app() {
  local pid=$1 process=$2
  case "$(uname -s)" in
    MINGW* | MSYS* | CYGWIN*) taskkill /F /IM "$process" >/dev/null 2>&1 || true ;;
    *) pkill -x "$process" 2>/dev/null || true ;;
  esac
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

# expect_running <label> <process-name> <command...>
expect_running() {
  local label=$1 process=$2
  shift 2
  local log="$work/$label.log" alive=1
  echo "Launching $label: $*"
  "$@" >"$log" 2>&1 &
  local pid=$!
  sleep "$seconds"
  kill -0 "$pid" 2>/dev/null || alive=0
  stop_app "$pid" "$process"
  echo "--- $label output ---"
  cat "$log"
  echo "--- end of $label output ---"
  [ "$alive" -eq 1 ] || fail "$label exited within ${seconds}s"
  if grep -qi 'panicked' "$log"; then fail "$label panicked"; fi
  echo "OK: $label kept running for ${seconds}s"
}

smoke_macos() {
  local dmg mount="$work/mnt" app="$work/BlinkBreak.app"
  dmg=$(only_file ".dmg" "$bundle_dir"/dmg/*.dmg)

  local machine dmg_arch
  machine=$(uname -m)
  case "$machine" in
    arm64) dmg_arch=aarch64 ;;
    x86_64) dmg_arch=x64 ;;
    *) fail "unexpected macOS architecture $machine" ;;
  esac
  [[ "$(basename "$dmg")" == *"_${dmg_arch}.dmg" ]] || fail "$(basename "$dmg") is not named for $dmg_arch"

  mkdir -p "$mount"
  hdiutil attach "$dmg" -nobrowse -readonly -mountpoint "$mount" >/dev/null
  [ -L "$mount/Applications" ] || fail "DMG has no Applications shortcut to drag onto"
  local mounted_app
  mounted_app=$(only_file ".app in the DMG" "$mount"/*.app)
  ditto "$mounted_app" "$app"
  hdiutil detach "$mount" >/dev/null

  local executable binary
  executable=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$app/Contents/Info.plist")
  binary="$app/Contents/MacOS/$executable"
  file "$binary"
  [[ " $(lipo -archs "$binary") " == *" $machine "* ]] || fail "$executable is not built for $machine"

  codesign --verify --deep --strict --verbose=2 "$app"
  local signature
  signature=$(codesign --display --verbose=4 "$app" 2>&1)
  echo "$signature"
  case "${SMOKE_MACOS_SIGNING:-adhoc}" in
    adhoc) grep -q '^Signature=adhoc' <<<"$signature" || fail "expected an ad-hoc signature" ;;
    notarized)
      spctl --assess --type execute --verbose=4 "$app"
      xcrun stapler validate "$app"
      ;;
    *) fail "unknown SMOKE_MACOS_SIGNING=${SMOKE_MACOS_SIGNING}" ;;
  esac

  expect_running macos-app "$executable" "$binary"
}

smoke_linux() {
  local deb appimage
  deb=$(only_file ".deb" "$bundle_dir"/deb/*.deb)
  appimage=$(only_file ".AppImage" "$bundle_dir"/appimage/*.AppImage)

  sudo apt-get install -y xvfb >/dev/null
  dpkg-deb --info "$deb"
  local package installed binary
  package=$(dpkg-deb --field "$deb" Package)
  sudo apt-get install -y "$(realpath "$deb")"
  installed=$(dpkg -L "$package")
  binary=$(grep -m1 '^/usr/bin/' <<<"$installed") || fail "$package installs nothing in /usr/bin"
  grep -q '\.desktop$' <<<"$installed" || fail "$package has no .desktop launcher"

  # Each launch gets its own display and session bus, as a fresh login would.
  expect_running linux-deb "$(basename "$binary")" dbus-run-session -- xvfb-run -a "$binary"

  file "$appimage"
  chmod +x "$appimage"
  # Extract-and-run avoids needing FUSE on the runner; the bundled app is unchanged.
  expect_running linux-appimage "$(basename "$binary")" \
    dbus-run-session -- xvfb-run -a "$(realpath "$appimage")" --appimage-extract-and-run

  sudo apt-get remove -y "$package" >/dev/null
}

smoke_windows() {
  # Keep Git Bash from rewriting /S and /F into drive paths.
  export MSYS_NO_PATHCONV=1
  local installer local_app_data exe
  installer=$(only_file "NSIS installer" "$bundle_dir"/nsis/*-setup.exe)
  "$installer" /S
  local_app_data=$(cygpath -u "$LOCALAPPDATA")
  exe=$(find "$local_app_data" -maxdepth 3 -iname 'blinkbreak.exe' -print -quit)
  [ -n "$exe" ] || fail "the installer did not install BlinkBreak.exe under $LOCALAPPDATA"
  echo "Installed to $exe"
  expect_running windows-app "$(basename "$exe")" "$exe"
}

case "$(uname -s)" in
  Darwin) smoke_macos ;;
  Linux) smoke_linux ;;
  MINGW* | MSYS* | CYGWIN*) smoke_windows ;;
  *) fail "unsupported OS $(uname -s)" ;;
esac
