CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

INSERT INTO push_tokens (user_id, device_id, token)
SELECT
    users.id,
    payload.device_id,
    payload.token
FROM users
CROSS JOIN LATERAL jsonb_to_recordset(COALESCE(users.push_tokens, '[]'::jsonb))
    AS payload(device_id TEXT, token TEXT)
WHERE payload.device_id IS NOT NULL
  AND payload.token IS NOT NULL
ON CONFLICT (user_id, device_id)
DO UPDATE SET
    token = EXCLUDED.token,
    updated_at = NOW();
