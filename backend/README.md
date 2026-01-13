# Echo Backend

Real-time clipboard synchronization server built with Rust and Axum.

## Quick Start

```bash
# Install dependencies
cargo build

# Setup database
createdb echo_db
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Run migrations
cargo install sqlx-cli
sqlx migrate run

# Start server
cargo run
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed design documentation.

### Module Overview

| Module | Purpose |
|--------|---------|
| `main` | Server bootstrap, routes, graceful shutdown |
| `handler` | HTTP and WebSocket route handlers |
| `state` | Application state with DashMap, broadcast channels |
| `auth` | Argon2 password hashing, JWT tokens |
| `db` | PostgreSQL repository layer (SQLx) |
| `middleware` | JWT authentication extractor |
| `models` | Request/response DTOs |
| `push` | Firebase Cloud Messaging integration |
| `error` | Unified error types with HTTP mapping |

## Development

### Running Tests

```bash
# Unit tests
cargo test

# With logging
RUST_LOG=debug cargo test -- --nocapture
```

### Running Benchmarks

```bash
# All benchmarks
cargo bench

# Specific benchmark
cargo bench --bench rate_limiting
cargo bench --bench broadcast
```

### Code Quality

```bash
# Format
cargo fmt

# Lint
cargo clippy -D warnings

# Check for security issues
cargo audit
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for signing auth tokens | Yes |
| `RUST_LOG` | Log level (trace/debug/info/warn/error) | No |
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase service account JSON | No |
| `FCM_SERVICE_ACCOUNT_PATH` | Path to service account file | No |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | No |

## API Endpoints

### Auth

- `POST /api/register` - Create account
- `POST /api/login` - Get JWT token
- `GET /api/me` - Get current user (requires auth)

### Sync

- `GET /api/sync` - WebSocket upgrade for real-time sync
- `GET /api/clipboard/latest` - Get latest clipboard entry
- `GET /api/clipboard/history` - Get clipboard history
- `DELETE /api/clipboard/history` - Clear history

### Push Notifications

- `POST /api/push/register` - Register FCM token

## Performance

The backend is designed for high concurrency:

- **DashMap**: Lock-free concurrent hash maps for state
- **Broadcast channels**: Efficient fan-out to connected devices
- **Rate limiting**: Token bucket algorithm (300 msgs/min)
- **Connection pooling**: SQLx with 20 max connections

See benchmarks in `/benches` for performance characteristics.
