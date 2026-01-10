-- Performance indexes for faster queries

-- Index on users.email for login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on clipboard_history for user queries (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_clipboard_history_user_timestamp 
  ON clipboard_history(user_id, timestamp DESC);

-- Index for history cleanup queries
CREATE INDEX IF NOT EXISTS idx_clipboard_history_user_id 
  ON clipboard_history(user_id);

-- Analyze tables to update query planner statistics
ANALYZE users;
ANALYZE clipboard_history;
