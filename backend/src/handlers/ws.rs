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
    dto::WsQuery,
    protocol::{ClientMessage, ServerMessage},
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
use tokio::sync::{broadcast, mpsc};

const PING_INTERVAL_SECS: u64 = 15;
const HANDSHAKE_TIMEOUT_SECS: u64 = 10;
const MAX_CLIPBOARD_SIZE: usize = 10 * 1024 * 1024; // 10 MB
const WRITER_CHANNEL_CAPACITY: usize = 64;

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

    // Dedicated writer task: owns the sink exclusively - no mutex needed.
    let (write_tx, write_rx) = mpsc::channel::<Message>(WRITER_CHANNEL_CAPACITY);
    let mut writer_task = tokio::spawn(run_writer(sink, write_rx));

    let handshake = tokio::time::timeout(
        Duration::from_secs(HANDSHAKE_TIMEOUT_SECS),
        async {
            loop {
                match stream.next().await {
                    Some(Ok(Message::Text(text))) if text != "ping" => {
                        match serde_json::from_str::<ClientMessage>(&text) {
                            Ok(ClientMessage::Handshake(msg)) => {
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
                            Ok(ClientMessage::Clipboard(msg)) => {
                                tracing::warn!(
                                    user = %user_id,
                                    device = %msg.device_id,
                                    "rejected clipboard payload before handshake"
                                );
                            }
                            Err(e) => {
                                tracing::warn!(user = %user_id, error = %e, "failed to parse client message during handshake");
                            }
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

    state.add_session(user_id, &device_id, &device_name);

    let tx = state.get_or_create_channel(user_id);

    // Subscribe before history replay so any messages broadcast by other devices during
    // the (async) DB load are buffered in rx rather than silently dropped.
    let mut rx = tx.subscribe();

    let _ = tx.send(ServerMessage::presence_join(
        device_id.as_str(),
        Some(device_name.as_str().to_owned()),
    ));

    for (peer_id, peer_name) in state.get_sessions(&user_id) {
        if peer_id != device_id.as_str()
            && enqueue_server_message(
                &write_tx,
                ServerMessage::presence_join(peer_id, Some(peer_name)),
            )
            .await
            .is_err()
        {
            drop(rx);
            writer_task.abort();
            let _ = writer_task.await;
            cleanup_connection(&state, user_id, &device_id, &tx);
            return;
        }
    }

    state.load_history_from_db(user_id).await;
    state.load_push_tokens_from_db(user_id).await;

    for msg in state.get_history(&user_id).into_iter().rev() {
        if msg.device_id == device_id.as_str() {
            continue;
        }

        if enqueue_server_message(&write_tx, ServerMessage::history(msg))
            .await
            .is_err()
        {
            tracing::warn!(user = %user_id, "client disconnected during history replay");
            drop(rx);
            writer_task.abort();
            let _ = writer_task.await;
            cleanup_connection(&state, user_id, &device_id, &tx);
            return;
        }
    }
    tracing::info!(user = %user_id, device = %device_id.as_str(), "history replay complete");

    let ping_tx = write_tx.clone();
    let mut ping_task = tokio::spawn(async move {
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
    let mut send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(msg) => {
                    if msg
                        .origin_device_id()
                        .is_some_and(|origin| origin == my_device)
                    {
                        continue;
                    }

                    if enqueue_server_message(&send_tx, msg).await.is_err() {
                        break;
                    }
                }
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    tracing::warn!(skipped = n, "client lagged on broadcast channel");
                }
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    let mut recv_task = tokio::spawn(handle_incoming(
        stream,
        tx.clone(),
        write_tx.clone(),
        device_id.clone(),
        device_name.clone(),
        state.clone(),
        user_id,
    ));

    tokio::select! {
        _ = &mut send_task => {},
        _ = &mut recv_task => {},
        _ = &mut ping_task => {},
        _ = &mut writer_task => {},
    }

    send_task.abort();
    recv_task.abort();
    ping_task.abort();
    writer_task.abort();

    let _ = send_task.await;
    let _ = recv_task.await;
    let _ = ping_task.await;
    let _ = writer_task.await;

    cleanup_connection(&state, user_id, &device_id, &tx);
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
    tx: broadcast::Sender<ServerMessage>,
    write_tx: mpsc::Sender<Message>,
    device_id: DeviceId,
    device_name: DeviceName,
    state: AppState,
    user_id: uuid::Uuid,
) {
    while let Some(Ok(msg)) = stream.next().await {
        match msg {
            Message::Text(text) => {
                if text == "ping" {
                    continue;
                }

                let mut clipboard_msg = match serde_json::from_str::<ClientMessage>(&text) {
                    Ok(ClientMessage::Clipboard(msg)) => msg,
                    Ok(ClientMessage::Handshake(_)) => {
                        tracing::warn!(user = %user_id, device = %device_id, "ignored duplicate handshake");
                        continue;
                    }
                    Err(e) => {
                        tracing::warn!(
                            user = %user_id,
                            device = %device_id,
                            error = %e,
                            "failed to parse client message"
                        );
                        continue;
                    }
                };

                // INVARIANT: always use the server-validated identity from the handshake.
                // Clients must not be able to spoof a different device identity mid-session.
                clipboard_msg.device_id = device_id.as_str().to_owned();
                clipboard_msg.device_name = Some(device_name.as_str().to_owned());

                if clipboard_msg.content.len() > MAX_CLIPBOARD_SIZE {
                    tracing::warn!(
                        user = %user_id,
                        device = %device_id,
                        size = clipboard_msg.content.len(),
                        "clipboard content too large, dropping"
                    );
                    continue;
                }

                if clipboard_msg.nonce.is_empty() {
                    tracing::warn!(user = %user_id, device = %device_id, "missing nonce, dropping");
                    continue;
                }

                if !state.check_rate_limit(device_id.as_str()) {
                    tracing::warn!(device = %device_id, "rate limited");
                    let _ = enqueue_server_message(
                        &write_tx,
                        ServerMessage::error(
                            "Too many clipboard updates. Slow down.",
                            "RATE_LIMIT",
                        ),
                    )
                    .await;
                    continue;
                }

                state.add_to_history(user_id, clipboard_msg.clone());
                let _ = tx.send(ServerMessage::live_clipboard(clipboard_msg.clone()));

                let offline_tokens = state.get_offline_push_tokens(&user_id, &device_id);
                if !offline_tokens.is_empty() {
                    if let Some(client) = state.push.client.clone() {
                        let semaphore = state.push.semaphore.clone();
                        let state_clone = state.clone();
                        let device_name = clipboard_msg
                            .device_name
                            .clone()
                            .unwrap_or_else(|| "device".into());
                        tokio::spawn(async move {
                            let _permit = semaphore.acquire().await.ok();
                            for token in offline_tokens {
                                match client.notify_sync(&token, &device_name).await {
                                    Ok(()) => {}
                                    Err(PushError::InvalidToken) => {
                                        state_clone.remove_push_token_by_value(&user_id, &token);
                                    }
                                    Err(e) => {
                                        tracing::warn!(user = %user_id, error = %e, "push notification failed");
                                    }
                                }
                            }
                        });
                    }
                }
            }
            Message::Ping(_) | Message::Pong(_) => {}
            Message::Close(_) => break,
            _ => {}
        }
    }
}

async fn enqueue_server_message(
    write_tx: &mpsc::Sender<Message>,
    message: ServerMessage,
) -> Result<(), ()> {
    let json = serde_json::to_string(&message).map_err(|e| {
        tracing::warn!(error = %e, "failed to serialize server message");
    })?;

    write_tx
        .send(Message::Text(json.into()))
        .await
        .map_err(|_| ())
}

fn cleanup_connection(
    state: &AppState,
    user_id: uuid::Uuid,
    device_id: &DeviceId,
    tx: &broadcast::Sender<ServerMessage>,
) {
    state.remove_session(user_id, device_id);
    let leave_msg = ServerMessage::presence_leave(device_id.as_str(), None);
    let _ = tx.send(leave_msg);
    state.cleanup_channel_if_empty(&user_id, tx);
}
