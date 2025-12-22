-- Add push_tokens column to store FCM tokens per user (JSONB array of device tokens)
-- Format: [{"device_id": "xxx", "token": "fcm_token_here", "created_at": timestamp}]
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_tokens JSONB DEFAULT '[]';
