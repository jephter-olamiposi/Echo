# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Engineering doctrine:** All Rust work in this repo is governed by `rust.md` (loaded automatically via `trigger: always_on`). It defines the non-negotiable rules for production Rust — panics, error handling, async/concurrency, ADT modeling, testing strategy, and the recon → plan → implement → quality-gate workflow. Read it before touching any Rust code.

## Commands

### Backend

```sh
cd backend

# Run (requires DATABASE_URL and JWT_SECRET in .env)
cargo run

# Test (no database required — tests use AppState directly with an in-memory fixture)
cargo test
cargo test <test_name>   # e.g. cargo test rate_limit_tests::allows_first_message

# Quality gates — all must pass
cargo fmt
cargo clippy -- -D warnings
cargo test --verbose

# Benchmarks
cargo bench --bench broadcast
cargo bench --bench rate_limiting
```

CI runs with `SQLX_OFFLINE=true`. After adding or modifying SQL queries, regenerate the sqlx cache:
```sh
cargo sqlx prepare
```

Migrations run automatically at startup via `sqlx::migrate!("./migrations")` — no manual step required.

### Desktop (Tauri + React)

```sh
cd desktop
npm install
npm run tauri dev      # development build
npm run tauri build    # production build
```

## Required Environment Variables

**Backend** (`.env` in `backend/`):
| Variable | Required | Default |
|---|---|---|
| `DATABASE_URL` | Yes | — |
| `JWT_SECRET` | Yes | — |
| `PORT` | No | `3000` |
| `HOST` | No | `0.0.0.0` |
| `ALLOWED_ORIGINS` | No | Tauri dev origins |
| `FCM_SERVICE_ACCOUNT_JSON` or `FCM_SERVICE_ACCOUNT_PATH` | No | FCM disabled |

**Frontend** (`.env` in `desktop/`):
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend HTTP URL (defaults to `http://localhost:3000`) |
| `VITE_WS_URL` | Optional WebSocket override; derived from `VITE_API_URL` if absent |

## Architecture

### Repository Structure

Cargo workspace with two members:
- `backend/` — Axum/Tokio sync server (Rust)
- `desktop/src-tauri/` — Tauri 2 native shell (Rust)
- `desktop/src/` — React/TypeScript frontend (compiled for both desktop and mobile builds)

### Backend Data Flow

1. Client POSTs `/register` or `/login` → receives a JWT (48h expiry, Argon2id passwords)
2. Client opens WebSocket at `/ws?token=<JWT>`
3. Server validates JWT, then waits for a **handshake** message (`content: "handshake"`)
4. Server replays history (up to 50 entries, flagged `is_history: true`) then enters the sync loop
5. Incoming messages are rate-limited → stored to `AppState.history` (in-memory + async DB write) → broadcast on the per-user `tokio::sync::broadcast` channel
6. All real clipboard payloads must carry `encrypted: true` and a `nonce` field — the server stores and relays ciphertext only (blind relay)
7. On disconnect: presence leave is broadcast, channel cleaned up if no remaining subscribers

### `AppState` (`backend/src/state/mod.rs`)

All shared state is held in `AppState`, cheaply cloned via `Arc` internals. State is split across three sub-structs:

| Sub-struct | File | Responsibility |
|---|---|---|
| `SyncState` | `state/sync.rs` | Broadcast channels, in-memory history, online sessions |
| `RateLimiter` | `state/rate_limit.rs` | Dual-layer rate limiting (50ms min interval + 300 msg/60s window) |
| `PushManager` | `state/push_manager.rs` | FCM token storage; persisted to DB |

`DashMap` is used throughout instead of `RwLock<HashMap>` to eliminate shard-level lock contention.

Broadcast channel capacity scales dynamically: `clamp(device_count × 25, 50, 500)`.

### Backend Module Responsibilities

| Module | Responsibility |
|---|---|
| `main.rs` | Router, DB pool, migrations, CORS, graceful shutdown |
| `state/mod.rs` | `AppState` entry point; push token persistence via `UserRepository` |
| `state/sync.rs` | Broadcast channels, in-memory clipboard history, online session map |
| `state/rate_limit.rs` | Dual-layer rate limiter (`IntervalPolicy` + sliding window) |
| `state/push_manager.rs` | In-memory FCM token map; load/persist via DB |
| `handlers/auth.rs` | `POST /register`, `POST /login` |
| `handlers/history.rs` | `GET /history`, `DELETE /history`, `POST /push/register` |
| `handlers/ws.rs` | WebSocket lifecycle (handshake → history replay → sync loop) |
| `auth.rs` | Argon2id password hashing, JWT encode/decode |
| `middleware.rs` | `AuthUser` Axum extractor (reads `Authorization: Bearer`) |
| `db.rs` | `UserRepository` + `ClipboardHistoryRepository` (SQLx typed queries) |
| `protocol.rs` | Wire type: `ClipboardMessage`; protocol constants (`MSG_HANDSHAKE`, `MSG_PRESENCE_*`) |
| `dto.rs` | HTTP request/response types: `RegisterRequest`, `LoginRequest`, `AuthResponse`, `Claims`, etc. |
| `types.rs` | Domain newtypes with validation: `DeviceId`, `DeviceName`, `PushToken` |
| `config.rs` | `Config::from_env()` — reads all env vars at startup |
| `push.rs` | FCM client with cached OAuth2 token; auto-removes `InvalidToken` on 404/410 |
| `error.rs` | `AppError` enum → HTTP status + JSON error body via `IntoResponse` |
| `tests.rs` | Unit tests for rate limiting, history, channel lifecycle (no DB needed) |

