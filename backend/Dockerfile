# Builder stage
FROM rust:1.91-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy manifests first to cache dependencies
COPY Cargo.toml Cargo.lock ./

# Create a dummy main.rs to build dependencies (caching trick)
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy the actual source code and .sqlx folder for offline mode
COPY src ./src
COPY .sqlx ./.sqlx
COPY migrations ./migrations

# Touch main.rs to force rebuild of application code
RUN touch src/main.rs

# Build the application with offline SQLx mode
ENV SQLX_OFFLINE=true
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

# Copy the binary from the builder
COPY --from=builder /app/target/release/backend ./backend
COPY --from=builder /app/migrations ./migrations

# Expose the port
ENV PORT=3000
EXPOSE 3000

# Run the binary
CMD ["./backend"]
