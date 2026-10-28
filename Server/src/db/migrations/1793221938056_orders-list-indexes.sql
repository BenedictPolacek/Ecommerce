-- Up Migration

-- Admin order list: newest first, optionally filtered by status ("all paid orders").
-- Customer lists ("my orders") are already covered by idx_orders_user_id_created_at.
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at DESC);

-- Down Migration

DROP INDEX IF EXISTS idx_orders_status_created_at;
DROP INDEX IF EXISTS idx_orders_created_at;
