//! macOS activity sensing placeholder.
//! Planned backend: `CGEventSourceSecondsSinceLastEventType` for idle time.
//! Fullscreen detection needs verification against macOS spaces/full-screen
//! APIs before we claim support. Until then, report unsupported honestly.

use super::PlatformCapabilities;

pub fn idle_secs() -> u64 {
    0
}

pub fn fullscreen_active() -> bool {
    false
}

pub fn capabilities() -> PlatformCapabilities {
    PlatformCapabilities {
        platform: "macos".to_string(),
        idle_supported: false,
        fullscreen_supported: false,
    }
}
