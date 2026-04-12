//! WebSocket handler: connection lifecycle, handshake, history replay, and sync loop.
//!
//! Key design decisions:
//! - A dedicated writer task owns the sink exclusively, accepting messages via mpsc.
//!   This eliminates Arc<Mutex<SplitSink>> and the resulting lock-across-await pattern.
//! - The handshake has a 10s timeout to prevent connections from stalling indefinitely.
//! - Three concurrent tasks (send, recv, ping) race in a select!; whichever exits first
//!   triggers cleanup of the others.

use crate::{
    auth,
    protocol::{
        ClipboardMessage, MSG_HANDSHAKE, MSG_PRESENCE, MSG_PRESENCE_JOIN, MSG_PRESENCE_LEAVE,
    },
    push::PushError,
    state::AppState,
    types::{DeviceId, DeviceName},
};
use axum::{
    extract::{
        ws::{Message, WebSocket},
        Query, State, WebSocketUpgrade,
    },
    http::StatusCode,
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use std::time::Duration;
use tokio::sync::mpsc;

const PING_INTERVAL_SECS: u64 = 15;
const HANDSHAKE_TIMEOUT_SECS: u64 = 10;
const MAX_CLIPBOARD_SIZE: usize = 10 * 1024 * 1024; // 10 MB
const WRITER_CHANNEL_CAPACITY: usize = 64;

use crate::dto::WsQuery;

pub(crate) async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<WsQuery>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let claims = match auth::decode_jwt(&params.token, state.jwt_secret()) {
        Ok(claims) => claims,
        Err(_) => return (StatusCode::UNAUTHORIZED, "Invalid token").into_response(),
    };

    let user_id = match uuid::Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, "Invalid user ID").into_response(),
    };

    ws.on_upgrade(move |socket| handle_socket(socket, state, user_id))
}

