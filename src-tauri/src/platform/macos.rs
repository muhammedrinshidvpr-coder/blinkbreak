//! macOS idle sensing through Quartz. This queries the aggregate time since
//! the last input event; it does not install an event tap or inspect input.
//! Fullscreen detection remains unavailable without Accessibility access.

use super::PlatformCapabilities;
use objc2::{msg_send, runtime::AnyObject};

const COMBINED_SESSION_STATE: u32 = 0;
const ANY_INPUT_EVENT_TYPE: u32 = u32::MAX;

// NSWindowCollectionBehavior bits: show in every Space, including other apps' fullscreen Spaces.
const CAN_JOIN_ALL_SPACES: usize = 1 << 0;
const FULL_SCREEN_AUXILIARY: usize = 1 << 8;
const OVER_FULLSCREEN_BEHAVIOR: usize = CAN_JOIN_ALL_SPACES | FULL_SCREEN_AUXILIARY;
/// NSFloatingWindowLevel: what `alwaysOnTop` gives the reminder by default.
const FLOATING_WINDOW_LEVEL: isize = 3;
/// NSStatusWindowLevel: above fullscreen apps and the menu bar.
const STATUS_WINDOW_LEVEL: isize = 25;

#[link(name = "CoreGraphics", kind = "framework")]
unsafe extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(state_id: u32, event_type: u32) -> f64;
}

fn seconds_to_idle(seconds: f64) -> Option<u64> {
    (seconds.is_finite() && seconds >= 0.0).then(|| seconds.floor() as u64)
}

pub fn idle_secs() -> Option<u64> {
    let seconds = unsafe {
        CGEventSourceSecondsSinceLastEventType(COMBINED_SESSION_STATE, ANY_INPUT_EVENT_TYPE)
    };
    seconds_to_idle(seconds)
}

pub fn fullscreen_active() -> bool {
    false
}

/// Strict mode: lets the hidden reminder join the active Space, including another app's
/// fullscreen Space, above its windows. Must run before the window is shown, or macOS keeps
/// it in the Space it was shown in. `false` restores the gentle default, where a reminder
/// stays on the desktop Space and doesn't cover a fullscreen app.
pub fn set_over_fullscreen(window: &tauri::WebviewWindow, enabled: bool) {
    let window_for_main = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(ns_window) = window_for_main.ns_window() else {
            return;
        };
        unsafe {
            let ns_window = &*(ns_window as *const AnyObject);
            let behavior: usize = msg_send![ns_window, collectionBehavior];
            let (behavior, level) = if enabled {
                (behavior | OVER_FULLSCREEN_BEHAVIOR, STATUS_WINDOW_LEVEL)
            } else {
                (behavior & !OVER_FULLSCREEN_BEHAVIOR, FLOATING_WINDOW_LEVEL)
            };
            let _: () = msg_send![ns_window, setCollectionBehavior: behavior];
            let _: () = msg_send![ns_window, setLevel: level];
        }
    });
}

pub fn capabilities() -> PlatformCapabilities {
    PlatformCapabilities {
        platform: "macos".to_string(),
        idle_supported: idle_secs().is_some(),
        fullscreen_supported: false,
        over_fullscreen_supported: true,
    }
}

#[cfg(test)]
mod tests {
    use super::seconds_to_idle;

    #[test]
    fn idle_seconds_rejects_invalid_quartz_values() {
        assert_eq!(seconds_to_idle(10.9), Some(10));
        assert_eq!(seconds_to_idle(0.0), Some(0));
        assert_eq!(seconds_to_idle(-1.0), None);
        assert_eq!(seconds_to_idle(f64::NAN), None);
        assert_eq!(seconds_to_idle(f64::INFINITY), None);
    }
}
