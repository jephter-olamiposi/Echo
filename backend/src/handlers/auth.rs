//! Authentication handlers: register and login.

use crate::{
    auth,
    db::UserRepository,
    dto::{AuthResponse, LoginRequest, RegisterRequest},
    error::AppError,
    state::AppState,
};
use axum::{
    extract::{ConnectInfo, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::net::SocketAddr;

pub(crate) async fn register(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(payload): Json<RegisterRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !state.check_rate_limit_custom(&format!("register:{}", addr.ip()), 3, 3600) {
        return Err(AppError::Auth(
            "Too many account creations. Please try again later.".into(),
        ));
    }

    let password = payload.password;
    let hash = tokio::task::spawn_blocking(move || auth::hash_password(password)).await??;

    let repo = UserRepository::new(state.pool.clone());
    let user_id = repo
        .create_user(
            &payload.first_name,
            &payload.last_name,
            &payload.email,
            &hash,
        )
        .await?;

    let token = auth::generate_jwt(user_id, state.jwt_secret())?;
    Ok((StatusCode::CREATED, Json(AuthResponse { token })))
}

pub(crate) async fn login(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !state.check_rate_limit_custom(&format!("login:{}", addr.ip()), 5, 900) {
        return Err(AppError::Auth(
            "Too many attempts. Please try again later.".into(),
        ));
    }

    let repo = UserRepository::new(state.pool.clone());
    let (user_id, hash) = repo
        .find_by_email(&payload.email)
        .await?
        .ok_or_else(|| AppError::Auth("Invalid credentials".into()))?;

    let password = payload.password;
    let valid =
        tokio::task::spawn_blocking(move || auth::verify_password(password, hash).unwrap_or(false))
            .await?;

    if !valid {
        return Err(AppError::Auth("Invalid credentials".into()));
    }

    let token = auth::generate_jwt(user_id, state.jwt_secret())?;
    Ok((StatusCode::OK, Json(AuthResponse { token })))
}
