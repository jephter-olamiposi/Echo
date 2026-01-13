//! Password hashing (Argon2) and JWT token management.

use crate::error::AppError;
use crate::models::Claims;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use uuid::Uuid;

const JWT_EXPIRY_HOURS: u64 = 48;

pub fn hash_password(password: String) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(format!("Hash failed: {e}")))
}

pub fn verify_password(password: String, hash: String) -> Result<bool, AppError> {
    Ok(PasswordHash::new(&hash)
        .ok()
        .map(|h| {
            Argon2::default()
                .verify_password(password.as_bytes(), &h)
                .is_ok()
        })
        .unwrap_or(false))
}

pub fn generate_jwt(user_id: Uuid, secret: &str) -> Result<String, AppError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .as_secs() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        iat: now,
        exp: now + (JWT_EXPIRY_HOURS as usize * 3600),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(e.to_string()))
}

pub fn decode_jwt(token: &str, secret: &str) -> Result<Claims, AppError> {
    let validation = Validation::default();
    let key = DecodingKey::from_secret(secret.as_bytes());

    decode::<Claims>(token, &key, &validation)
        .map(|data| data.claims)
        .map_err(|_| AppError::Auth("Invalid token".into()))
}
