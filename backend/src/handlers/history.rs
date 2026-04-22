//! Clipboard history and push token handlers.

use crate::{
    dto::PushTokenRequest,
    error::AppError,
    middleware::AuthUser,
    state::AppState,
    types::{DeviceId, PushToken},
};
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};

pub(crate) async fn get_history(
    AuthUser { user_id }: AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    state.load_history_from_db(user_id).await;
    Json(state.get_history(&user_id))
}

pub(crate) async fn clear_history(
    AuthUser { user_id }: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    state.clear_history(user_id).await?;
    Ok(StatusCode::OK)
}

pub(crate) async fn register_push_token(
    AuthUser { user_id }: AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<PushTokenRequest>,
) -> Result<impl IntoResponse, AppError> {
    state.load_push_tokens_from_db(user_id).await;
    let device_id = DeviceId::parse(&payload.device_id)?;
    let token = PushToken::parse(&payload.token)?;

    state.store_push_token(user_id, &device_id, &token);
    Ok(StatusCode::OK)
}

pub(crate) async fn protected(AuthUser { user_id }: AuthUser) -> impl IntoResponse {
    format!("Welcome! Your ID is: {user_id}")
}
