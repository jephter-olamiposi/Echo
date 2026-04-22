//! Validated domain newtypes — all invariants are enforced at construction.
//! Callers that hold a `DeviceId`, `DeviceName`, or `PushToken` are guaranteed
//! it has already passed its validation rules.

use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::fmt;

// ── DeviceId ─────────────────────────────────────────────────────────────────

const MAX_DEVICE_ID_BYTES: usize = 256;

/// A non-empty device identifier, at most 256 bytes.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub(crate) struct DeviceId(String);

impl DeviceId {
    pub(crate) fn parse(raw: &str) -> Result<Self, AppError> {
        if raw.is_empty() || raw.len() > MAX_DEVICE_ID_BYTES {
            return Err(AppError::BadRequest("Invalid device_id".into()));
        }
        Ok(Self(raw.to_owned()))
    }

    pub(crate) fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for DeviceId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl AsRef<str> for DeviceId {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

// ── DeviceName ────────────────────────────────────────────────────────────────

const MAX_DEVICE_NAME_BYTES: usize = 256;

/// A normalized device display name, at most 256 bytes.
/// Blank or whitespace-only values collapse to the default `"Unknown"`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub(crate) struct DeviceName(String);

impl DeviceName {
    pub(crate) fn parse(raw: &str) -> Result<Self, AppError> {
        let trimmed = raw.trim();
        if trimmed.len() > MAX_DEVICE_NAME_BYTES {
            return Err(AppError::BadRequest("Device name too long".into()));
        }
        if trimmed.is_empty() {
            return Ok(Self::default());
        }
        Ok(Self(trimmed.to_owned()))
    }

    pub(crate) fn as_str(&self) -> &str {
        &self.0
    }
}

impl Default for DeviceName {
    fn default() -> Self {
        Self("Unknown".to_owned())
    }
}

impl fmt::Display for DeviceName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl AsRef<str> for DeviceName {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

// ── PushToken ─────────────────────────────────────────────────────────────────

const MAX_PUSH_TOKEN_BYTES: usize = 512;

/// A non-empty FCM push token: ASCII alphanumeric plus `-`, `_`, `.`, `:`.
/// At most 512 bytes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub(crate) struct PushToken(String);

impl PushToken {
    pub(crate) fn parse(raw: &str) -> Result<Self, AppError> {
        if raw.is_empty() || raw.len() > MAX_PUSH_TOKEN_BYTES {
            return Err(AppError::BadRequest("Push token too long".into()));
        }
        if !raw
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "-_.:".contains(c))
        {
            return Err(AppError::BadRequest("Invalid push token format".into()));
        }
        Ok(Self(raw.to_owned()))
    }

    pub(crate) fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for PushToken {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl AsRef<str> for PushToken {
    fn as_ref(&self) -> &str {
        &self.0
    }
}
