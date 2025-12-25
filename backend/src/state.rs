use crate::models::ClipboardMessage;
use crate::push::PushClient;
use dashmap::DashMap;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::broadcast;
use uuid::Uuid;

const MAX_MESSAGES_PER_WINDOW: u32 = 300;
const WINDOW_DURATION_SECS: u64 = 60;
const MIN_INTERVAL_MS: u128 = 50;
const MAX_HISTORY_SIZE: usize = 50;

#[derive(Clone, Default)]
pub struct RateLimitState {
    pub last_message: Option<Instant>,
    pub message_count: u32,
    pub window_start: Option<Instant>,
}

type Hub = Arc<DashMap<Uuid, broadcast::Sender<ClipboardMessage>>>;
type RateLimits = Arc<DashMap<String, RateLimitState>>;
type History = Arc<DashMap<Uuid, Vec<ClipboardMessage>>>;
type Sessions = Arc<DashMap<Uuid, HashMap<String, String>>>;
type PushTokens = Arc<DashMap<Uuid, HashMap<String, String>>>;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub jwt_secret: String,
    hub: Hub,
    rate_limits: RateLimits,
    history: History,
    sessions: Sessions,
    push_tokens: PushTokens,
    push_client: Option<Arc<PushClient>>,
}

impl AppState {
    pub fn new(
        pool: PgPool,
        jwt_secret: String,
        fcm_json: Option<String>,
        fcm_path: Option<String>,
    ) -> Self {
        let push_client = fcm_json
            .and_then(|json| {
                PushClient::from_json(&json)
                    .map(Arc::new)
                    .map_err(|e| tracing::warn!("FCM init from JSON failed: {}", e))
                    .ok()
            })
            .or_else(|| {
                fcm_path.and_then(|path| {
                    PushClient::from_file(&path)
                        .map(Arc::new)
                        .map_err(|e| tracing::warn!("FCM init from file failed: {}", e))
                        .ok()
                })
            });

        if push_client.is_some() {
            tracing::info!("FCM push notifications enabled");
        }

        Self {
            pool,
            jwt_secret,
            hub: Arc::default(),
            rate_limits: Arc::default(),
            history: Arc::default(),
            sessions: Arc::default(),
            push_tokens: Arc::default(),
            push_client,
        }
    }

    pub fn store_push_token(&self, user_id: Uuid, device_id: &str, token: &str) {
        self.push_tokens
            .entry(user_id)
            .or_default()
            .insert(device_id.to_string(), token.to_string());
        tracing::info!(user = %user_id, device = %device_id, "Push token registered");
    }

