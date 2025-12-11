# Builder stage
FROM rust:1.83-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy manifests first to cache dependencies
COPY Cargo.toml Cargo.lock ./

# Create dummy main.rs to build dependencies (caching trick)
RUN mkdir src && \
    echo "fn main() {println!(\"build broke\")}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy actual source code
COPY src ./src
COPY migrations ./migrations

# Touch main to force rebuild of app code
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

# Copy binary and migrations
COPY --from=builder /app/target/release/backend ./backend
COPY --from=builder /app/migrations ./migrations

# Railway injects PORT
ENV PORT=3000
EXPOSE 3000

CMD ["./backend"]
