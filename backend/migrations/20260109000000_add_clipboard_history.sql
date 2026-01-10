-- Create clipboard_history table for persistent message storage
CREATE TABLE clipboard_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT,
    content TEXT NOT NULL,
    nonce TEXT,
    encrypted BOOLEAN DEFAULT true,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient user history queries (newest first)
CREATE INDEX idx_clipboard_history_user_time ON clipboard_history(user_id, timestamp DESC);

-- Index for cleanup of old entries
CREATE INDEX idx_clipboard_history_created ON clipboard_history(created_at);

-- Limit history per user (optional cleanup trigger)
-- Note: Cleanup is done in application code, but index helps
