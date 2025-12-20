#[cfg(not(any(target_os = "android", target_os = "ios")))]
mod desktop {
    use arboard::Clipboard;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::thread;
    use std::time::Duration;
    use tauri::{AppHandle, Emitter};

    const POLL_INTERVAL_MS: u64 = 500;
    const INIT_RETRY_SECS: u64 = 5;

    static IGNORE_NEXT_CHANGE: AtomicBool = AtomicBool::new(false);

    pub fn start_clipboard_listener_impl(app: AppHandle) {
        thread::spawn(move || loop {
            match Clipboard::new() {
                Ok(mut clipboard) => {
                    let mut last_text = clipboard.get_text().unwrap_or_default();
                    eprintln!("[clipboard] monitor started");

                    loop {
                        thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));

                        match clipboard.get_text() {
                            Ok(current) if current != last_text && !current.is_empty() => {
                                last_text = current.clone();
                                // Skip if this change was from set_clipboard (remote)
                                if IGNORE_NEXT_CHANGE.swap(false, Ordering::Relaxed) {
                                    continue;
                                }
                                if let Err(e) = app.emit("clipboard-change", current) {
                                    eprintln!("[clipboard] emit error: {e}");
                                }
                            }
                            Ok(_) => {}
                            Err(_) => {
                                // Non-text content (images, files) - silently ignore
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[clipboard] init error: {e}, retrying in {INIT_RETRY_SECS}s");
                    thread::sleep(Duration::from_secs(INIT_RETRY_SECS));
                }
            }
        });
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn start_clipboard_listener(_app: tauri::AppHandle) {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    desktop::start_clipboard_listener_impl(_app);
}
