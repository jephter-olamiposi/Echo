//! Application state with concurrent collections and broadcast channels.
//!
//! Uses DashMap for lock-free concurrent access (3-5x faster than RwLock<HashMap>).
//! See `benches/rate_limiting.rs` for benchmarks.

use crate::error::AppError;
use crate::models::ClipboardMessage;
use crate::push::PushClient;
use dashmap::DashMap;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::{broadcast, Semaphore};
use uuid::Uuid;

const MAX_MESSAGES_PER_WINDOW: u32 = 300;
const WINDOW_DURATION_SECS: u64 = 60;
const MIN_INTERVAL_MS: u128 = 50;
const MAX_HISTORY_SIZE: usize = 50;
const MIN_CHANNEL_CAPACITY: usize = 50;
const MAX_CHANNEL_CAPACITY: usize = 500;
const CAPACITY_PER_DEVICE: usize = 25;
const MAX_CONCURRENT_PUSH_TASKS: usize = 50;

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
    push_semaphore: Arc<Semaphore>,
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
            push_semaphore: Arc::new(Semaphore::new(MAX_CONCURRENT_PUSH_TASKS)),
        }
    }

    pub fn store_push_token(&self, user_id: Uuid, device_id: &str, token: &str) {
        self.push_tokens
            .entry(user_id)
            .or_default()
            .insert(device_id.to_string(), token.to_string());
        tracing::info!(user = %user_id, device = %device_id, "Push token registered");
        self.persist_push_tokens(user_id);
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

    pub fn remove_push_token_by_value(&self, user_id: &Uuid, token_value: &str) {
        if let Some(mut tokens) = self.push_tokens.get_mut(user_id) {
            tokens.retain(|_, token| token != token_value);
            tracing::info!(user = %user_id, "Removed invalid push token");
        }
        self.persist_push_tokens(*user_id);
    }

    fn persist_push_tokens(&self, user_id: Uuid) {
        let pool = self.pool.clone();
        let tokens_snapshot: Vec<serde_json::Value> = self
            .push_tokens
            .get(&user_id)
            .map(|t| {
                t.iter()
                    .map(|(dev, tok)| serde_json::json!({"device_id": dev, "token": tok}))
                    .collect()
            })
            .unwrap_or_default();

        tokio::spawn(async move {
            let json = serde_json::Value::Array(tokens_snapshot);
            if let Err(e) = sqlx::query!(
                "UPDATE users SET push_tokens = $1 WHERE id = $2",
                json,
                user_id
            )
            .execute(&pool)
            .await
            {
                tracing::warn!(user = %user_id, error = %e, "Failed to persist push tokens");
            }
        });
    }

    /// Load push tokens from database for a user (call on connect if needed).
    pub async fn load_push_tokens_from_db(&self, user_id: Uuid) {
        let result = sqlx::query!("SELECT push_tokens FROM users WHERE id = $1", user_id)
            .fetch_optional(&self.pool)
            .await;

        match result {
            Ok(Some(row)) => {
                if let Some(tokens_json) = row.push_tokens {
                    if let Some(arr) = tokens_json.as_array() {
                        let mut entry = self.push_tokens.entry(user_id).or_default();
                        for item in arr {
                            if let (Some(dev), Some(tok)) = (
                                item.get("device_id").and_then(|v| v.as_str()),
                                item.get("token").and_then(|v| v.as_str()),
                            ) {
                                entry.insert(dev.to_string(), tok.to_string());
                            }
                        }
                        tracing::debug!(user = %user_id, count = entry.len(), "Loaded push tokens from DB");
                    }
                }
            }
            Ok(None) => {}
            Err(e) => {
                tracing::warn!(user = %user_id, error = %e, "Failed to load push tokens from DB");
            }
        }
    }

    pub fn push_client(&self) -> Option<&Arc<PushClient>> {
        self.push_client.as_ref()
    }

    pub fn push_semaphore(&self) -> &Arc<Semaphore> {
        &self.push_semaphore
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
            .map(|s| {
                s.iter()
                    .map(|(key, value)| (key.clone(), value.clone()))
                    .collect()
            })
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

/// Token bucket rate limiting. Returns true if allowed.
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
    /// Add message to both in-memory cache and database
    pub fn add_to_history(&self, user_id: Uuid, msg: ClipboardMessage) {
        let mut entry = self.history.entry(user_id).or_default();
        let history = entry.value_mut();
        history.insert(0, msg.clone());
        history.truncate(MAX_HISTORY_SIZE);

        let pool = self.pool.clone();
        tokio::spawn(async move {
            use crate::db::ClipboardHistoryRepository;
            let repo = ClipboardHistoryRepository::new(pool);
            if let Err(e) = repo.add(user_id, &msg).await {
                tracing::warn!(user = %user_id, error = %e, "failed to persist history to db");
            }
        });
    }

    /// Get history - first try cache, then fall back to database
    pub fn get_history(&self, user_id: &Uuid) -> Vec<ClipboardMessage> {
        self.history
            .get(user_id)
            .map(|h| h.value().clone())
            .unwrap_or_default()
    }

    /// Load history from database into cache (call on user connect)
    pub async fn load_history_from_db(&self, user_id: Uuid) {
        use crate::db::ClipboardHistoryRepository;
        let repo = ClipboardHistoryRepository::new(self.pool.clone());
        match repo.get(&user_id, MAX_HISTORY_SIZE as i64).await {
            Ok(msgs) => {
                let mut entry = self.history.entry(user_id).or_default();
                *entry.value_mut() = msgs;
                tracing::debug!(user = %user_id, "loaded history from database");
            }
            Err(e) => {
                tracing::warn!(user = %user_id, error = %e, "failed to load history from db");
            }
        }
    }

    /// Get or create a broadcast channel for a user.
    pub fn get_or_create_channel(&self, user_id: Uuid) -> broadcast::Sender<ClipboardMessage> {
        self.hub
            .entry(user_id)
            .or_insert_with(|| {
                let device_count = self.sessions.get(&user_id).map(|s| s.len()).unwrap_or(1);
                let capacity = (device_count * CAPACITY_PER_DEVICE)
                    .clamp(MIN_CHANNEL_CAPACITY, MAX_CHANNEL_CAPACITY);

                tracing::debug!(
                    user = %user_id,
                    devices = device_count,
                    capacity = capacity,
                    "creating channel"
                );

                broadcast::channel(capacity).0
            })
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

    pub async fn clear_history(&self, user_id: Uuid) -> Result<(), AppError> {
        self.history.remove(&user_id);

        let repo = crate::db::ClipboardHistoryRepository::new(self.pool.clone());
        repo.clear(&user_id).await
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
            let mut entry = self.rate_limits.entry(device_id.to_string()).or_default();
            check_rate_custom(
                entry.value_mut(),
                false,
                MAX_MESSAGES_PER_WINDOW,
                WINDOW_DURATION_SECS,
            )
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
