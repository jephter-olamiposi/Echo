mod clipboard;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    builder = builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_os::init());

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        builder = builder.plugin(tauri_plugin_barcode_scanner::init());
    }

    builder
        .setup(|_app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let handle = _app.handle().clone();
                clipboard::start_clipboard_listener(handle);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
