//! Typed WebSocket protocol shared by the backend runtime and persistence layer.
//!
//! Handshake, presence, clipboard payloads, and protocol errors are modeled as
//! separate variants so invalid protocol states stay out of the sync loop.

use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum PresenceEvent {
    Join,
    Leave,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub(crate) struct HandshakeMessage {
    pub(crate) device_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) device_name: Option<String>,
    pub(crate) timestamp: u64,
}

impl HandshakeMessage {
    #[cfg(test)]
    pub(crate) fn new(device_id: impl Into<String>, device_name: Option<String>) -> Self {
        Self {
            device_id: device_id.into(),
            device_name,
            timestamp: now_millis(),
        }
    }
}

/// Ciphertext clipboard payload. The protocol variant guarantees this is the
/// encrypted sync path, so no additional boolean flag is needed.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub(crate) struct ClipboardMessage {
    pub(crate) device_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) device_name: Option<String>,
    pub(crate) content: String,
    pub(crate) nonce: String,
    pub(crate) timestamp: u64,
}

impl ClipboardMessage {
    #[cfg(test)]
    pub(crate) fn new(
        device_id: impl Into<String>,
        device_name: Option<String>,
        content: impl Into<String>,
        nonce: impl Into<String>,
    ) -> Self {
        Self {
            device_id: device_id.into(),
            device_name,
            content: content.into(),
            nonce: nonce.into(),
            timestamp: now_millis(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub(crate) struct PresenceMessage {
    pub(crate) device_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) device_name: Option<String>,
    pub(crate) event: PresenceEvent,
    pub(crate) timestamp: u64,
}

impl PresenceMessage {
    pub(crate) fn new(
        device_id: impl Into<String>,
        device_name: Option<String>,
        event: PresenceEvent,
    ) -> Self {
        Self {
            device_id: device_id.into(),
            device_name,
            event,
            timestamp: now_millis(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub(crate) struct ProtocolError {
    pub(crate) error: String,
    pub(crate) code: String,
}

impl ProtocolError {
    pub(crate) fn new(error: impl Into<String>, code: impl Into<String>) -> Self {
        Self {
            error: error.into(),
            code: code.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub(crate) enum ClientMessage {
    Handshake(HandshakeMessage),
    Clipboard(ClipboardMessage),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub(crate) struct ClipboardFrame {
    #[serde(flatten)]
    pub(crate) message: ClipboardMessage,
    #[serde(default)]
    pub(crate) is_history: bool,
}

impl ClipboardFrame {
    pub(crate) fn live(message: ClipboardMessage) -> Self {
        Self {
            message,
            is_history: false,
        }
    }

    pub(crate) fn history(message: ClipboardMessage) -> Self {
        Self {
            message,
            is_history: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub(crate) enum ServerMessage {
    Clipboard(ClipboardFrame),
    Presence(PresenceMessage),
    Error(ProtocolError),
}

impl ServerMessage {
    pub(crate) fn history(message: ClipboardMessage) -> Self {
        Self::Clipboard(ClipboardFrame::history(message))
    }

    pub(crate) fn live_clipboard(message: ClipboardMessage) -> Self {
        Self::Clipboard(ClipboardFrame::live(message))
    }

    pub(crate) fn presence_join(device_id: impl Into<String>, device_name: Option<String>) -> Self {
        Self::Presence(PresenceMessage::new(
            device_id,
            device_name,
            PresenceEvent::Join,
        ))
    }

    pub(crate) fn presence_leave(
        device_id: impl Into<String>,
        device_name: Option<String>,
    ) -> Self {
        Self::Presence(PresenceMessage::new(
            device_id,
            device_name,
            PresenceEvent::Leave,
        ))
    }

    pub(crate) fn error(error: impl Into<String>, code: impl Into<String>) -> Self {
        Self::Error(ProtocolError::new(error, code))
    }

    pub(crate) fn origin_device_id(&self) -> Option<&str> {
        match self {
            Self::Clipboard(frame) => Some(&frame.message.device_id),
            Self::Presence(msg) => Some(&msg.device_id),
            Self::Error(_) => None,
        }
    }
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
