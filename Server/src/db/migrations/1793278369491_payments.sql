-- Up Migration

-- One row per payment attempt. An order can have several (failed card, then success;
-- partial payments). Amounts are integer cents in the order's currency.
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- RESTRICT: payments are financial records, an order with payments must not vanish
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    -- 'manual' (recorded by an admin, e.g. bank transfer), later 'stripe', 'paypal', ...
    provider VARCHAR(50) NOT NULL
        CONSTRAINT chk_payments_provider_format CHECK (provider ~ '^[a-z0-9_]+$'),
    -- The provider's own ID (e.g. Stripe pi_...) or a bank transfer reference
    provider_payment_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CONSTRAINT chk_payments_status
        CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'refunded')),
    amount_cents INTEGER NOT NULL CONSTRAINT chk_payments_amount_positive CHECK (amount_cents > 0),
    currency CHAR(3) NOT NULL
        CONSTRAINT chk_payments_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- A provider never reports the same payment twice into two rows (webhook retries).
    -- NULLs are distinct, so several manual payments without a reference are fine.
    CONSTRAINT uq_payments_provider_payment_id UNIQUE (provider, provider_payment_id)
);

CREATE INDEX idx_payments_order_id ON payments(order_id);

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Move existing payment data out of orders. The status is derived from the order status.
-- Duplicate provider IDs (possible before the unique constraint existed) keep the first row.
INSERT INTO payments (order_id, provider, provider_payment_id, status, amount_cents, currency, created_at)
SELECT
    id,
    COALESCE(NULLIF(regexp_replace(lower(payment_provider), '[^a-z0-9_]', '_', 'g'), ''), 'unknown'),
    payment_id,
    CASE
        WHEN status IN ('paid', 'processing', 'shipped', 'delivered') THEN 'succeeded'
        WHEN status = 'refunded' THEN 'refunded'
        WHEN status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
    END,
    total_cents,
    currency,
    created_at
FROM orders
WHERE (payment_provider IS NOT NULL OR payment_id IS NOT NULL) AND total_cents > 0
ORDER BY created_at
ON CONFLICT (provider, provider_payment_id) DO NOTHING;

ALTER TABLE orders
    DROP COLUMN payment_provider,
    DROP COLUMN payment_id;

-- Down Migration

ALTER TABLE orders
    ADD COLUMN payment_provider VARCHAR(50),
    ADD COLUMN payment_id VARCHAR(255);

-- The old schema holds one payment per order: keep the newest
UPDATE orders o
SET payment_provider = p.provider, payment_id = p.provider_payment_id
FROM (
    SELECT DISTINCT ON (order_id) order_id, provider, provider_payment_id
    FROM payments
    ORDER BY order_id, created_at DESC
) p
WHERE o.id = p.order_id;

DROP TABLE payments;
