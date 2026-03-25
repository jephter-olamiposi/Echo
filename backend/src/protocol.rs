//! WebSocket wire protocol — the message type exchanged between clients and the server.

use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) const MSG_HANDSHAKE: &str = "handshake";
pub(crate) const MSG_PRESENCE: &str = "__PRESENCE__";
pub(crate) const MSG_PRESENCE_JOIN: &str = "__JOIN__";
pub(crate) const MSG_PRESENCE_LEAVE: &str = "__LEAVE__";

/// A clipboard payload exchanged over the WebSocket channel.
///
/// All real clipboard payloads must carry `encrypted: true` and a `nonce` —
/// the server is a blind relay and never inspects the ciphertext.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct ClipboardMessage {
    pub(crate) device_id: String,
    #[serde(default)]
    pub(crate) device_name: Option<String>,
    pub(crate) content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) nonce: Option<String>,
    #[serde(default)]
    pub(crate) encrypted: bool,
    pub(crate) timestamp: u64,
    #[serde(default)]
    pub(crate) is_history: bool,
}

impl ClipboardMessage {
    pub(crate) fn new(device_id: impl Into<String>, content: impl Into<String>) -> Self {
        Self {
            device_id: device_id.into(),
            device_name: None,
            content: content.into(),
            nonce: None,
            encrypted: false,
            timestamp: now_millis(),
            is_history: false,
        }
    }
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
