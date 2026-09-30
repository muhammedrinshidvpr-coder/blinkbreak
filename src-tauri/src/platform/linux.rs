//! Linux activity sensing placeholder.
//! Planned backends: X11 XScreenSaver extension where available; GNOME
//! Mutter (`org.gnome.Mutter.IdleMonitor`) and KDE KWin idle protocols on
//! Wayland. Wayland restricts global window queries, so fullscreen detection
//! and overlay placement need per-desktop verification. Until then, report
//! unsupported honestly instead of guessing.

use super::PlatformCapabilities;

pub fn idle_secs() -> u64 {
    0
}

pub fn fullscreen_active() -> bool {
    false
}

pub fn capabilities() -> PlatformCapabilities {
    PlatformCapabilities {
        platform: "linux".to_string(),
        idle_supported: false,
        fullscreen_supported: false,
    }
}
