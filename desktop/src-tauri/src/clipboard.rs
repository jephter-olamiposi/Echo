#[cfg(not(any(target_os = "android", target_os = "ios")))]
mod desktop {
    use arboard::Clipboard;
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::{Duration, Instant};
    use tauri::{AppHandle, Emitter, Listener};

    const FAST_POLL_MS: u64 = 300;
    const SLOW_POLL_MS: u64 = 1000;
    const IDLE_THRESHOLD_SECS: u64 = 60;
    const INIT_RETRY_SECS: u64 = 5;

    type IgnoredHash = Arc<Mutex<Option<u64>>>;

    fn calculate_hash(t: &str) -> u64 {
        let mut s = DefaultHasher::new();
        t.hash(&mut s);
        s.finish()
    }

    pub fn start_clipboard_listener_impl(app: AppHandle) {
        let ignored_hash: IgnoredHash = Arc::new(Mutex::new(None));
        let ignored_hash_clone = ignored_hash.clone();

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
                    let mut last_change = Instant::now();
                    eprintln!("[clipboard] monitor started (adaptive polling)");

                    if !last_text.is_empty() {
                        eprintln!(
                            "[clipboard] emitting initial content: {} chars",
                            last_text.len()
                        );
                        if let Err(e) = app.emit("clipboard-init", last_text.clone()) {
                            eprintln!("[clipboard] init emit error: {e}");
                        }
                    }

                    loop {
                        let idle_secs = last_change.elapsed().as_secs();
                        let poll_ms = if idle_secs < IDLE_THRESHOLD_SECS {
                            FAST_POLL_MS
                        } else {
                            SLOW_POLL_MS
                        };
                        thread::sleep(Duration::from_millis(poll_ms));

                        match clipboard.get_text() {
                            Ok(current) if current != last_text && !current.is_empty() => {
                                let current_hash = calculate_hash(&current);

                                {
                                    if let Ok(mut guard) = ignored_hash.lock() {
                                        if let Some(ignored) = *guard {
                                            if ignored == current_hash {
                                                eprintln!("[clipboard] skipped echoed content");
                                                *guard = None;
                                                last_text = current;
                                                continue;
                                            }
                                        }
                                        *guard = None;
                                    }
                                }

                                last_text = current.clone();
                                last_change = Instant::now(); // Reset activity timer
                                if let Err(e) = app.emit("clipboard-change", current) {
                                    eprintln!("[clipboard] emit error: {e}");
                                }
                            }
                            Ok(_) => {}
                            Err(_) => {}
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
