-- Up Migration

-- Sign in with Google or GitHub. Such accounts may have no password: they can set one
-- later with the "forgot password" email link.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- One row per linked provider account. provider_user_id is the provider's stable id
-- (Google "sub", GitHub user id): emails can change, these ids never do.
CREATE TABLE user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'github')),
    provider_user_id VARCHAR(255) NOT NULL,
    -- Email at the provider when linked (for support; the account email is users.email)
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_identities_provider_account UNIQUE (provider, provider_user_id),
    -- One account per provider and user; also the index for "identities of a user"
    CONSTRAINT uq_user_identities_user_provider UNIQUE (user_id, provider)
);

-- Linking a provider to an unverified account ends that account's sessions; record why
ALTER TABLE sessions DROP CONSTRAINT chk_sessions_revoked_reason;
ALTER TABLE sessions ADD CONSTRAINT chk_sessions_revoked_reason
    CHECK (revoked_reason IN (
        'logout', 'logout_all', 'session_ended', 'reuse_detected',
        'password_reset', 'password_changed', 'account_linked'
    ));

-- Down Migration

DELETE FROM sessions WHERE revoked_reason = 'account_linked';
ALTER TABLE sessions DROP CONSTRAINT chk_sessions_revoked_reason;
ALTER TABLE sessions ADD CONSTRAINT chk_sessions_revoked_reason
    CHECK (revoked_reason IN (
        'logout', 'logout_all', 'session_ended', 'reuse_detected',
        'password_reset', 'password_changed'
    ));

DROP TABLE user_identities;
-- Accounts without a password get an unusable hash ('!' never matches bcrypt)
UPDATE users SET password_hash = '!' WHERE password_hash IS NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
