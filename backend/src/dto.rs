//! HTTP request/response data-transfer objects and JWT claims.

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub(crate) struct RegisterRequest {
    pub(crate) first_name: String,
    pub(crate) last_name: String,
    pub(crate) email: String,
    pub(crate) password: String,
}

#[derive(Debug, Deserialize)]
pub(crate) struct LoginRequest {
    pub(crate) email: String,
    pub(crate) password: String,
}

#[derive(Debug, Serialize)]
pub(crate) struct AuthResponse {
    pub(crate) token: String,
}

/// JWT claims payload (48-hour expiry).
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Claims {
    pub(crate) sub: String,
    pub(crate) exp: usize,
    pub(crate) iat: usize,
}

/// Query parameters for the WebSocket upgrade endpoint.
#[derive(Debug, Deserialize)]
pub(crate) struct WsQuery {
    pub(crate) token: String,
}

#[derive(Debug, Deserialize)]
pub(crate) struct PushTokenRequest {
    pub(crate) device_id: String,
    pub(crate) token: String,
}