### Frontend Architecture

`App.tsx` is the top-level orchestrator — global state is delegated to focused hooks and composed in `AppContent`. No external state manager.

**Key hooks:**
- `useAuth` — token persistence, view routing (`login | register | main | onboarding`), logout
- `useDevices` — online device list, `handleDeviceJoin` / `handleDeviceLeave` / `removeDevice`
- `useWebSocket` — connection lifecycle, exponential backoff with jitter, offline message queue (up to 200), encrypt-on-send / decrypt-on-receive
- `useClipboard` — listens to Tauri `clipboard-change` event (desktop), calls `ws.send()`; writes remote content via `clipboard-remote-write` event. The Rust side (`clipboard.rs`) skips echoing back remote writes using a hash comparison.
- `useKeys` — loads/saves 32-byte `Uint8Array` encryption key via `@tauri-apps/plugin-store` (`store.json`)
- `usePushNotifications` — registers FCM token with backend via `POST /push/register` after each WebSocket connect

**Platform branching** (via `@tauri-apps/plugin-os`):
- Mobile → `MobileLayout` (`desktop/src/components/mobile/`) with Dashboard / History / Settings tabs
- Desktop → `Sidebar` + `Main` two-panel layout (`desktop/src/components/desktop/`)
- Barcode scanner plugin only initialized on `android` / `ios`

### Encryption (`desktop/src/crypto.ts`)

Uses `@noble/ciphers` (XChaCha20-Poly1305). Each message gets a unique 24-byte random nonce. Keys are 32 bytes stored as base64url in Tauri's persistent store. The QR code encodes an `echo://connect?id=...&key=...&server=...` deep link — the raw key is never transmitted to the server.

### WebSocket Protocol Constants

Defined in `backend/src/protocol.rs` and mirrored in `useWebSocket.ts`:
- `"handshake"` — first message after connect (unencrypted)
- `"__JOIN__"` / `"__LEAVE__"` — presence events
- All sync payloads require `{ encrypted: true, nonce: "<base64>" }`. Unencrypted payloads are rejected client-side.

### Database Schema

Five migrations in `backend/migrations/`:
1. `users` table (id, email, password_hash)
2. Add `first_name`, `last_name` to users
3. Add `push_tokens` JSONB column to users
4. `clipboard_history` table (user_id, device_id, device_name, content, nonce, encrypted, timestamp)
5. Indexes: `idx_clipboard_user_timestamp` (composite), `idx_users_email`

---

## Engineering Standards

### Quality Gates `[MUST ALL PASS]`

```sh
cargo fmt
cargo clippy -- -D warnings
cargo test --all --quiet
```

### Rust Rules

- **No panics in production code.** `unwrap()` and `expect()` are forbidden outside `#[cfg(test)]`. Use `unreachable!()` only for genuinely unreachable invariants.
- **No blocking inside async functions.** Use `spawn_blocking` for CPU-bound work (e.g. Argon2 hashing — see `handlers/auth.rs`).
- **Boolean flags for state are prohibited.** Model state with enums; invalid states must be unrepresentable.
- **Every `unsafe` block must have a `// SAFETY:` comment.**
- Comments explaining *what* code does are not allowed — only `SAFETY:`, `INVARIANT:`, architectural trade-offs, or upstream bug workarounds (with issue link).
- New dependencies must be justified. A well-adopted crate is actively maintained with >1M downloads/month.
- `Arc<Mutex<_>>` requires documented justification; prefer message passing.
- All `select!` branches must be cancellation-safe.

### Final Checklist

- [ ] Consulted `std` before reaching for a crate
- [ ] Domain state modeled with enums, not boolean flags
- [ ] No `unwrap`/`expect` outside tests
- [ ] All `unsafe` blocks have `// SAFETY:` comments
- [ ] `cargo fmt`, `cargo clippy -- -D warnings`, `cargo test` all pass
