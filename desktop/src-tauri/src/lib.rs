mod clipboard;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

// Global flag for background mode (read from frontend store on startup)
static BACKGROUND_MODE: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn set_background_mode(enabled: bool) {
    println!("[background_mode] Setting to: {}", enabled);
    BACKGROUND_MODE.store(enabled, Ordering::SeqCst);
}

#[tauri::command]
fn get_background_mode() -> bool {
    let val = BACKGROUND_MODE.load(Ordering::SeqCst);
    println!("[background_mode] Getting: {}", val);
    val
}

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

    // Desktop-only: single instance to show hidden window on relaunch
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When user relaunches, show the existing hidden window
            if let Some(window) = app.get_webview_window("main") {
                // Restore to regular app (show in dock) on macOS
                #[cfg(target_os = "macos")]
                {
                    use tauri::ActivationPolicy;
                    let _ = app.set_activation_policy(ActivationPolicy::Regular);
                }
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .invoke_handler(tauri::generate_handler![
            set_background_mode,
            get_background_mode
        ])
        .setup(|_app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let handle = _app.handle().clone();
                clipboard::start_clipboard_listener(handle);
            }
            Ok(())
        })
        // Desktop-only: intercept close to hide window if background mode is enabled
        .on_window_event(|window, event| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    let bg_mode = BACKGROUND_MODE.load(Ordering::SeqCst);
                    println!(
                        "[close_handler] CloseRequested, background_mode={}",
                        bg_mode
                    );
                    if bg_mode {
                        // Prevent actual close
                        api.prevent_close();
                        println!("[close_handler] Hiding window...");
                        // Hide the window
                        let _ = window.hide();
                        // Completely remove from dock on macOS by becoming a background app
                        #[cfg(target_os = "macos")]
                        {
                            use tauri::ActivationPolicy;
                            let _ = window
                                .app_handle()
                                .set_activation_policy(ActivationPolicy::Accessory);
                            println!("[close_handler] Set to Accessory mode (no dock icon)");
                        }
                    } else {
                        println!("[close_handler] Allowing close (app will quit)");
                    }
                }
            }
            // Suppress unused variable warning on mobile
            #[cfg(any(target_os = "android", target_os = "ios"))]
            {
                let _ = (window, event);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
