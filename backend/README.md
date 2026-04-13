# Echo Backend

High-concurrency synchronization server implemented in Rust using the Axum framework and Tokio async runtime.

## 🏗️ Architecture & Component Mapping

The backend is structured into specialized modules to isolate side effects and maintain strict type safety across the synchronization pipeline.

| Module | Responsibility | Implementation Details |
|--------|----------------|------------------------|
| `main` | Bootstrap | Setup Axum router, WebSocket routes, and graceful shutdown signal handling. |
| `handler` | Route Handlers | Manages HTTP upgrades to WebSockets and standard REST endpoints for history. |
| `state` | Core State | Implements sharded state via `DashMap` and user-specific `broadcast` channels. |
| `auth` | Identity | Argon2id password hashing and JWT issuance/validation. |
| `db` | Persistence | SQLx repository layer for PostgreSQL interaction. |
| `push` | FCM Client | Manages device token registration and push-triggered sync notifications. |
| `error` | Error Handling | Unified `AppError` type with automatic conversion to HTTP status codes. |

## ⚙️ Concurrency & Performance

### Sharded State Control
To minimize lock contention in high-concurrency scenarios (1,000+ active WS connections), the server utilizes `DashMap`. This sharded concurrent hash map allows parallel mutations of user states without global locking.

### Broadcast Fan-out
Real-time clipboard fan-out is handled via `tokio::sync::broadcast`. `ClipboardMessage` implements `Clone`; each subscriber receives its own copy. The dedicated writer task owns the WebSocket sink exclusively — no mutex is held across an await point.

## 🗄️ Database Context

Managed via **SQLx** for compile-time verified queries.
- **Migrations**: Found in `./migrations`.
- **Primary Schema**: Focused on `users`, `devices`, and `clipboard_history`.
- **Indexing**: Optimized for `(user_id, timestamp DESC)` to ensure O(1) or O(log N) retrieval of the latest sync state.

## 🛠️ Development & Ops

### Environment Configuration
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string. |
| `JWT_SECRET` | HS256 signing secret. |
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase credentials for push-triggered sync. |

## 📡 Message Protocol Specification

The synchronization protocol utilizes structured JSON over WebSockets. Every message must include a `device_id` and `timestamp`.

### 1. Handshake (Identity Registration)
Sent immediately upon connection to map the WebSocket stream to a logical device.
```json
{
  "device_id": "uuid-v4",
  "device_name": "Echo Desktop (Mac)",
  "content": "handshake",
  "timestamp": 1705234200000,
  "encrypted": false
}
```

### 2. Clipboard Sync (E2EE Payload)
Primary data carrier for encrypted clipboard content.
```json
{
  "device_id": "uuid-v4",
  "device_name": "Echo Desktop (Mac)",
  "content": "base64-ciphertext",
  "nonce": "base64-24byte-nonce",
  "encrypted": true,
  "timestamp": 1705234200100
}
```

### 3. Presence Indicators
Broadcasted by the server when a device joins or leaves the user's hub.
- `__JOIN__`: Device associated and ready for sync.
- `__LEAVE__`: Device disconnected or timed out.

### 4. Rate Limit Response
When a device exceeds the rate limit, the server sends an error frame before discarding the message:
```json
{ "error": "rate_limited", "code": "RATE_LIMIT" }
```

## 🛠️ Diagnostic Tooling

Quality gates run on every change:
- **Unit Testing**: `cargo test` for logic verification.
- **Benchmarking**: Performance regression testing via `criterion` in `./benches`.
- **Static Analysis**: `cargo clippy -- -D warnings` to enforce code quality.
- **Security Auditing**: `cargo audit` for dependency vulnerability tracking.