    pub fn get_offline_push_tokens(&self, user_id: &Uuid, exclude_device: &str) -> Vec<String> {
        let active_devices: std::collections::HashSet<String> = self
            .sessions
            .get(user_id)
            .map(|s| s.keys().cloned().collect())
            .unwrap_or_default();

        self.push_tokens
            .get(user_id)
            .map(|tokens| {
                tokens
                    .iter()
                    .filter(|(dev_id, _)| {
                        *dev_id != exclude_device && !active_devices.contains(*dev_id)
                    })
                    .map(|(_, token)| token.clone())
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn push_client(&self) -> Option<&Arc<PushClient>> {
        self.push_client.as_ref()
    }

    pub fn add_session(&self, user_id: Uuid, device_id: String, device_name: String) {
        self.sessions
            .entry(user_id)
            .or_default()
            .insert(device_id, device_name);
    }

    pub fn remove_session(&self, user_id: Uuid, device_id: &str) {
        if let Some(mut sessions) = self.sessions.get_mut(&user_id) {
            sessions.remove(device_id);
        }
    }

    pub fn get_sessions(&self, user_id: &Uuid) -> Vec<(String, String)> {
        self.sessions
            .get(user_id)
            .map(|s| s.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
            .unwrap_or_default()
    }

    pub fn check_rate_limit(&self, device_id: &str) -> bool {
        let mut entry = self.rate_limits.entry(device_id.to_string()).or_default();

        check_rate_custom(
            entry.value_mut(),
            false,
            MAX_MESSAGES_PER_WINDOW,
            WINDOW_DURATION_SECS,
        )
    }

    pub fn check_rate_limit_custom(&self, key: &str, max_count: u32, window_secs: u64) -> bool {
        let mut entry = self.rate_limits.entry(key.to_string()).or_default();
        check_rate_custom(entry.value_mut(), true, max_count, window_secs)
    }
}

fn check_rate_custom(
    state: &mut RateLimitState,
    ignore_interval: bool,
    max_count: u32,
    window_secs: u64,
) -> bool {
    let now = Instant::now();

    if !ignore_interval {
        if let Some(last) = state.last_message {
            if now.duration_since(last).as_millis() < MIN_INTERVAL_MS {
                return false;
            }
        }
    }

    let window_start = state.window_start.get_or_insert(now);
    if now.duration_since(*window_start).as_secs() >= window_secs {
        state.window_start = Some(now);
        state.message_count = 0;
    }

    if state.message_count >= max_count {
        return false;
    }

    state.last_message = Some(now);
    state.message_count += 1;
    true
}

impl AppState {
    pub fn add_to_history(&self, user_id: Uuid, msg: ClipboardMessage) {
        let mut entry = self.history.entry(user_id).or_default();
        let history = entry.value_mut();
        history.insert(0, msg);
        history.truncate(MAX_HISTORY_SIZE);
    }

    pub fn get_history(&self, user_id: &Uuid) -> Vec<ClipboardMessage> {
        self.history
            .get(user_id)
            .map(|h| h.value().clone())
            .unwrap_or_default()
    }

    pub fn get_or_create_channel(&self, user_id: Uuid) -> broadcast::Sender<ClipboardMessage> {
        self.hub
            .entry(user_id)
            .or_insert_with(|| broadcast::channel(100).0)
            .clone()
    }

    pub fn cleanup_channel_if_empty(
        &self,
        user_id: &Uuid,
        tx: &broadcast::Sender<ClipboardMessage>,
    ) {
        if tx.receiver_count() == 0 {
            self.hub.remove(user_id);
            tracing::info!(user = %user_id, "fully disconnected");
        } else {
            tracing::debug!(user = %user_id, devices = tx.receiver_count(), "devices connected");
        }
    }
}

#[cfg(test)]
pub use test_utils::*;

#[cfg(test)]
mod test_utils {
    use super::*;

    #[derive(Clone, Default)]
    pub struct SyncEngine {
        pub hub: Hub,
        pub rate_limits: RateLimits,
        pub history: History,
    }

    impl SyncEngine {
        pub fn check_rate_limit(&self, device_id: &str) -> bool {
            let now = Instant::now();
            let mut entry = self.rate_limits.entry(device_id.to_string()).or_default();
            let state = entry.value_mut();

            if let Some(last) = state.last_message {
                if now.duration_since(last).as_millis() < MIN_INTERVAL_MS {
                    return false;
                }
            }

            let window_start = state.window_start.get_or_insert(now);
            if now.duration_since(*window_start).as_secs() >= WINDOW_DURATION_SECS {
                state.window_start = Some(now);
                state.message_count = 0;
            }

            if state.message_count >= MAX_MESSAGES_PER_WINDOW {
                return false;
            }

            state.last_message = Some(now);
            state.message_count += 1;
            true
        }

        pub fn add_to_history(&self, user_id: Uuid, msg: ClipboardMessage) {
            let mut entry = self.history.entry(user_id).or_default();
            let history = entry.value_mut();
            history.insert(0, msg);
            history.truncate(MAX_HISTORY_SIZE);
        }

        pub fn get_history(&self, user_id: &Uuid) -> Vec<ClipboardMessage> {
            self.history
                .get(user_id)
                .map(|h| h.value().clone())
                .unwrap_or_default()
        }

        pub fn get_or_create_channel(&self, user_id: Uuid) -> broadcast::Sender<ClipboardMessage> {
            self.hub
                .entry(user_id)
                .or_insert_with(|| broadcast::channel(100).0)
                .clone()
        }

        pub fn cleanup_channel_if_empty(
            &self,
            user_id: &Uuid,
            tx: &broadcast::Sender<ClipboardMessage>,
        ) {
            if tx.receiver_count() == 0 {
                self.hub.remove(user_id);
            }
        }
    }
}
