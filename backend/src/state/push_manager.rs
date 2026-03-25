//! FCM push token storage and notification dispatch.
//! Token persistence to DB is coordinated by AppState.

use crate::push::PushClient;
use dashmap::DashMap;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::Semaphore;
use uuid::Uuid;

const MAX_CONCURRENT_PUSH_TASKS: usize = 50;

#[derive(Clone)]
pub(crate) struct PushManager {
    tokens: Arc<DashMap<Uuid, HashMap<String, String>>>,
    pub(crate) client: Option<Arc<PushClient>>,
    pub(crate) semaphore: Arc<Semaphore>,
}

impl PushManager {
    pub(crate) fn new(fcm_json: Option<String>, fcm_path: Option<String>) -> Self {
        let client = fcm_json
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

        if client.is_some() {
            tracing::info!("FCM push notifications enabled");
        }

        Self {
            tokens: Arc::default(),
            client,
            semaphore: Arc::new(Semaphore::new(MAX_CONCURRENT_PUSH_TASKS)),
        }
    }

    pub(crate) fn store(&self, user_id: Uuid, device_id: &str, token: &str) {
        self.tokens
            .entry(user_id)
            .or_default()
            .insert(device_id.to_string(), token.to_string());
        tracing::info!(user = %user_id, device = %device_id, "push token registered");
    }

    /// Returns FCM tokens for devices that are not currently online.
    /// `exclude_device` is the sending device (already online, no need to notify).
    /// `online_devices` is the set of currently connected device IDs.
    pub(crate) fn offline_tokens(
        &self,
        user_id: &Uuid,
        exclude_device: &str,
        online_devices: &HashSet<String>,
    ) -> Vec<String> {
        self.tokens
            .get(user_id)
            .map(|tokens| {
                tokens
                    .iter()
                    .filter(|(dev_id, _)| {
                        *dev_id != exclude_device && !online_devices.contains(*dev_id)
                    })
                    .map(|(_, token)| token.clone())
                    .collect()
            })
            .unwrap_or_default()
    }

    pub(crate) fn remove_by_value(&self, user_id: &Uuid, token_value: &str) {
        if let Some(mut tokens) = self.tokens.get_mut(user_id) {
            tokens.retain(|_, token| token != token_value);
            tracing::info!(user = %user_id, "removed invalid push token");
        }
    }

    pub(crate) fn snapshot(&self, user_id: &Uuid) -> Vec<(String, String)> {
        self.tokens
            .get(user_id)
            .map(|t| {
                t.iter()
                    .map(|(dev, tok)| (dev.clone(), tok.clone()))
                    .collect()
            })
            .unwrap_or_default()
    }

    pub(crate) fn load_from_snapshot(&self, user_id: Uuid, entries: Vec<(String, String)>) {
        let mut map = self.tokens.entry(user_id).or_default();
        for (dev, tok) in entries {
            map.insert(dev, tok);
        }
    }
}
