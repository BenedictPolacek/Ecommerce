-- Up Migration

-- Audit trail of order status changes: who changed what, when, and why.
-- Which transitions are allowed is decided in the application (orders/order-status.js).
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    -- NULL only for the first entry, when the order is created
    from_status VARCHAR(50)
        CONSTRAINT chk_order_status_history_from_status
        CHECK (from_status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    to_status VARCHAR(50) NOT NULL
        CONSTRAINT chk_order_status_history_to_status
        CHECK (to_status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    -- Customer (checkout) or admin; NULL for migrated data. Users are anonymized, never deleted.
    changed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    -- Internal note, only visible to admins
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_order_status_history_changed CHECK (from_status IS DISTINCT FROM to_status)
);

CREATE INDEX idx_order_status_history_order_id_created_at
    ON order_status_history(order_id, created_at);

-- Append-only, like stock_movements: an audit trail that can be edited is worthless
CREATE FUNCTION prevent_order_status_history_changes()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'order_status_history is append-only'
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_history_append_only
    BEFORE UPDATE OR DELETE ON order_status_history
    FOR EACH ROW EXECUTE FUNCTION prevent_order_status_history_changes();

-- Backfill: every order started as pending. The steps in between are unknown,
-- so a non-pending order gets one direct step to its current status.
INSERT INTO order_status_history (order_id, from_status, to_status, created_at)
SELECT id, NULL, 'pending', created_at FROM orders;

INSERT INTO order_status_history (order_id, from_status, to_status, note, created_at)
SELECT id, 'pending', status, 'migrated', updated_at
FROM orders
WHERE status <> 'pending';

-- Down Migration

DROP TABLE order_status_history;
DROP FUNCTION prevent_order_status_history_changes();
