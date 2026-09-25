//! BlinkBreak native shell (Tauri 2 + Rust).
//! CONTRACT:
//! - GUARANTEES: single instance; tray controls; `get_idle_secs` reports Windows idle seconds; reminder window never steals focus and always closes (native deadline watchdog); `--minimized` login launch stays in tray.
//! - EXPECTS: Windows 10/11 with WebView2.
//! - DOES NOT: record keys/apps/titles; use webcam; send data anywhere.

use std::{
    sync::atomic::{AtomicU64, Ordering},
    time::Duration,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, PhysicalPosition, PhysicalSize, WindowEvent,
};

#[tauri::command]
fn get_idle_secs() -> u64 {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
        let mut info = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };
        unsafe {
            if GetLastInputInfo(&mut info).as_bool() {
                let now = windows::Win32::System::SystemInformation::GetTickCount();
                return now.wrapping_sub(info.dwTime) as u64 / 1000;
            }
        }
        0
    }
    #[cfg(not(target_os = "windows"))]
    {
        0
    }
}

/// Identifies the reminder currently on screen (0 = none) so a stale deadline never hides a newer one.
#[derive(Default)]
struct ReminderSlot {
    next_id: AtomicU64,
    showing: AtomicU64,
}

/// Grace after the countdown before the native watchdog closes a reminder the webview failed to close.
const WATCHDOG_GRACE_SECS: u64 = 3;
/// Logical size and top margin of the blink toast window. Kept tight around the pill:
/// its transparent edges still catch clicks meant for the app underneath.
const TOAST_SIZE: (f64, f64) = (300.0, 96.0);
const TOAST_TOP_MARGIN: f64 = 6.0;

#[allow(clippy::too_many_arguments)]
#[tauri::command]
fn show_reminder(
    app: tauri::AppHandle,
    slot: tauri::State<'_, ReminderSlot>,
    kind: String,
    title: String,
    body: String,
    duration_sec: u64,
    snooze_sec: u64,
    presentation: String,
    expiry_action: String,
    reduced_motion: bool,
    theme: String,
    chime: bool,
    volume: f64,
) -> Result<(), String> {
    let Some(win) = app.get_webview_window("reminder") else {
        return Err("no reminder window".into());
    };

    let cursor_monitor = app
        .cursor_position()
        .ok()
        .and_then(|cursor| app.monitor_from_point(cursor.x, cursor.y).ok().flatten());
    let monitor = match cursor_monitor {
        Some(monitor) => Some(monitor),
        None => app.primary_monitor().map_err(|e| e.to_string())?,
    };
    if let Some(monitor) = monitor {
        let (position, size) = if presentation == "toast" {
            let scale = monitor.scale_factor();
            let width = ((TOAST_SIZE.0 * scale) as u32).min(monitor.size().width);
            let height = (TOAST_SIZE.1 * scale) as u32;
            let x = monitor.position().x + (monitor.size().width as i32 - width as i32) / 2;
            let y = monitor.position().y + (TOAST_TOP_MARGIN * scale) as i32;
            (
                PhysicalPosition::new(x, y),
                PhysicalSize::new(width, height),
            )
        } else {
            (*monitor.position(), *monitor.size())
        };
        win.set_position(position).map_err(|e| e.to_string())?;
        win.set_size(size).map_err(|e| e.to_string())?;
    }

    let id = slot.next_id.fetch_add(1, Ordering::SeqCst) + 1;
    slot.showing.store(id, Ordering::SeqCst);

    win.emit(
        "blinkbreak:reminder",
        serde_json::json!({
            "kind": kind,
            "title": title,
            "body": body,
            "durationSec": duration_sec,
            "snoozeSec": snooze_sec,
            "presentation": presentation,
            "expiryAction": expiry_action,
            "reducedMotion": reduced_motion,
            "theme": theme,
            "chime": chime,
            "volume": volume,
        }),
    )
    .map_err(|e| e.to_string())?;
    // `focusable: false` in tauri.conf.json keeps this from stealing typing focus on every show.
    win.show().map_err(|e| e.to_string())?;

    // Safety net: if the webview never reports back, close it here so the scheduler keeps running.
    let app_for_deadline = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(duration_sec + WATCHDOG_GRACE_SECS));
        let slot = app_for_deadline.state::<ReminderSlot>();
        if slot
            .showing
            .compare_exchange(id, 0, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }
        if let Some(win) = app_for_deadline.get_webview_window("reminder") {
            let _ = win.hide();
        }
        let _ = app_for_deadline.emit(
            "blinkbreak:reminder-action",
            serde_json::json!({ "kind": kind, "action": expiry_action }),
        );
    });
    Ok(())
}

#[tauri::command]
fn is_fullscreen_active() -> bool {
    #[cfg(target_os = "windows")]
    {
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
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

#[tauri::command]
fn hide_reminder(
    app: tauri::AppHandle,
    slot: tauri::State<'_, ReminderSlot>,
) -> Result<(), String> {
    slot.showing.store(0, Ordering::SeqCst);
    if let Some(win) = app.get_webview_window("reminder") {
        win.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ReminderSlot::default())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .setup(|app| {
            if let Some(main_window) = app.get_webview_window("main") {
                let window_for_close = main_window.clone();
                main_window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_for_close.hide();
                    }
                });
                // Login/autostart launch: stay quiet in the tray, don't pop the dashboard.
                if std::env::args().any(|a| a == "--minimized") {
                    let _ = main_window.hide();
                }
            }

            #[cfg(desktop)]
            {
                let _ = app.handle().plugin(tauri_plugin_autostart::init(
                    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                    Some(vec!["--minimized"]),
                ));
            }
            let quit = MenuItem::with_id(app, "quit", "Quit BlinkBreak", true, None::<&str>)?;
            let open = MenuItem::with_id(app, "open", "Open dashboard", true, None::<&str>)?;
            let break_now =
                MenuItem::with_id(app, "break-now", "Take a break now", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "Pause 15 min", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &break_now, &pause, &quit])?;
            TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("BlinkBreak — gentle health reminders")
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "quit" => app.exit(0),
                    "open" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "break-now" => {
                        // Main window JS runs even while hidden; it shows the reminder card.
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.emit("blinkbreak:break-now", ());
                        }
                    }
                    "pause" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.emit("blinkbreak:pause-15", ());
                        }
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_idle_secs,
            show_reminder,
            hide_reminder,
            is_fullscreen_active
        ])
        .run(tauri::generate_context!())
        .expect("BlinkBreak failed to start");
}
