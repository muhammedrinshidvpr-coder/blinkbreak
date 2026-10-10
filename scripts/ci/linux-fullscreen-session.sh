#!/usr/bin/env bash
# Usage (inside Xvfb and a D-Bus session): linux-fullscreen-session.sh <blinkbreak-binary> <shots-dir>
# Starts GNOME's window manager (mutter, X11) and BlinkBreak, then asks the running BlinkBreak
# for a break twice: on the plain desktop, and over a fullscreen xterm. Fails unless the break
# window is mapped both times and, the second time, stacked above the xterm.
set -euo pipefail

binary=$1
shots=$2

fail() {
  echo "::error::$*" >&2
  echo "--- window tree ---"
  xwininfo -root -tree 2>/dev/null | grep -E '"|has [0-9]+ child' | head -40 || true
  echo "--- BlinkBreak log ---"
  cat "$shots/blinkbreak.log" 2>/dev/null || true
  exit 1
}

# find_window <xdotool search args...>: prints the first matching window id, waiting up to 10 s.
find_window() {
  local id
  for _ in $(seq 20); do
    id=$(xdotool search "$@" 2>/dev/null | head -n1 || true)
    if [ -n "$id" ]; then
      echo "$id"
      return
    fi
    sleep 0.5
  done
}

# Prints where window $1 sits in the window manager's stacking list (1 = bottom).
stacking_position() {
  local position=0 id
  for id in $(xprop -root _NET_CLIENT_LIST_STACKING | sed 's/.*# //; s/,/ /g'); do
    position=$((position + 1))
    if [ "$((id))" -eq "$1" ]; then
      echo "$position"
      return
    fi
  done
}

# Asks the running BlinkBreak for a break and prints the visible break window's id.
break_now() {
  "$binary" --break-now >>"$shots/break-now.log" 2>&1
  find_window --onlyvisible --name 'BlinkBreak reminder'
}

mutter --replace --x11 >"$shots/mutter.log" 2>&1 &
for _ in $(seq 20); do
  if xprop -root _NET_SUPPORTING_WM_CHECK 2>/dev/null | grep -q 'window id'; then break; fi
  sleep 0.5
done
if ! xprop -root _NET_SUPPORTING_WM_CHECK 2>/dev/null | grep -q 'window id'; then
  cat "$shots/mutter.log"
  fail "mutter did not start"
fi
echo "mutter is managing the display"

"$binary" >"$shots/blinkbreak.log" 2>&1 &
sleep 10

# 1. A break on the plain desktop: proves --break-now reaches the running app.
reminder=$(break_now)
sleep 3
import -window root "$shots/linux-1-break-on-desktop.png"
[ -n "$reminder" ] || fail "no visible break window after --break-now on the desktop"
echo "Break window on the desktop: $(xprop -id "$reminder" _NET_WM_WINDOW_TYPE)"
# Look-away lasts 20 s; wait for it to finish before asking again.
sleep 25

# 2. A break over a fullscreen window.
xterm -fullscreen -bg firebrick -title 'Fullscreen test' &
fullscreen=$(find_window --class xterm)
[ -n "$fullscreen" ] || fail "the test xterm never appeared"
sleep 3
state=$(xprop -id "$fullscreen" _NET_WM_STATE)
echo "xterm $state"
grep -q _NET_WM_STATE_FULLSCREEN <<<"$state" || fail "the test xterm did not go fullscreen"
import -window root "$shots/linux-2-fullscreen.png"

reminder=$(break_now)
sleep 3
import -window root "$shots/linux-3-break-over-fullscreen.png"
[ -n "$reminder" ] || fail "no visible break window after --break-now over the fullscreen xterm"

fullscreen_at=$(stacking_position "$fullscreen")
reminder_at=$(stacking_position "$reminder")
echo "Stacking (1 = bottom): fullscreen xterm at ${fullscreen_at:-missing}, break window at ${reminder_at:-missing}"
[ -n "$fullscreen_at" ] && [ -n "$reminder_at" ] || fail "a window is missing from the stacking list"
[ "$reminder_at" -gt "$fullscreen_at" ] || fail "the break window is below the fullscreen xterm"
echo "OK: the break window is above the fullscreen window"
