//! Password hashing (Argon2) and JWT token management.

use crate::dto::Claims;
use crate::error::AppError;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

const JWT_EXPIRY_HOURS: u64 = 48;

// INVARIANT: HS256 (symmetric HMAC) is correct for this single-server deployment.
// If token validation ever moves to a separate service or edge layer, migrate to
// RS256 so the signing key stays on the issuer and verifiers only need the public key.

pub(crate) fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(format!("Hash failed: {e}")))
}

pub(crate) fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| AppError::Internal(format!("Stored password hash is invalid: {e}")))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

pub(crate) fn generate_jwt(user_id: Uuid, secret: &str) -> Result<String, AppError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
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

pub(crate) fn decode_jwt(token: &str, secret: &str) -> Result<Claims, AppError> {
    let validation = Validation::default();
    let key = DecodingKey::from_secret(secret.as_bytes());

    decode::<Claims>(token, &key, &validation)
        .map(|data| data.claims)
        .map_err(|_| AppError::Auth("Invalid token".into()))
}
