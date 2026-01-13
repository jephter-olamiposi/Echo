//! PostgreSQL repository layer using SQLx.

use crate::error::AppError;
use crate::models::ClipboardMessage;
use sqlx::PgPool;
use uuid::Uuid;

pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_user(
        &self,
        first_name: &str,
        last_name: &str,
        email: &str,
        password_hash: &str,
    ) -> Result<Uuid, AppError> {
        let result = sqlx::query!(
            "INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
            first_name,
            last_name,
            email,
            password_hash
        )
        .fetch_one(&self.pool)
        .await;

        match result {
            Ok(r) => Ok(r.id),
            Err(sqlx::Error::Database(e)) if e.is_unique_violation() => {
                Err(AppError::Conflict("Email already exists".into()))
            }
            Err(e) => Err(e.into()),
        }
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<(Uuid, String)>, AppError> {
        let user = sqlx::query!(
            "SELECT id, password_hash FROM users WHERE email = $1",
            email
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(user.map(|u| (u.id, u.password_hash)))
    }
}

/// Repository for clipboard history persistence
pub struct ClipboardHistoryRepository {
    pool: PgPool,
}

impl ClipboardHistoryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Add a clipboard message to history
    pub async fn add(&self, user_id: Uuid, msg: &ClipboardMessage) -> Result<(), AppError> {
        sqlx::query!(
            r#"
            INSERT INTO clipboard_history (user_id, device_id, device_name, content, nonce, encrypted, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            user_id,
            msg.device_id,
            msg.device_name,
            msg.content,
            msg.nonce,
            msg.encrypted,
            msg.timestamp as i64
        )
        .execute(&self.pool)
        .await?;

        // Keep only last 100 messages per user
        sqlx::query!(
            r#"
            DELETE FROM clipboard_history 
            WHERE user_id = $1 
            AND id NOT IN (
                SELECT id FROM clipboard_history 
                WHERE user_id = $1 
                ORDER BY timestamp DESC 
                LIMIT 100
            )
            "#,
            user_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get history for a user (newest first, limit 50)
    pub async fn get(&self, user_id: &Uuid, limit: i64) -> Result<Vec<ClipboardMessage>, AppError> {
        let rows = sqlx::query!(
            r#"
            SELECT device_id, device_name, content, nonce, encrypted, timestamp
            FROM clipboard_history
            WHERE user_id = $1
            ORDER BY timestamp DESC
            LIMIT $2
            "#,
            user_id,
            limit
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| ClipboardMessage {
                device_id: r.device_id,
                device_name: r.device_name,
                content: r.content,
                nonce: r.nonce,
                encrypted: r.encrypted.unwrap_or(true),
                timestamp: r.timestamp as u64,
                is_history: true,
            })
            .collect())
    }

    /// Clear all history for a user
    pub async fn clear(&self, user_id: &Uuid) -> Result<(), AppError> {
        sqlx::query!("DELETE FROM clipboard_history WHERE user_id = $1", user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
