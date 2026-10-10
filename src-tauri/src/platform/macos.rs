//! macOS idle sensing through Quartz. This queries the aggregate time since
//! the last input event; it does not install an event tap or inspect input.
//! Fullscreen detection remains unavailable without Accessibility access.

use std::sync::{
    atomic::{AtomicBool, Ordering},
    OnceLock,
};

use super::PlatformCapabilities;
use objc2::{
    msg_send,
    runtime::{AnyClass, AnyObject, Bool, ClassBuilder, Sel},
    sel,
};
use tauri::{ActivationPolicy, Manager};

const COMBINED_SESSION_STATE: u32 = 0;
const ANY_INPUT_EVENT_TYPE: u32 = u32::MAX;

// NSWindowCollectionBehavior bits: show in every Space and app, including other apps'
// fullscreen Spaces, without sliding along when Spaces switch.
const CAN_JOIN_ALL_SPACES: usize = 1 << 0;
const STATIONARY: usize = 1 << 4;
const FULL_SCREEN_AUXILIARY: usize = 1 << 8;
const CAN_JOIN_ALL_APPLICATIONS: usize = 1 << 18;
const OVER_FULLSCREEN_BEHAVIOR: usize =
    CAN_JOIN_ALL_SPACES | STATIONARY | FULL_SCREEN_AUXILIARY | CAN_JOIN_ALL_APPLICATIONS;
/// NSWindowStyleMaskNonactivatingPanel: showing or clicking the panel never activates BlinkBreak.
const NONACTIVATING_PANEL: usize = 1 << 7;
/// NSFloatingWindowLevel: what `alwaysOnTop` gives the reminder by default.
const FLOATING_WINDOW_LEVEL: isize = 3;
/// NSScreenSaverWindowLevel: the floating and status levels both sit below fullscreen content.
const SCREEN_SAVER_WINDOW_LEVEL: isize = 1000;

/// True while a strict reminder runs BlinkBreak as an accessory (menu-bar) app.
static ACCESSORY_FOR_REMINDER: AtomicBool = AtomicBool::new(false);

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

/// NSPanel subclass the reminder window turns into for strict mode. Like Tao's window class
/// for this unfocusable window, it never becomes the key or main window.
fn reminder_panel_class() -> Option<&'static AnyClass> {
    static CLASS: OnceLock<Option<&'static AnyClass>> = OnceLock::new();
    *CLASS.get_or_init(|| {
        extern "C-unwind" fn refuse(_this: &AnyObject, _sel: Sel) -> Bool {
            Bool::NO
        }
        let mut builder =
            ClassBuilder::new(c"BlinkBreakReminderPanel", AnyClass::get(c"NSPanel")?)?;
        unsafe {
            builder.add_method(
                sel!(canBecomeKeyWindow),
                refuse as extern "C-unwind" fn(_, _) -> _,
            );
            builder.add_method(
                sel!(canBecomeMainWindow),
                refuse as extern "C-unwind" fn(_, _) -> _,
            );
        }
        Some(builder.register())
    })
}

/// Turns the reminder window into a non-activating panel, once. macOS only shows panels like
/// this above another app's fullscreen Space, and ordering a plain window front can activate
/// BlinkBreak and pull the person out of fullscreen. Returns false if it can't safely do so.
///
/// # Safety
/// `ns_window` must be the reminder's NSWindow, used on the main thread.
unsafe fn make_reminder_panel(ns_window: &AnyObject) -> bool {
    let Some(panel_class) = reminder_panel_class() else {
        return false;
    };
    let current_class = ns_window.class();
    if current_class != panel_class {
        // Swapping the class reuses this object's memory, so the panel must not need more of it.
        if panel_class.instance_size() > current_class.instance_size() {
            return false;
        }
        unsafe {
            objc2::ffi::object_setClass(
                ns_window as *const AnyObject as *mut AnyObject,
                panel_class,
            );
            let mask: usize = msg_send![ns_window, styleMask];
            let _: () = msg_send![ns_window, setStyleMask: mask | NONACTIVATING_PANEL];
            let _: () = msg_send![ns_window, setHidesOnDeactivate: Bool::NO];
        }
    }
    true
}

/// Strict mode: lets the reminder join the active Space, including another app's fullscreen
/// Space, above its windows. Call it right before showing the window. `false` restores the
/// gentle default, where a reminder stays on the desktop Space and doesn't cover a fullscreen app.
///
/// Apple's recipe for this needs all of: an accessory (menu-bar) app, a non-activating panel,
/// the screen-saver level, and these collection behaviors. A strict reminder therefore runs
/// BlinkBreak as an accessory app while it is showing; `reminder_hidden` switches it back.
pub fn set_over_fullscreen(window: &tauri::WebviewWindow, enabled: bool) {
    if enabled {
        ACCESSORY_FOR_REMINDER.store(true, Ordering::SeqCst);
        let _ = window
            .app_handle()
            .set_activation_policy(ActivationPolicy::Accessory);
    } else {
        reminder_hidden(window.app_handle());
    }
    let window_for_main = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(ns_window) = window_for_main.ns_window() else {
            return;
        };
        unsafe {
            let ns_window = &*(ns_window as *const AnyObject);
            let over_fullscreen = enabled && make_reminder_panel(ns_window);
            let behavior: usize = msg_send![ns_window, collectionBehavior];
            let (behavior, level) = if over_fullscreen {
                (
                    behavior | OVER_FULLSCREEN_BEHAVIOR,
                    SCREEN_SAVER_WINDOW_LEVEL,
                )
            } else {
                (behavior & !OVER_FULLSCREEN_BEHAVIOR, FLOATING_WINDOW_LEVEL)
            };
            let _: () = msg_send![ns_window, setCollectionBehavior: behavior];
            let _: () = msg_send![ns_window, setLevel: level];
            if over_fullscreen {
                // Shows it in the active Space without activating BlinkBreak.
                let _: () = msg_send![ns_window, orderFrontRegardless];
            }
        }
    });
}

/// Restores the Dock icon and app menu once a strict reminder is gone.
pub fn reminder_hidden(app: &tauri::AppHandle) {
    if ACCESSORY_FOR_REMINDER.swap(false, Ordering::SeqCst) {
        let _ = app.set_activation_policy(ActivationPolicy::Regular);
    }
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
