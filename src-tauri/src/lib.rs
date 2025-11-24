use tauri::{AppHandle, Emitter};

#[tauri::command]
async fn start_oauth_server(app: AppHandle) -> Result<u16, String> {
    tauri_plugin_oauth::start(move |url| {
        let _ = app.emit("oauth_callback", url);
    })
    .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![start_oauth_server])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
