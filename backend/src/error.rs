//! Unified error types with HTTP status code mapping.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub(crate) enum AppError {
    /// Authentication/authorization failure (401 Unauthorized)
    #[error("Authentication error: {0}")]
    Auth(String),

    /// Database operation failure (500 Internal Server Error)
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    /// Internal server error (500 Internal Server Error)
    #[error("Internal error: {0}")]
    Internal(String),

    /// Resource conflict (409 Conflict)
    #[error("Conflict: {0}")]
    Conflict(String),

    /// Invalid request data (400 Bad Request)
    #[error("Bad request: {0}")]
    BadRequest(String),

    /// Request exceeded an explicit rate limit (429 Too Many Requests)
    #[error("Rate limited: {0}")]
    RateLimited(String),

    /// JWT token error (500 Internal Server Error)
    #[error("Token error: {0}")]
    Token(#[from] jsonwebtoken::errors::Error),

    /// Async task panicked (500 Internal Server Error)
    #[error("Task error: {0}")]
    Task(#[from] tokio::task::JoinError),
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    code: Option<String>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message, code) = match &self {
            Self::Auth(msg) => (StatusCode::UNAUTHORIZED, msg.clone(), Some("AUTH_ERROR")),
            Self::Database(e) => {
                tracing::error!(error = %e, "Database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".into(),
                    Some("DB_ERROR"),
                )
            }
            Self::Internal(msg) => {
                tracing::error!(error = %msg, "Internal error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal error".into(),
                    Some("INTERNAL_ERROR"),
                )
            }
            Self::Conflict(msg) => (StatusCode::CONFLICT, msg.clone(), Some("CONFLICT")),
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone(), Some("BAD_REQUEST")),
            Self::RateLimited(msg) => (
                StatusCode::TOO_MANY_REQUESTS,
                msg.clone(),
                Some("RATE_LIMIT"),
            ),
            Self::Token(e) => {
                tracing::error!(error = %e, "Token error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Token error".into(),
                    Some("TOKEN_ERROR"),
                )
            }
            Self::Task(e) => {
                tracing::error!(error = %e, "Task error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal error".into(),
                    Some("TASK_ERROR"),
                )
            }
        };

        (
            status,
            Json(ErrorBody {
                error: message,
                code: code.map(String::from),
            }),
        )
            .into_response()
    }
}
