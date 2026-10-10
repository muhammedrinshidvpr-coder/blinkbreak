#!/usr/bin/env bash
# Usage (inside Xvfb and a D-Bus session): linux-fullscreen-session.sh <blinkbreak-binary> <shots-dir>
# Starts GNOME's window manager (mutter, X11), BlinkBreak, and a fullscreen xterm, asks the
# running BlinkBreak for a break, and fails unless the break window is stacked above the xterm.
set -euo pipefail

binary=$1
shots=$2

fail() {
  echo "::error::$*" >&2
  exit 1
}

# Prints the window id of the first visible window titled $1, waiting up to 10 s.
find_window() {
  local id
  for _ in $(seq 20); do
    id=$(xdotool search --onlyvisible --name "$1" 2>/dev/null | head -n1 || true)
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

xterm -fullscreen -bg firebrick -title 'Fullscreen test' &
fullscreen=$(find_window 'Fullscreen test')
[ -n "$fullscreen" ] || fail "the test xterm never appeared"
sleep 3
state=$(xprop -id "$fullscreen" _NET_WM_STATE)
echo "xterm $state"
grep -q _NET_WM_STATE_FULLSCREEN <<<"$state" || fail "the test xterm did not go fullscreen"
import -window root "$shots/linux-1-fullscreen.png"

"$binary" --break-now
sleep 5
import -window root "$shots/linux-2-break-over-fullscreen.png"
reminder=$(find_window 'BlinkBreak reminder')
if [ -z "$reminder" ]; then
  cat "$shots/blinkbreak.log"
  fail "no visible break window after --break-now"
fi
xprop -id "$reminder" _NET_WM_WINDOW_TYPE

fullscreen_at=$(stacking_position "$fullscreen")
reminder_at=$(stacking_position "$reminder")
echo "Stacking (1 = bottom): fullscreen xterm at ${fullscreen_at:-missing}, break window at ${reminder_at:-missing}"
[ -n "$fullscreen_at" ] && [ -n "$reminder_at" ] || fail "a window is missing from the stacking list"
[ "$reminder_at" -gt "$fullscreen_at" ] || fail "the break window is below the fullscreen xterm"
echo "OK: the break window is above the fullscreen window"
