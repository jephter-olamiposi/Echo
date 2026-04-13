FROM rust:1.91-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml ./backend/Cargo.toml

RUN printf '[workspace]\nresolver = "2"\nmembers = ["backend"]\n\n[workspace.dependencies]\nserde = { version = "1.0.228", features = ["derive"] }\nserde_json = "1.0.145"\n\n[profile.release]\nlto = true\ncodegen-units = 1\nstrip = "symbols"\npanic = "abort"\n' > Cargo.toml

RUN mkdir -p backend/src backend/benches && \
    echo "fn main() {}" > backend/src/main.rs && \
    echo "fn main() {}" > backend/benches/rate_limiting.rs && \
    echo "fn main() {}" > backend/benches/broadcast.rs && \
    cargo build --release -p backend && \
    rm -rf backend/src backend/benches

COPY src ./backend/src
COPY .sqlx ./backend/.sqlx
COPY migrations ./backend/migrations
COPY benches ./backend/benches

RUN touch backend/src/main.rs

ENV SQLX_OFFLINE=true
RUN cargo build --release -p backend

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
