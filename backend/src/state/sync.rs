//! Per-user broadcast channels, clipboard history, and device session tracking.
//! All operations are pure in-memory. DB persistence is coordinated by AppState.

use crate::protocol::{ClipboardMessage, ServerMessage};
use crate::types::{DeviceId, DeviceName};
use dashmap::DashMap;
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::broadcast;
use uuid::Uuid;

pub(crate) const MAX_HISTORY_SIZE: usize = 50;
const MIN_CHANNEL_CAPACITY: usize = 50;
const MAX_CHANNEL_CAPACITY: usize = 500;
const CAPACITY_PER_DEVICE: usize = 25;

#[derive(Clone, Default)]
pub(crate) struct SyncState {
    hub: Arc<DashMap<Uuid, broadcast::Sender<ServerMessage>>>,
    history: Arc<DashMap<Uuid, VecDeque<ClipboardMessage>>>,
    sessions: Arc<DashMap<Uuid, HashMap<String, String>>>,
}

impl SyncState {
    // --- Broadcast channels ---

    pub(crate) fn get_or_create_channel(&self, user_id: Uuid) -> broadcast::Sender<ServerMessage> {
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
        tx: &broadcast::Sender<ServerMessage>,
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
            let should_remove_user = sessions.is_empty();
            drop(sessions);
            if should_remove_user {
                self.sessions.remove(&user_id);
            }
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
            .or_insert_with(|| VecDeque::with_capacity(MAX_HISTORY_SIZE + 1));
        let history = entry.value_mut();
        history.push_front(msg);
        if history.len() > MAX_HISTORY_SIZE {
            history.pop_back();
        }
    }

    pub(crate) fn get_history(&self, user_id: &Uuid) -> Vec<ClipboardMessage> {
        self.history
            .get(user_id)
            .map(|h| h.iter().cloned().collect())
            .unwrap_or_default()
    }

    pub(crate) fn set_history(&self, user_id: Uuid, msgs: Vec<ClipboardMessage>) {
        *self.history.entry(user_id).or_default().value_mut() = msgs.into_iter().collect();
    }

    /// Returns true if history has already been loaded into memory for this user.
    /// Used to guard against overwriting live in-memory state with a stale DB snapshot.
    pub(crate) fn has_history(&self, user_id: &Uuid) -> bool {
        self.history.contains_key(user_id)
    }

    pub(crate) fn clear_history_memory(&self, user_id: &Uuid) {
        self.history.remove(user_id);
    }

    // --- Test introspection (not available in production builds) ---

    #[cfg(test)]
    pub fn channel_exists(&self, user_id: &Uuid) -> bool {
        self.hub.contains_key(user_id)
    }
}
