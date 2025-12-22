use crate::{
    auth,
    db::UserRepository,
    error::AppError,
    middleware::AuthUser,
    models::{
        AuthResponse, ClipboardMessage, LoginRequest, PushTokenRequest, RegisterRequest, WsQuery,
        MSG_HANDSHAKE, MSG_PRESENCE,
    },
    state::AppState,
};
use axum::{
    extract::{
        ws::{Message, WebSocket},
        Query, State, WebSocketUpgrade,
    },
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use futures::{SinkExt, StreamExt};
use std::{sync::Arc, time::Duration};
use tokio::sync::Mutex;
use uuid::Uuid;

const PING_INTERVAL_SECS: u64 = 30;

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
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

    let token = auth::generate_jwt(user_id, &state.jwt_secret)?;
    Ok((StatusCode::OK, Json(AuthResponse { token })))
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<impl IntoResponse, AppError> {
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

    let token = auth::generate_jwt(user_id, &state.jwt_secret)?;
    Ok((StatusCode::CREATED, Json(AuthResponse { token })))
}

pub async fn protected(AuthUser { user_id }: AuthUser) -> impl IntoResponse {
    format!("Welcome! Your ID is: {user_id}")
}

pub async fn get_history(
    AuthUser { user_id }: AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    Json(state.get_history(&user_id))
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<WsQuery>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let claims = match auth::decode_jwt(&params.token, &state.jwt_secret) {
        Ok(claims) => claims,
        Err(_) => return (StatusCode::UNAUTHORIZED, "Invalid token").into_response(),
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, "Invalid user ID").into_response(),
    };

    ws.on_upgrade(move |socket| handle_socket(socket, state, user_id))
}

