mod auth;
mod db;
mod error;
mod handler;
mod middleware;
mod models;
mod push;
mod state;
#[cfg(test)]
mod tests;

use crate::state::AppState;
use axum::{
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use tokio::signal;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL required");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET required");

    // Prefer explicit JSON first, then file path fallbacks compatible with common setups.
    let fcm_json = std::env::var("FCM_SERVICE_ACCOUNT_JSON")
        .or_else(|_| std::env::var("FIREBASE_SERVICE_ACCOUNT_JSON"))
        .ok();

    let fcm_path = std::env::var("FCM_SERVICE_ACCOUNT_PATH")
        .or_else(|_| std::env::var("FIREBASE_SERVICE_ACCOUNT"))
        .or_else(|_| std::env::var("GOOGLE_APPLICATION_CREDENTIALS"))
        .ok();

    tracing::info!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(50)
        .connect(&database_url)
        .await?;
    tracing::info!("Database connected");

    tracing::info!("Running migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    tracing::info!("Migrations ran successfully");

    let state = AppState::new(pool, jwt_secret, fcm_json, fcm_path);

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/register", post(handler::register))
        .route("/login", post(handler::login))
        .route("/ws", get(handler::ws_handler))
        .route("/protected", get(handler::protected))
        .route("/history", get(handler::get_history))
        .route("/push/register", post(handler::register_push_token))
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(
                    std::env::var("ALLOWED_ORIGINS")
                        .unwrap_or_else(|_| "http://localhost:1420,http://127.0.0.1:1420,tauri://localhost".to_string())
                        .split(',')
                        .map(|s| s.trim().parse().unwrap())
                        .collect::<Vec<_>>()
                )
                .allow_methods([axum::http::Method::GET, axum::http::Method::POST])
                .allow_headers([axum::http::header::CONTENT_TYPE, axum::http::header::AUTHORIZATION])
                .allow_credentials(true)
        )
        .with_state(state);

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .expect("Invalid PORT");

    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .expect("Invalid HOST:PORT combination");

    tracing::info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    
    // Setup graceful shutdown
    let server = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal());

    tracing::info!("Server starting with graceful shutdown support");
    server.await?;
    tracing::info!("Server shutdown complete");

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("Received Ctrl+C, initiating graceful shutdown...");
        },
        _ = terminate => {
            tracing::info!("Received SIGTERM, initiating graceful shutdown...");
        },
    }
}
