//! Echo backend — real-time clipboard sync server.

mod auth;
mod config;
mod db;
mod dto;
mod error;
mod handlers;
mod middleware;
mod protocol;
mod push;
mod state;
#[cfg(test)]
mod tests;
mod types;

use crate::state::AppState;
use axum::{
    http::{header, Method},
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::{env, net::SocketAddr};
use tokio::signal;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = config::Config::from_env()?;

    tracing::info!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&cfg.database_url)
        .await?;
    tracing::info!("Database connected");

    tracing::info!("Running migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("Migrations complete");

    let state = AppState::new(pool, cfg.jwt_secret, cfg.fcm_json, cfg.fcm_path);

    let allowed_origins: Vec<_> = cfg
        .allowed_origins
        .iter()
        .filter_map(|s| match s.parse() {
            Ok(origin) => Some(origin),
            Err(e) => {
                tracing::warn!(origin = %s, error = %e, "ignoring invalid ALLOWED_ORIGINS entry");
                None
            }
        })
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_methods([Method::GET, Method::POST, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_credentials(true);

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/ws", get(handlers::ws::ws_handler))
        .route("/protected", get(handlers::history::protected))
        .route(
            "/history",
            get(handlers::history::get_history).delete(handlers::history::clear_history),
        )
        .route(
            "/push/register",
            post(handlers::history::register_push_token),
        )
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let addr: SocketAddr = format!("{}:{}", cfg.host, cfg.port)
        .parse()
        .map_err(|_| anyhow::anyhow!("Invalid HOST:PORT combination: {}:{}", cfg.host, cfg.port))?;

    tracing::info!("Server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    tracing::info!("Server shutdown complete");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(e) = signal::ctrl_c().await {
            tracing::error!("Failed to install Ctrl+C handler: {e}");
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match signal::unix::signal(signal::unix::SignalKind::terminate()) {
            Ok(mut sig) => {
                sig.recv().await;
            }
            Err(e) => tracing::error!("Failed to install SIGTERM handler: {e}"),
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => tracing::info!("Received Ctrl+C, initiating graceful shutdown..."),
        _ = terminate => tracing::info!("Received SIGTERM, initiating graceful shutdown..."),
    }
}
