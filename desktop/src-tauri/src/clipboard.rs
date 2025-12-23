#[cfg(not(any(target_os = "android", target_os = "ios")))]
mod desktop {
    use arboard::Clipboard;
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::Duration;
    use tauri::{AppHandle, Emitter, Listener};

    const POLL_INTERVAL_MS: u64 = 500;
    const INIT_RETRY_SECS: u64 = 5;

    // Store the hash of the content we just wrote from remote, to ignore it when reading back
    type IgnoredHash = Arc<Mutex<Option<u64>>>;

    fn calculate_hash(t: &str) -> u64 {
        let mut s = DefaultHasher::new();
        t.hash(&mut s);
        s.finish()
    }

    pub fn start_clipboard_listener_impl(app: AppHandle) {
        let ignored_hash: IgnoredHash = Arc::new(Mutex::new(None));
        let ignored_hash_clone = ignored_hash.clone();

        // Listen for remote clipboard events to trigger ignore
        app.listen("clipboard-remote-write", move |event| {
            if let Ok(text) = serde_json::from_str::<String>(event.payload()) {
                let hash = calculate_hash(&text);
                if let Ok(mut guard) = ignored_hash_clone.lock() {
                    *guard = Some(hash);
                    eprintln!("[clipboard] ignoring next change with hash: {}", hash);
                }
            }
        });

        thread::spawn(move || loop {
            match Clipboard::new() {
                Ok(mut clipboard) => {
                    let mut last_text = clipboard.get_text().unwrap_or_default();
                    eprintln!("[clipboard] monitor started");

                    loop {
                        thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));

                        match clipboard.get_text() {
                            Ok(current) if current != last_text && !current.is_empty() => {
                                let current_hash = calculate_hash(&current);

                                // Check if this should be ignored
                                {
                                    let mut guard = ignored_hash.lock().unwrap();
                                    if let Some(ignored) = *guard {
                                        if ignored == current_hash {
                                            eprintln!("[clipboard] skipped echoed content");
                                            *guard = None; // Reset after ignoring
                                            last_text = current;
                                            continue;
                                        }
                                    }
                                    // Clear ignore if we saw something else (desync protection)
                                    *guard = None;
                                }

                                last_text = current.clone();
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
