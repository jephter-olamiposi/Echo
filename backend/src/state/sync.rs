//! Per-user broadcast channels, clipboard history, and device session tracking.
//! All operations are pure in-memory. DB persistence is coordinated by AppState.

use crate::error::AppError;
use crate::protocol::ClipboardMessage;
use crate::types::{DeviceId, DeviceName};
use dashmap::DashMap;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::broadcast;
use uuid::Uuid;

pub(crate) const MAX_HISTORY_SIZE: usize = 50;
const MIN_CHANNEL_CAPACITY: usize = 50;
const MAX_CHANNEL_CAPACITY: usize = 500;
const CAPACITY_PER_DEVICE: usize = 25;

#[derive(Clone, Default)]
pub(crate) struct SyncState {
    hub: Arc<DashMap<Uuid, broadcast::Sender<ClipboardMessage>>>,
    history: Arc<DashMap<Uuid, Vec<ClipboardMessage>>>,
    sessions: Arc<DashMap<Uuid, HashMap<String, String>>>,
}

impl SyncState {
    // --- Broadcast channels ---

    pub(crate) fn get_or_create_channel(
        &self,
        user_id: Uuid,
    ) -> broadcast::Sender<ClipboardMessage> {
        self.hub
            .entry(user_id)
            .or_insert_with(|| {
                let device_count = self.sessions.get(&user_id).map(|s| s.len()).unwrap_or(1);
                let capacity = (device_count * CAPACITY_PER_DEVICE)
                    .clamp(MIN_CHANNEL_CAPACITY, MAX_CHANNEL_CAPACITY);
                tracing::debug!(user = %user_id, devices = device_count, capacity, "creating channel");
                broadcast::channel(capacity).0
            })
            .clone()
    }

    pub(crate) fn cleanup_channel_if_empty(
        &self,
        user_id: &Uuid,
        tx: &broadcast::Sender<ClipboardMessage>,
    ) {
        if tx.receiver_count() == 0 {
            self.hub.remove(user_id);
            tracing::info!(user = %user_id, "fully disconnected");
        } else {
            tracing::debug!(user = %user_id, devices = tx.receiver_count(), "devices still connected");
        }
    }

    // --- Sessions ---

    pub(crate) fn add_session(
        &self,
        user_id: Uuid,
        device_id: &DeviceId,
        device_name: &DeviceName,
    ) {
        self.sessions.entry(user_id).or_default().insert(
            device_id.as_str().to_owned(),
            device_name.as_str().to_owned(),
        );
    }

    pub(crate) fn remove_session(&self, user_id: Uuid, device_id: &DeviceId) {
        if let Some(mut sessions) = self.sessions.get_mut(&user_id) {
            sessions.remove(device_id.as_str());
        }
    }

    pub(crate) fn get_sessions(&self, user_id: &Uuid) -> Vec<(String, String)> {
        self.sessions
            .get(user_id)
            .map(|s| s.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
            .unwrap_or_default()
    }

    pub(crate) fn online_device_ids(&self, user_id: &Uuid) -> Vec<String> {
        self.sessions
            .get(user_id)
            .map(|s| s.keys().cloned().collect())
            .unwrap_or_default()
    }

    // --- History ---

    pub(crate) fn add_to_history(&self, user_id: Uuid, msg: ClipboardMessage) {
        let mut entry = self
            .history
            .entry(user_id)
            .or_insert_with(|| Vec::with_capacity(MAX_HISTORY_SIZE));
        let history = entry.value_mut();
        history.insert(0, msg);
        history.truncate(MAX_HISTORY_SIZE);
    }

    pub(crate) fn get_history(&self, user_id: &Uuid) -> Vec<ClipboardMessage> {
        self.history
            .get(user_id)
            .map(|h| h.value().clone())
            .unwrap_or_default()
    }

    pub(crate) fn set_history(&self, user_id: Uuid, msgs: Vec<ClipboardMessage>) {
        *self.history.entry(user_id).or_default().value_mut() = msgs;
    }

    pub(crate) fn clear_history_memory(&self, user_id: &Uuid) -> Result<(), AppError> {
        self.history.remove(user_id);
        Ok(())
    }

    // --- Test introspection (not available in production builds) ---

    #[cfg(test)]
    pub fn channel_exists(&self, user_id: &Uuid) -> bool {
        self.hub.contains_key(user_id)
    }
}
