//! BlinkBreak native shell (Tauri 2 + Rust).
//! CONTRACT:
//! - GUARANTEES: single instance; tray controls; `get_idle_secs` reports Windows idle seconds; reminder window never steals focus.
//! - EXPECTS: Windows 10/11 with WebView2.
//! - DOES NOT: record keys/apps/titles; use webcam; send data anywhere.

use tauri::{
  menu::{Menu, MenuItem},
  tray::TrayIconBuilder,
  Manager,
};

#[tauri::command]
fn get_idle_secs() -> u64 {
  #[cfg(target_os = "windows")]
  {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    let mut info = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
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

#[tauri::command]
fn show_reminder(app: tauri::AppHandle, kind: String, title: String, body: String) -> Result<(), String> {
  let Some(win) = app.get_webview_window("reminder") else { return Err("no reminder window".into()) };
  win.emit("blinkbreak:reminder", serde_json::json!({ "kind": kind, "title": title, "body": body }))
    .map_err(|e| e.to_string())?;
  win.show().map_err(|e| e.to_string())?;
  // Deliberately NOT focusing: gentle reminder must not steal typing.
  Ok(())
}

#[tauri::command]
fn hide_reminder(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(win) = app.get_webview_window("reminder") {
    win.hide().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
      }
    }))
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      #[cfg(desktop)]
      {
        let _ = app.handle().plugin(tauri_plugin_autostart::init(
          tauri_plugin_autostart::MacosLauncher::LaunchAgent,
          None,
        ));
      }
      let quit = MenuItem::with_id(app, "quit", "Quit BlinkBreak", true, None::<&str>)?;
      let open = MenuItem::with_id(app, "open", "Open dashboard", true, None::<&str>)?;
      let pause = MenuItem::with_id(app, "pause", "Pause 15 min", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&open, &pause, &quit])?;
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
          "pause" => {
            if let Some(w) = app.get_webview_window("main") {
              let _ = w.emit("blinkbreak:pause-15", ());
              let _ = w.show();
            }
          }
          _ => {}
        })
        .build(app)?;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![get_idle_secs, show_reminder, hide_reminder])
    .run(tauri::generate_context!())
    .expect("BlinkBreak failed to start");
}
