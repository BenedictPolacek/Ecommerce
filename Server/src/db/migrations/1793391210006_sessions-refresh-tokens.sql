-- Up Migration

-- One row per login (device/browser). Access tokens carry the session id, so revoking a
-- session logs that device out immediately.
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- CASCADE: sessions are no business records; deleting a user ends their logins
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Only the browser/device string; no IP address (data minimization, GDPR)
    user_agent VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Sliding: every refresh moves it forward; inactive sessions run out
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(20)
        CONSTRAINT chk_sessions_revoked_reason
        CHECK (revoked_reason IN ('logout', 'logout_all', 'session_ended', 'reuse_detected')),
    CONSTRAINT chk_sessions_revoked_consistent
        CHECK ((revoked_at IS NULL) = (revoked_reason IS NULL))
);

-- "My active sessions" and cleanup per user
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Refresh tokens are rotated: every refresh uses up one token and issues the next.
-- Used tokens are kept, so a second use of the same token is recognized as theft.
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    -- SHA-256 (hex) of the token; the token itself is never stored
    token_hash CHAR(64) NOT NULL CONSTRAINT uq_refresh_tokens_token_hash UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_session_id ON refresh_tokens(session_id);

-- Down Migration

DROP TABLE refresh_tokens;
DROP TABLE sessions;
