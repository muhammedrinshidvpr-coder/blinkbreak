//! OS-specific activity sensing behind one honest interface.
//! Idle sensing uses Windows input statistics, macOS Quartz session idle time,
//! or GNOME/freedesktop D-Bus services on Linux. Fullscreen sensing is Windows-only.

use serde::Serialize;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

#[derive(Debug, Clone, Serialize)]
pub struct PlatformCapabilities {
    pub platform: String,
    pub idle_supported: bool,
    pub fullscreen_supported: bool,
}

pub fn idle_secs() -> Option<u64> {
    #[cfg(target_os = "windows")]
    {
        windows::idle_secs()
    }
    #[cfg(target_os = "macos")]
    {
        macos::idle_secs()
    }
    #[cfg(target_os = "linux")]
    {
        linux::idle_secs()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        None
    }
}

pub fn fullscreen_active() -> bool {
    #[cfg(target_os = "windows")]
    {
        windows::fullscreen_active()
    }
    #[cfg(target_os = "macos")]
    {
        macos::fullscreen_active()
    }
    #[cfg(target_os = "linux")]
    {
        linux::fullscreen_active()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        false
    }
}

pub fn capabilities() -> PlatformCapabilities {
    #[cfg(target_os = "windows")]
    {
        windows::capabilities()
    }
    #[cfg(target_os = "macos")]
    {
        macos::capabilities()
    }
    #[cfg(target_os = "linux")]
    {
        linux::capabilities()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        PlatformCapabilities {
            platform: std::env::consts::OS.to_string(),
            idle_supported: false,
            fullscreen_supported: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capabilities_shape_is_honest() {
        let caps = capabilities();
        assert!(!caps.platform.is_empty());
        #[cfg(target_os = "windows")]
        {
            assert!(caps.idle_supported);
            assert!(caps.fullscreen_supported);
        }
        #[cfg(target_os = "macos")]
        {
            assert!(caps.idle_supported);
            assert!(!caps.fullscreen_supported);
        }
        #[cfg(target_os = "linux")]
        assert!(!caps.fullscreen_supported);
    }
}
