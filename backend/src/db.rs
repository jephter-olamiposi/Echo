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
}

pub(crate) struct PushTokenRepository {
    pool: PgPool,
}

impl PushTokenRepository {
    pub(crate) fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub(crate) async fn upsert(
        &self,
        user_id: Uuid,
        device_id: &str,
        token: &str,
    ) -> Result<(), AppError> {
        sqlx::query!(
            r#"
            INSERT INTO push_tokens (user_id, device_id, token)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, device_id)
            DO UPDATE SET token = EXCLUDED.token, updated_at = NOW()
            "#,
            user_id,
            device_id,
            token
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub(crate) async fn list_by_user(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<(String, String)>, AppError> {
        let rows = sqlx::query!(
            "SELECT device_id, token FROM push_tokens WHERE user_id = $1",
            user_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| (row.device_id, row.token))
            .collect())
    }

    pub(crate) async fn delete_by_value(&self, user_id: Uuid, token: &str) -> Result<(), AppError> {
        sqlx::query!(
            "DELETE FROM push_tokens WHERE user_id = $1 AND token = $2",
            user_id,
            token
        )
        .execute(&self.pool)
        .await?;

        Ok(())
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
            true,
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
            SELECT
                device_id AS "device_id!",
                device_name,
                content AS "content!",
                nonce AS "nonce!",
                timestamp AS "timestamp!"
            FROM clipboard_history
            WHERE user_id = $1
            AND COALESCE(encrypted, TRUE) = TRUE
            AND nonce IS NOT NULL
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
                timestamp: r.timestamp as u64,
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