async fn handle_socket(socket: WebSocket, state: AppState, user_id: Uuid) {
    let (sender, mut receiver) = socket.split();

    // Wait for first message to extract device_id and name
    let (device_id, device_name) = loop {
        match receiver.next().await {
            Some(Ok(Message::Text(text))) if text != "ping" => {
                if let Ok(msg) = serde_json::from_str::<ClipboardMessage>(&text) {
                    tracing::info!(user = %user_id, device = %msg.device_id, "device connected");

                    // If it's a handshake, established connection
                    if msg.content == MSG_HANDSHAKE {
                        break (
                            msg.device_id,
                            msg.device_name.unwrap_or_else(|| "Unknown".to_string()),
                        );
                    }

                    // Process this first message as a fallback sync
                    if state.check_rate_limit(&msg.device_id) {
                        state.add_to_history(user_id, msg.clone());
                        let tx = state.get_or_create_channel(user_id);
                        let _ = tx.send(msg.clone());
                    }
                    break (
                        msg.device_id,
                        msg.device_name.unwrap_or_else(|| "Unknown".to_string()),
                    );
                }
            }
            Some(Ok(Message::Close(_))) => return,
            None => return,
            _ => continue,
        }
    };

    let sender = Arc::new(Mutex::new(sender));

    // Register session and broadcast presence
    state.add_session(user_id, device_id.clone(), device_name.clone());

    // 1. Broadcast my presence to others (JOIN)
    let mut presence_msg =
        ClipboardMessage::new(device_id.clone(), crate::models::MSG_PRESENCE_JOIN);
    presence_msg.device_name = Some(device_name.clone());
    let tx = state.get_or_create_channel(user_id);
    let _ = tx.send(presence_msg);

    // 2. Send existing devices to me so I can populate my list
    let existing_devices = state.get_sessions(&user_id);
    for (dev_id, dev_name) in existing_devices {
        if dev_id != device_id {
            let mut msg = ClipboardMessage::new(dev_id, crate::models::MSG_PRESENCE_JOIN);
            msg.device_name = Some(dev_name);
            if let Ok(json) = serde_json::to_string(&msg) {
                let _ = sender.lock().await.send(Message::Text(json.into())).await;
            }
        }
    }

    // 3. Replay history (Mailbox feature for offline mobile sync)
    // - Send the LATEST non-self message as "sync" (triggers clipboard write)
    // - Send older messages as "history" (populates UI only)
    let history = state.get_history(&user_id);
    let mut sent_sync = false;

    for mut msg in history {
        // Skip messages from this device (don't echo back)
        if msg.device_id == device_id {
            continue;
        }

        // Skip presence messages and pings
        if msg.content == MSG_PRESENCE || msg.content == MSG_HANDSHAKE || msg.content == "ping" {
            continue;
        }

        // First valid message = sync (write to clipboard)
        // Rest = history only (populate UI)
        msg.is_history = sent_sync;
        sent_sync = true;

        if let Ok(json) = serde_json::to_string(&msg) {
            if sender
                .lock()
                .await
                .send(Message::Text(json.into()))
                .await
                .is_err()
            {
                tracing::warn!(user = %user_id, "failed to send history, client disconnected");
                return;
            }
        }
    }

    tracing::info!(user = %user_id, device = %device_id, "history replay complete");

    let mut rx = tx.subscribe();

    let ping_sender = Arc::clone(&sender);
    let ping_task = tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(PING_INTERVAL_SECS));
        loop {
            interval.tick().await;
            if ping_sender
                .lock()
                .await
                .send(Message::Ping(vec![].into()))
                .await
                .is_err()
            {
                break;
            }
        }
    });

    let my_device = device_id.clone();
    let broadcast_sender = Arc::clone(&sender);
    let send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(msg) => {
                    if msg.device_id == my_device {
                        continue;
                    }
                    if let Ok(json) = serde_json::to_string(&msg) {
                        if broadcast_sender
                            .lock()
                            .await
                            .send(Message::Text(json.into()))
                            .await
                            .is_err()
                        {
                            break;
                        }
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                    tracing::warn!("Client lagged, skipped {} messages", skipped);
                    continue;
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    let recv_task = tokio::spawn(handle_incoming(
        receiver,
        tx.clone(),
        device_id.clone(),
        state.clone(),
        user_id,
    ));

    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
        _ = ping_task => {},
    }

    state.cleanup_channel_if_empty(&user_id, &tx);
    state.remove_session(user_id, &device_id);
    let presence_leave =
        ClipboardMessage::new(device_id.clone(), crate::models::MSG_PRESENCE_LEAVE);
    let _ = tx.send(presence_leave);
}

async fn handle_incoming(
    mut receiver: futures::stream::SplitStream<WebSocket>,
    tx: tokio::sync::broadcast::Sender<ClipboardMessage>,
    device_id: String,
    state: AppState,
    user_id: Uuid,
) {
    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(text) => {
                if text == "ping" {
                    continue;
                }

                let clipboard_msg = match serde_json::from_str::<ClipboardMessage>(&text) {
                    Ok(msg) => msg,
                    Err(_) => continue,
                };

                if !state.check_rate_limit(&device_id) {
                    tracing::warn!(device = %device_id, "rate limited");
                    continue;
                }

                state.add_to_history(user_id, clipboard_msg.clone());
                let _ = tx.send(clipboard_msg.clone());

                let offline_tokens = state.get_offline_push_tokens(&user_id, &device_id);
                if !offline_tokens.is_empty() {
                    if let Some(push_client) = state.push_client() {
                        let push_client = push_client.clone();
                        let device_name =
                            clipboard_msg.device_name.unwrap_or_else(|| "device".into());
                        tokio::spawn(async move {
                            for token in offline_tokens {
                                let _ = push_client.notify_sync(&token, &device_name).await;
                            }
                        });
                    }
                }
            }
            Message::Pong(_) => tracing::debug!(device = %device_id, "pong received"),
            Message::Close(_) => break,
            _ => {}
        }
    }
}

/// Register a push notification token for the authenticated user's device
pub async fn register_push_token(
    AuthUser { user_id }: AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<PushTokenRequest>,
) -> impl IntoResponse {
    state.store_push_token(user_id, &payload.device_id, &payload.token);
    StatusCode::OK
}
