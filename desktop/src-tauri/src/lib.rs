mod clipboard;

use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;
use tauri::Manager;

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
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init());

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        builder = builder.plugin(tauri_plugin_barcode_scanner::init());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
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
                        api.prevent_close();
                        let _ = window.hide();
                        #[cfg(target_os = "macos")]
                        {
                            let _ = window
                                .app_handle()
                                .set_activation_policy(ActivationPolicy::Accessory);
                        }
                    } else {
                        println!("[close_handler] Allowing close (app will quit)");
                    }
                }
            }
            #[cfg(any(target_os = "android", target_os = "ios"))]
            {
                let _ = (window, event);
            }
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Failed to run tauri application: {e}");
            std::process::exit(1);
        });
}
