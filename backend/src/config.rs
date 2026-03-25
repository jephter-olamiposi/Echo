//! Environment-based server configuration.

use anyhow::{Context, Result};
use std::env;

pub(crate) struct Config {
    pub(crate) database_url: String,
    pub(crate) jwt_secret: String,
    pub(crate) fcm_json: Option<String>,
    pub(crate) fcm_path: Option<String>,
    pub(crate) port: u16,
    pub(crate) host: String,
    pub(crate) allowed_origins: Vec<String>,
}

impl Config {
    pub(crate) fn from_env() -> Result<Self> {
        let database_url =
            env::var("DATABASE_URL").context("DATABASE_URL environment variable is required")?;
        let jwt_secret =
            env::var("JWT_SECRET").context("JWT_SECRET environment variable is required")?;

        let fcm_json = env::var("FCM_SERVICE_ACCOUNT_JSON")
            .or_else(|_| env::var("FIREBASE_SERVICE_ACCOUNT_JSON"))
            .ok();
        let fcm_path = env::var("FCM_SERVICE_ACCOUNT_PATH")
            .or_else(|_| env::var("FIREBASE_SERVICE_ACCOUNT"))
            .or_else(|_| env::var("GOOGLE_APPLICATION_CREDENTIALS"))
            .ok();

        let port = env::var("PORT")
            .unwrap_or_else(|_| "3000".into())
            .parse::<u16>()
            .context("PORT must be a valid u16")?;

        let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into());

        let allowed_origins = env::var("ALLOWED_ORIGINS")
            .unwrap_or_else(|_| {
                "http://localhost:1420,http://127.0.0.1:1420,tauri://localhost".into()
            })
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        Ok(Self {
            database_url,
            jwt_secret,
            fcm_json,
            fcm_path,
            port,
            host,
            allowed_origins,
        })
    }
}
