//! JWT authentication extractor for Axum handlers.

use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
    RequestPartsExt,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use uuid::Uuid;

use crate::{dto::Claims, error::AppError, state::AppState};

pub(crate) struct AuthUser {
    pub(crate) user_id: Uuid,
}

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
    AppState: FromRef<S>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);

        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| AppError::Auth("Missing or invalid Authorization header".into()))?;

        let token_data = decode::<Claims>(
            bearer.token(),
            &DecodingKey::from_secret(state.jwt_secret().as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| AppError::Auth("Invalid or expired token".into()))?;

        let user_id = Uuid::parse_str(&token_data.claims.sub)
            .map_err(|_| AppError::Auth("Invalid user ID in token".into()))?;

        Ok(Self { user_id })
    }
}
