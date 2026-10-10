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

pub fn capabilities() -> PlatformCapabilities {
    PlatformCapabilities {
        platform: "linux".to_string(),
        idle_supported: idle_secs().is_some(),
        fullscreen_supported: false,
    }
}

#[cfg(test)]
mod tests {
    use super::milliseconds_to_seconds;

    #[test]
    fn converts_mutter_idle_milliseconds_to_seconds() {
        assert_eq!(milliseconds_to_seconds(0), 0);
        assert_eq!(milliseconds_to_seconds(1999), 1);
        assert_eq!(milliseconds_to_seconds(120_000), 120);
    }
}
