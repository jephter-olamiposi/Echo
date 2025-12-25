use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

pub const MSG_HANDSHAKE: &str = "handshake";
pub const MSG_PRESENCE: &str = "__PRESENCE__";
pub const MSG_PRESENCE_JOIN: &str = "__JOIN__";
pub const MSG_PRESENCE_LEAVE: &str = "__LEAVE__";

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug, Deserialize)]
pub struct WsQuery {
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardMessage {
    pub device_id: String,
    #[serde(default)]
    pub device_name: Option<String>,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nonce: Option<String>,
    #[serde(default)]
    pub encrypted: bool,
    pub timestamp: u64,
    #[serde(default)]
    pub is_history: bool,
}

impl ClipboardMessage {
    pub fn new(device_id: impl Into<String>, content: impl Into<String>) -> Self {
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

#[derive(Debug, Deserialize)]
pub struct PushTokenRequest {
    pub device_id: String,
    pub token: String,
}
