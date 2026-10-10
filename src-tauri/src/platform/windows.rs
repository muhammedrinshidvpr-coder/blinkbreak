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

/// Strict mode: moves the hidden reminder to the top of the always-on-top band, so it
/// shows above borderless-fullscreen apps (videos, browsers, slideshows) even when they
/// are always-on-top themselves. Games in exclusive fullscreen own the display and can
/// still hide it. The gentle default needs nothing: reminders wait out fullscreen instead.
pub fn set_over_fullscreen(window: &tauri::WebviewWindow, enabled: bool) {
    use windows::Win32::{
        Foundation::HWND,
        UI::WindowsAndMessaging::{
            SetWindowPos, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
        },
    };

    if !enabled {
        return;
    }
    let Ok(hwnd) = window.hwnd() else {
        return;
    };
    unsafe {
        // Tauri's HWND comes from its own `windows` crate version; the pointer is the same.
        let _ = SetWindowPos(
            HWND(hwnd.0),
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );
    }
}

pub fn capabilities() -> PlatformCapabilities {
    PlatformCapabilities {
        platform: "windows".to_string(),
        idle_supported: true,
        fullscreen_supported: true,
        over_fullscreen_supported: true,
    }
}
