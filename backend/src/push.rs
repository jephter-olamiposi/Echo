use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
    fs,
    sync::RwLock,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tracing::{error, info};

pub struct PushClient {
    client: reqwest::Client,
    project_id: String,
    service_account: ServiceAccount,
    cached_token: RwLock<Option<(String, Instant)>>,
}

#[derive(Deserialize)]
struct ServiceAccount {
    project_id: String,
    private_key: String,
    client_email: String,
    token_uri: String,
}

#[derive(Serialize)]
struct Claims {
    iss: String,
    scope: String,
    aud: String,
    iat: i64,
    exp: i64,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
}

impl PushClient {
    pub fn from_file(path: &str) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let json = fs::read_to_string(path)?;
        Self::from_json(&json)
    }

    pub fn from_json(json: &str) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let sa: ServiceAccount = serde_json::from_str(json)?;
        Ok(Self {
            project_id: sa.project_id.clone(),
            client: reqwest::Client::new(),
            service_account: sa,
            cached_token: RwLock::new(None),
        })
    }

    async fn access_token(&self) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        if let Some((token, exp)) = self.cached_token.read().unwrap().clone() {
            if exp > Instant::now() + Duration::from_secs(60) {
                return Ok(token);
            }
        }

        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;
        let claims = Claims {
            iss: self.service_account.client_email.clone(),
            scope: "https://www.googleapis.com/auth/firebase.messaging".into(),
            aud: self.service_account.token_uri.clone(),
            iat: now,
            exp: now + 3600,
        };

        let key = EncodingKey::from_rsa_pem(self.service_account.private_key.as_bytes())?;
        let jwt = encode(&Header::new(Algorithm::RS256), &claims, &key)?;

        let resp: TokenResponse = self
            .client
            .post(&self.service_account.token_uri)
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                ("assertion", &jwt),
            ])
            .send()
            .await?
            .json()
            .await?;

        *self.cached_token.write().unwrap() = Some((
            resp.access_token.clone(),
            Instant::now() + Duration::from_secs(resp.expires_in),
        ));
        Ok(resp.access_token)
    }

    pub async fn send(
        &self,
        token: &str,
        title: &str,
        body: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let payload = json!({
            "message": {
                "token": token,
                "notification": { "title": title, "body": body },
                "data": { "type": "clipboard_sync" },
                "android": { "priority": "high" }
            }
        });

        let resp = self
            .client
            .post(format!(
                "https://fcm.googleapis.com/v1/projects/{}/messages:send",
                self.project_id
            ))
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token().await?),
            )
            .json(&payload)
            .send()
            .await?;

        if resp.status().is_success() {
            info!("FCM sent");
        } else {
            error!(status = %resp.status(), "FCM failed");
        }
        Ok(())
    }

    pub async fn notify_sync(
        &self,
        token: &str,
        from: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.send(token, "Echo", &format!("Tap to sync from {}", from))
            .await
    }
}