async fn handle_socket(socket: WebSocket, state: AppState, user_id: uuid::Uuid) {
    let (sink, mut stream) = socket.split();

    // Dedicated writer task: owns the sink exclusively — no mutex needed.
    let (write_tx, write_rx) = mpsc::channel::<Message>(WRITER_CHANNEL_CAPACITY);
    let writer_task = tokio::spawn(run_writer(sink, write_rx));

    // --- Handshake (with timeout) ---
    let handshake = tokio::time::timeout(
        Duration::from_secs(HANDSHAKE_TIMEOUT_SECS),
        async {
            loop {
                match stream.next().await {
                    Some(Ok(Message::Text(text))) if text != "ping" => {
                        if let Ok(msg) = serde_json::from_str::<ClipboardMessage>(&text) {
                            if msg.content == MSG_HANDSHAKE {
                                let id = match DeviceId::parse(&msg.device_id) {
                                    Ok(id) => id,
                                    Err(_) => {
                                        tracing::warn!(user = %user_id, "invalid device_id in handshake");
                                        return None;
                                    }
                                };
                                let name = msg
                                    .device_name
                                    .as_deref()
                                    .map(DeviceName::parse)
                                    .transpose()
                                    .unwrap_or_else(|_| Some(DeviceName::default()))
                                    .unwrap_or_default();
                                tracing::info!(user = %user_id, device = %id, "handshake completed");
                                return Some((id, name));
                            }
                            tracing::warn!(
                                user = %user_id,
                                device = %msg.device_id,
                                "rejected non-handshake message during connection"
                            );
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => return None,
                    _ => continue,
                }
            }
        },
    )
    .await;

    let (device_id, device_name) = match handshake {
        Ok(Some(result)) => result,
        Ok(None) => return,
        Err(_) => {
            tracing::warn!(user = %user_id, "handshake timeout after {HANDSHAKE_TIMEOUT_SECS}s");
            return;
        }
    };

    // --- Session registration and presence ---
    state.add_session(user_id, &device_id, &device_name);

    let tx = state.get_or_create_channel(user_id);

    // Subscribe before history replay so any messages broadcast by other devices during
    // the (async) DB load are buffered in rx rather than silently dropped.
    let mut rx = tx.subscribe();

    let mut join_msg = ClipboardMessage::new(device_id.as_str(), MSG_PRESENCE_JOIN);
    join_msg.device_name = Some(device_name.as_str().to_owned());
    let _ = tx.send(join_msg);

    // Notify connecting device of already-online peers.
    for (dev_id, dev_name) in state.get_sessions(&user_id) {
        if dev_id != device_id.as_str() {
            let mut msg = ClipboardMessage::new(dev_id, MSG_PRESENCE_JOIN);
            msg.device_name = Some(dev_name);
            if let Ok(json) = serde_json::to_string(&msg) {
                let _ = write_tx.send(Message::Text(json.into())).await;
            }
        }
    }

    // --- History replay ---
    state.load_history_from_db(user_id).await;
    state.load_push_tokens_from_db(user_id).await;

    for mut msg in state.get_history(&user_id) {
        if msg.device_id == device_id.as_str() {
            continue;
        }
        if matches!(
            msg.content.as_str(),
            c if c == MSG_PRESENCE || c == MSG_HANDSHAKE || c == "ping"
        ) {
            continue;
        }
        msg.is_history = true;
        if let Ok(json) = serde_json::to_string(&msg) {
            if write_tx.send(Message::Text(json.into())).await.is_err() {
                tracing::warn!(user = %user_id, "client disconnected during history replay");
                state.remove_session(user_id, &device_id);
                return;
            }
        }
    }
    tracing::info!(user = %user_id, device = %device_id.as_str(), "history replay complete");

    // --- Concurrent sync tasks ---
    let ping_tx = write_tx.clone();
    let ping_task = tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(PING_INTERVAL_SECS));
        loop {
            interval.tick().await;
            if ping_tx.send(Message::Ping(vec![].into())).await.is_err() {
                break;
            }
        }
    });

    let my_device = device_id.as_str().to_owned();
    let send_tx = write_tx.clone();
    let send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(msg) => {
                    if msg.device_id == my_device {
                        continue;
                    }
                    if let Ok(json) = serde_json::to_string(&msg) {
                        if send_tx.send(Message::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                    tracing::warn!(skipped = n, "client lagged on broadcast channel");
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    let recv_task = tokio::spawn(handle_incoming(
        stream,
        tx.clone(),
        write_tx.clone(),
        device_id.clone(),
        state.clone(),
        user_id,
    ));

    tokio::select! {
        _ = send_task  => {},
        _ = recv_task  => {},
        _ = ping_task  => {},
        _ = writer_task => {},
    }

    // --- Cleanup ---
    state.remove_session(user_id, &device_id);
    let leave_msg = ClipboardMessage::new(device_id.as_str(), MSG_PRESENCE_LEAVE);
    let _ = tx.send(leave_msg);
    state.cleanup_channel_if_empty(&user_id, &tx);
}

/// Dedicated sink writer. Owns the WebSocket sink exclusively.
/// Exits when the channel is closed (all senders dropped after select! cleanup).
async fn run_writer(
    mut sink: futures::stream::SplitSink<WebSocket, Message>,
    mut rx: mpsc::Receiver<Message>,
) {
    while let Some(msg) = rx.recv().await {
        if sink.send(msg).await.is_err() {
            break;
        }
    }
}

async fn handle_incoming(
    mut stream: futures::stream::SplitStream<WebSocket>,
    tx: tokio::sync::broadcast::Sender<ClipboardMessage>,
    write_tx: mpsc::Sender<Message>,
    device_id: DeviceId,
    state: AppState,
    user_id: uuid::Uuid,
) {
    while let Some(Ok(msg)) = stream.next().await {
        match msg {
            Message::Text(text) => {
                if text == "ping" {
                    continue;
                }

                let mut clipboard_msg = match serde_json::from_str::<ClipboardMessage>(&text) {
                    Ok(msg) => msg,
                    Err(e) => {
                        tracing::warn!(
                            user = %user_id,
                            device = %device_id,
                            error = %e,
                            "failed to parse clipboard message"
                        );
                        continue;
                    }
                };
                // INVARIANT: always use the server-validated device_id from the handshake.
                // Clients must not be able to spoof a different device identity mid-session.
                clipboard_msg.device_id = device_id.as_str().to_owned();

                if clipboard_msg.content.len() > MAX_CLIPBOARD_SIZE {
                    tracing::warn!(
                        user = %user_id,
                        device = %device_id,
                        size = clipboard_msg.content.len(),
                        "clipboard content too large, dropping"
                    );
                    continue;
                }

                if let Some(ref name) = clipboard_msg.device_name {
                    if DeviceName::parse(name).is_err() {
                        tracing::warn!(user = %user_id, device = %device_id, "device name too long, dropping");
                        continue;
                    }
                }

                if !state.check_rate_limit(device_id.as_str()) {
                    tracing::warn!(device = %device_id, "rate limited");
                    let _ = write_tx
                        .send(Message::Text(
                            r#"{"error":"rate_limited","code":"RATE_LIMIT"}"#.into(),
                        ))
                        .await;
                    continue;
                }

                state.add_to_history(user_id, clipboard_msg.clone());
                let _ = tx.send(clipboard_msg.clone());

                let offline_tokens = state.get_offline_push_tokens(&user_id, &device_id);
                if !offline_tokens.is_empty() {
                    if let Some(client) = state.push.client.clone() {
                        let semaphore = state.push.semaphore.clone();
                        let state_clone = state.clone();
                        let device_name =
                            clipboard_msg.device_name.unwrap_or_else(|| "device".into());
                        tokio::spawn(async move {
                            let _permit = semaphore.acquire().await.ok();
                            for token in offline_tokens {
                                match client.notify_sync(&token, &device_name).await {
                                    Ok(_) => {}
                                    Err(PushError::InvalidToken) => {
                                        // Remove the stale token and persist the change.
                                        state_clone.remove_push_token_by_value(&user_id, &token);
                                    }
                                    Err(PushError::Other(e)) => {
                                        tracing::warn!(error = %e, "push notification failed");
                                    }
                                }
                            }
                        });
                    }
                }
            }
            Message::Pong(_) => tracing::trace!(device = %device_id, "pong received"),
            Message::Close(_) => break,
            _ => {}
        }
    }
}
