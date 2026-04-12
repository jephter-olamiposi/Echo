//! Application state: thin coordinator over SyncState, RateLimiter, and PushManager.
//! All DB persistence is initiated here; sub-states remain pure in-memory.

pub(crate) mod push_manager;
pub(crate) mod rate_limit;
pub(crate) mod sync;

use crate::db::{ClipboardHistoryRepository, UserRepository};
use crate::error::AppError;
use crate::protocol::ClipboardMessage;
use crate::types::{DeviceId, DeviceName, PushToken};
use push_manager::PushManager;
use rate_limit::RateLimiter;
use sqlx::PgPool;
use std::collections::HashSet;
use std::sync::Arc;
use sync::SyncState;
use tokio::sync::broadcast;
use uuid::Uuid;

pub(crate) use sync::MAX_HISTORY_SIZE;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) pool: PgPool,
    jwt_secret: Arc<String>,
    pub(crate) sync: SyncState,
    pub(crate) rate_limiter: RateLimiter,
    pub(crate) push: PushManager,
}

impl AppState {
    pub(crate) fn new(
        pool: PgPool,
        jwt_secret: String,
        fcm_json: Option<String>,
        fcm_path: Option<String>,
    ) -> Self {
        Self {
            pool,
            jwt_secret: Arc::new(jwt_secret),
            sync: SyncState::default(),
            rate_limiter: RateLimiter::default(),
            push: PushManager::new(fcm_json, fcm_path),
        }
    }

    pub(crate) fn jwt_secret(&self) -> &str {
        &self.jwt_secret
    }

    // --- Rate limiting (delegates to RateLimiter) ---

    pub(crate) fn check_rate_limit(&self, device_id: &str) -> bool {
        self.rate_limiter.check_device(device_id)
    }

    pub(crate) fn check_rate_limit_custom(
        &self,
        key: &str,
        max_count: u32,
        window_secs: u64,
    ) -> bool {
        self.rate_limiter.check_custom(key, max_count, window_secs)
    }

    // --- Sessions (delegates to SyncState) ---

    pub(crate) fn add_session(
        &self,
        user_id: Uuid,
        device_id: &DeviceId,
        device_name: &DeviceName,
    ) {
        self.sync.add_session(user_id, device_id, device_name);
    }

    pub(crate) fn remove_session(&self, user_id: Uuid, device_id: &DeviceId) {
        self.sync.remove_session(user_id, device_id);
    }

    pub(crate) fn get_sessions(&self, user_id: &Uuid) -> Vec<(String, String)> {
        self.sync.get_sessions(user_id)
    }

    // --- Broadcast channels (delegates to SyncState) ---

    pub(crate) fn get_or_create_channel(
        &self,
        user_id: Uuid,
    ) -> broadcast::Sender<ClipboardMessage> {
        self.sync.get_or_create_channel(user_id)
    }

    pub(crate) fn cleanup_channel_if_empty(
        &self,
        user_id: &Uuid,
        tx: &broadcast::Sender<ClipboardMessage>,
    ) {
        self.sync.cleanup_channel_if_empty(user_id, tx);
    }

    // --- History (in-memory + async DB write) ---

    pub(crate) fn add_to_history(&self, user_id: Uuid, msg: ClipboardMessage) {
        self.sync.add_to_history(user_id, msg.clone());

        let pool = self.pool.clone();
        tokio::spawn(async move {
            let repo = ClipboardHistoryRepository::new(pool);
            if let Err(e) = repo.add(user_id, &msg).await {
                tracing::warn!(user = %user_id, error = %e, "failed to persist history to db");
            }
        });
    }

    pub(crate) fn get_history(&self, user_id: &Uuid) -> Vec<ClipboardMessage> {
        self.sync.get_history(user_id)
    }

    pub(crate) async fn load_history_from_db(&self, user_id: Uuid) {
        // In-memory history is the authoritative cache once populated. Overwriting it with a DB
        // snapshot would discard messages that were added to memory but whose async DB writes
        // have not yet committed — causing history gaps on reconnect.
        if self.sync.has_history(&user_id) {
            return;
        }
        let repo = ClipboardHistoryRepository::new(self.pool.clone());
        match repo.get(&user_id, MAX_HISTORY_SIZE as i64).await {
            Ok(msgs) => {
                self.sync.set_history(user_id, msgs);
                tracing::debug!(user = %user_id, "loaded history from database");
            }
            Err(e) => tracing::warn!(user = %user_id, error = %e, "failed to load history from db"),
        }
    }

    pub(crate) async fn clear_history(&self, user_id: Uuid) -> Result<(), AppError> {
        self.sync.clear_history_memory(&user_id)?;
        ClipboardHistoryRepository::new(self.pool.clone())
            .clear(&user_id)
            .await
    }

    // --- Push tokens (in-memory + async DB write) ---

    pub(crate) fn store_push_token(&self, user_id: Uuid, device_id: &DeviceId, token: &PushToken) {
        self.push.store(user_id, device_id.as_str(), token.as_str());
        self.persist_push_tokens(user_id);
    }

    pub(crate) fn get_offline_push_tokens(
        &self,
        user_id: &Uuid,
        exclude_device: &DeviceId,
    ) -> Vec<String> {
        let online: HashSet<String> = self.sync.online_device_ids(user_id).into_iter().collect();
        self.push
            .offline_tokens(user_id, exclude_device.as_str(), &online)
    }

    pub(crate) fn remove_push_token_by_value(&self, user_id: &Uuid, token_value: &str) {
        self.push.remove_by_value(user_id, token_value);
        self.persist_push_tokens(*user_id);
    }

    fn persist_push_tokens(&self, user_id: Uuid) {
        let pool = self.pool.clone();
        let snapshot = self.push.snapshot(&user_id);
        tokio::spawn(async move {
            let repo = UserRepository::new(pool);
            if let Err(e) = repo.update_push_tokens(user_id, snapshot).await {
                tracing::warn!(user = %user_id, error = %e, "failed to persist push tokens");
            }
        });
    }

    pub(crate) async fn load_push_tokens_from_db(&self, user_id: Uuid) {
        let repo = UserRepository::new(self.pool.clone());
        match repo.get_push_tokens(user_id).await {
            Ok(entries) => {
                let count = entries.len();
                self.push.load_from_snapshot(user_id, entries);
                tracing::debug!(user = %user_id, count, "loaded push tokens from db");
            }
            Err(e) => {
                tracing::warn!(user = %user_id, error = %e, "failed to load push tokens from db")
            }
        }
    }
}

// --- Test fixture ---
// Provides isolated in-memory state for unit tests without a DB pool.

#[cfg(test)]
pub use test_utils::TestFixture;

#[cfg(test)]
mod test_utils {
    use super::*;

    /// Minimal in-memory fixture for unit tests. No DB, no push.
    #[derive(Default)]
    pub struct TestFixture {
        pub sync: SyncState,
        pub rate_limiter: RateLimiter,
    }
}
