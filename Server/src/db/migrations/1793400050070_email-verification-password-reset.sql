-- Up Migration

-- NULL = not verified yet. Unverified users can do everything except check out.
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

-- Accounts from before this rule existed count as verified, so their checkout keeps working
UPDATE users SET email_verified_at = created_at;

-- Single-use tokens sent by email (verification link, password reset link)
CREATE TABLE user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- CASCADE: tokens are no business records; deleting a user removes them
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(30) NOT NULL
        CONSTRAINT chk_user_tokens_purpose
        CHECK (purpose IN ('email_verification', 'password_reset')),
    -- SHA-256 (hex) of the token; the token itself only exists in the email
    token_hash CHAR(64) NOT NULL CONSTRAINT uq_user_tokens_token_hash UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    CONSTRAINT chk_user_tokens_expiry CHECK (expires_at > created_at)
);

-- Latest token per user and purpose (resend cooldown, replacing older tokens)
CREATE INDEX idx_user_tokens_user_purpose ON user_tokens(user_id, purpose, created_at DESC);

-- A password reset or change logs out other devices; record why
ALTER TABLE sessions DROP CONSTRAINT chk_sessions_revoked_reason;
ALTER TABLE sessions ADD CONSTRAINT chk_sessions_revoked_reason
    CHECK (revoked_reason IN (
        'logout', 'logout_all', 'session_ended', 'reuse_detected',
        'password_reset', 'password_changed'
    ));

-- Down Migration

-- The old constraint does not allow the new reasons; those sessions are revoked anyway
DELETE FROM sessions WHERE revoked_reason IN ('password_reset', 'password_changed');
ALTER TABLE sessions DROP CONSTRAINT chk_sessions_revoked_reason;
ALTER TABLE sessions ADD CONSTRAINT chk_sessions_revoked_reason
    CHECK (revoked_reason IN ('logout', 'logout_all', 'session_ended', 'reuse_detected'));

DROP TABLE user_tokens;
ALTER TABLE users DROP COLUMN email_verified_at;
