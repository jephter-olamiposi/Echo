//! PostgreSQL repository layer using SQLx.

use crate::error::AppError;
use crate::protocol::ClipboardMessage;
use sqlx::PgPool;
use uuid::Uuid;

pub(crate) struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub(crate) fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub(crate) async fn create_user(
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

    pub(crate) async fn find_by_email(
        &self,
        email: &str,
    ) -> Result<Option<(Uuid, String)>, AppError> {
        let user = sqlx::query!(
            "SELECT id, password_hash FROM users WHERE email = $1",
            email
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(user.map(|u| (u.id, u.password_hash)))
    }

    /// Overwrites the `push_tokens` JSONB column for the given user.
    pub(crate) async fn update_push_tokens(
        &self,
        user_id: Uuid,
        tokens: Vec<(String, String)>,
    ) -> Result<(), AppError> {
        let json = serde_json::Value::Array(
            tokens
                .into_iter()
                .map(|(dev, tok)| serde_json::json!({"device_id": dev, "token": tok}))
                .collect(),
        );
        sqlx::query!(
            "UPDATE users SET push_tokens = $1 WHERE id = $2",
            json,
            user_id
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Loads push tokens for the given user from the database.
    pub(crate) async fn get_push_tokens(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<(String, String)>, AppError> {
        let row = sqlx::query!("SELECT push_tokens FROM users WHERE id = $1", user_id)
            .fetch_optional(&self.pool)
            .await?;

        let tokens = row
            .and_then(|r| r.push_tokens)
            .and_then(|v| v.as_array().cloned())
            .unwrap_or_default()
            .into_iter()
            .filter_map(|item| {
                let dev = item.get("device_id")?.as_str()?.to_owned();
                let tok = item.get("token")?.as_str()?.to_owned();
                Some((dev, tok))
            })
            .collect();

        Ok(tokens)
    }
}

pub(crate) struct ClipboardHistoryRepository {
    pool: PgPool,
}

impl ClipboardHistoryRepository {
    pub(crate) fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub(crate) async fn add(&self, user_id: Uuid, msg: &ClipboardMessage) -> Result<(), AppError> {
        let mut tx = self.pool.begin().await?;

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
        .execute(&mut *tx)
        .await?;

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
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }

    pub(crate) async fn get(
        &self,
        user_id: &Uuid,
        limit: i64,
    ) -> Result<Vec<ClipboardMessage>, AppError> {
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

    pub(crate) async fn clear(&self, user_id: &Uuid) -> Result<(), AppError> {
        sqlx::query!("DELETE FROM clipboard_history WHERE user_id = $1", user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
