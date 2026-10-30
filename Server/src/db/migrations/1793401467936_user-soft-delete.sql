-- Up Migration

-- GDPR account deletion. Users with orders or audit entries cannot be deleted (invoices must
-- be kept for 10 years, § 147 AO), so their row stays but is stripped of personal data.
-- deleted_at marks such an anonymized user.
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- An anonymized user must not keep a real email address
ALTER TABLE users ADD CONSTRAINT chk_users_deleted_anonymized
    CHECK (deleted_at IS NULL OR (email LIKE 'deleted-%@deleted.invalid' AND email_verified_at IS NULL));

-- Down Migration

ALTER TABLE users DROP CONSTRAINT chk_users_deleted_anonymized;
ALTER TABLE users DROP COLUMN deleted_at;
