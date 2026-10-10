//! Linux idle sensing through desktop-session D-Bus services.
//! GNOME/Mutter exposes idle milliseconds on Wayland; GNOME/KDE screen savers
//! commonly expose the freedesktop idle-time method in seconds. Fullscreen
//! detection remains unavailable because Wayland intentionally hides global
//! window state from ordinary applications.

use std::{
    sync::{Mutex, OnceLock},
    time::Duration,
};

use super::PlatformCapabilities;
use zbus::blocking::{Connection, Proxy};

fn session_connection() -> Option<Connection> {
    static SESSION_CONNECTION: OnceLock<Mutex<Option<Connection>>> = OnceLock::new();
    let cache = SESSION_CONNECTION.get_or_init(|| Mutex::new(None));
    let mut connection = cache.lock().ok()?;
    if connection.as_ref().map_or(true, Connection::is_closed) {
        *connection = zbus::blocking::connection::Builder::session()
            .ok()?
            .method_timeout(Duration::from_millis(300))
            .build()
            .ok();
    }
    connection.clone()
}

fn call_idle_millis(
    connection: &Connection,
    destination: &str,
    path: &str,
    interface: &str,
) -> Option<u64> {
    let proxy = Proxy::new(connection, destination, path, interface).ok()?;
    // Mutter declares this return value as D-Bus `t` (uint64 milliseconds).
    proxy.call("GetIdletime", &()).ok()
}

fn call_idle_seconds(
    connection: &Connection,
    destination: &str,
    path: &str,
    interface: &str,
) -> Option<u64> {
    let proxy = Proxy::new(connection, destination, path, interface).ok()?;
    let seconds: u32 = proxy.call("GetSessionIdleTime", &()).ok()?;
    Some(u64::from(seconds))
}

fn milliseconds_to_seconds(milliseconds: u64) -> u64 {
    milliseconds / 1000
}

pub fn idle_secs() -> Option<u64> {
    let connection = session_connection()?;

    call_idle_millis(
        &connection,
        "org.gnome.Mutter.IdleMonitor",
        "/org/gnome/Mutter/IdleMonitor/Core",
        "org.gnome.Mutter.IdleMonitor",
    )
    .map(milliseconds_to_seconds)
    .or_else(|| {
        call_idle_seconds(
            &connection,
            "org.gnome.ScreenSaver",
            "/org/gnome/ScreenSaver",
            "org.gnome.ScreenSaver",
        )
    })
    .or_else(|| {
        call_idle_seconds(
            &connection,
            "org.freedesktop.ScreenSaver",
            "/org/freedesktop/ScreenSaver",
            "org.freedesktop.ScreenSaver",
        )
    })
}

pub fn fullscreen_active() -> bool {
    false
}

/// GTK draws through Wayland when the session has one, unless GDK_BACKEND forces X11.
fn uses_wayland(wayland_display: Option<&str>, gdk_backend: Option<&str>) -> bool {
    let wayland_session = wayland_display.is_some_and(|display| !display.is_empty());
    let forced_x11 = gdk_backend.is_some_and(|backend| backend.trim_start().starts_with("x11"));
    wayland_session && !forced_x11
}

fn over_fullscreen_supported() -> bool {
    // Wayland gives ordinary apps no way to stack above other windows; X11 window managers
    // honor the notification window type, which they keep above fullscreen windows.
    !uses_wayland(
        std::env::var("WAYLAND_DISPLAY").ok().as_deref(),
        std::env::var("GDK_BACKEND").ok().as_deref(),
    )
}

/// Strict mode: marks the hidden reminder as a notification window, which X11 window managers
/// such as GNOME's stack above fullscreen windows. Must run before the window is shown, since
/// the window manager reads the type when it maps the window. No effect on Wayland.
pub fn set_over_fullscreen(window: &tauri::WebviewWindow, enabled: bool) {
    use gtk::{gdk::WindowTypeHint, prelude::GtkWindowExt};

    let window_for_main = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(gtk_window) = window_for_main.gtk_window() else {
            return;
        };
        gtk_window.set_type_hint(if enabled {
            WindowTypeHint::Notification
        } else {
            WindowTypeHint::Normal
        });
        gtk_window.set_keep_above(true);
    });
}

pub fn capabilities() -> PlatformCapabilities {
    PlatformCapabilities {
        platform: "linux".to_string(),
        idle_supported: idle_secs().is_some(),
        fullscreen_supported: false,
        over_fullscreen_supported: over_fullscreen_supported(),
    }
}

#[cfg(test)]
mod tests {
    use super::{milliseconds_to_seconds, uses_wayland};

    #[test]
    fn detects_when_gtk_draws_through_wayland() {
        assert!(uses_wayland(Some("wayland-0"), None));
        assert!(uses_wayland(Some("wayland-0"), Some("wayland,x11")));
        assert!(!uses_wayland(Some("wayland-0"), Some("x11")));
        assert!(!uses_wayland(Some(""), None));
        assert!(!uses_wayland(None, None));
    }

    #[test]
    fn converts_mutter_idle_milliseconds_to_seconds() {
        assert_eq!(milliseconds_to_seconds(0), 0);
        assert_eq!(milliseconds_to_seconds(1999), 1);
        assert_eq!(milliseconds_to_seconds(120_000), 120);
    }
}
