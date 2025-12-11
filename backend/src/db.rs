use crate::error::AppError;
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
        let result = sqlx::query_as::<_, (Uuid,)>(
            "INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
        )
        .bind(first_name)
        .bind(last_name)
        .bind(email)
        .bind(password_hash)
        .fetch_one(&self.pool)
        .await;

        match result {
            Ok((id,)) => Ok(id),
            Err(sqlx::Error::Database(e)) if e.is_unique_violation() => {
                Err(AppError::Conflict("Email already exists".into()))
            }
            Err(e) => Err(e.into()),
        }
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<(Uuid, String)>, AppError> {
        let user = sqlx::query_as::<_, (Uuid, String)>(
            "SELECT id, password_hash FROM users WHERE email = $1",
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }
}
