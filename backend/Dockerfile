# Builder stage
# Build context: workspace root
# Usage: docker build -f backend/Dockerfile .
FROM rust:1.91-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first to cache dependencies
COPY Cargo.toml Cargo.lock ./
COPY backend/Cargo.toml ./backend/Cargo.toml

# Stub out desktop/src-tauri so the workspace resolver doesn't fail
# (only the backend binary is needed in this image)
RUN mkdir -p desktop/src-tauri/src && \
    printf '[package]\nname = "desktop"\nversion = "0.0.0"\nedition = "2021"\n' \
    > desktop/src-tauri/Cargo.toml && \
    echo "fn main() {}" > desktop/src-tauri/src/main.rs

# Create dummy source files to build dependencies (caching trick)
RUN mkdir -p backend/src backend/benches && \
    echo "fn main() {}" > backend/src/main.rs && \
    echo "fn main() {}" > backend/benches/rate_limiting.rs && \
    echo "fn main() {}" > backend/benches/broadcast.rs && \
    cargo build --release -p backend && \
    rm -rf backend/src backend/benches

# Copy the actual source code and .sqlx folder for offline mode
COPY backend/src ./backend/src
COPY backend/.sqlx ./backend/.sqlx
COPY backend/migrations ./backend/migrations
COPY backend/benches ./backend/benches

# Touch main.rs to force rebuild of application code
RUN touch backend/src/main.rs

# Build the application with offline SQLx mode
ENV SQLX_OFFLINE=true
RUN cargo build --locked --release -p backend

# Runtime stage
FROM debian:bookworm-slim

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y ca-certificates libssl3 curl && \
    rm -rf /var/lib/apt/lists/*

USER appuser

COPY --from=builder /app/target/release/backend ./backend
COPY --from=builder /app/backend/migrations ./migrations

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["./backend"]
