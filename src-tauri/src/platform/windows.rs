//! Windows activity sensing (unchanged behavior).

use super::PlatformCapabilities;

pub fn idle_secs() -> Option<u64> {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    let mut info = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };
    unsafe {
        if GetLastInputInfo(&mut info).as_bool() {
            let now = windows::Win32::System::SystemInformation::GetTickCount();
            return Some(now.wrapping_sub(info.dwTime) as u64 / 1000);
        }
    }
    // Preserve the previous Windows behavior on an OS API failure (no idle).
    Some(0)
}

pub fn fullscreen_active() -> bool {
    use windows::Win32::{
        Foundation::RECT,
        Graphics::Gdi::{
            GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
        },
        UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowRect, IsIconic},
    };

    unsafe {
        let foreground = GetForegroundWindow();
        if foreground.0.is_null() || IsIconic(foreground).as_bool() {
            return false;
        }

        let mut window_rect = RECT::default();
        if GetWindowRect(foreground, &mut window_rect).is_err() {
            return false;
        }

        let monitor = MonitorFromWindow(foreground, MONITOR_DEFAULTTONEAREST);
        if monitor.0.is_null() {
            return false;
        }

        let mut monitor_info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(monitor, &mut monitor_info).as_bool() {
            return false;
        }

        const EDGE_TOLERANCE: i32 = 2;
        let monitor_rect = monitor_info.rcMonitor;
        window_rect.left <= monitor_rect.left + EDGE_TOLERANCE
            && window_rect.top <= monitor_rect.top + EDGE_TOLERANCE
            && window_rect.right >= monitor_rect.right - EDGE_TOLERANCE
            && window_rect.bottom >= monitor_rect.bottom - EDGE_TOLERANCE
    }
}

pub fn capabilities() -> PlatformCapabilities {
    PlatformCapabilities {
        platform: "windows".to_string(),
        idle_supported: true,
        fullscreen_supported: true,
    }
}
