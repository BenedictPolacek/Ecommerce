-- Up Migration

-- Stock ledger: every change of products.stock_quantity is one row here.
-- products.stock_quantity stays as the current balance (fast reads, row locks in checkout);
-- the application always changes both in the same transaction, so
-- SUM(quantity) per product = products.stock_quantity.
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    -- Signed change: +50 restock, -2 sale
    quantity INTEGER NOT NULL CONSTRAINT chk_stock_movements_quantity_nonzero CHECK (quantity <> 0),
    -- Stock after this movement, like the balance on a bank statement
    balance_after INTEGER NOT NULL
        CONSTRAINT chk_stock_movements_balance_after_nonnegative CHECK (balance_after >= 0),
    reason VARCHAR(20) NOT NULL
        CONSTRAINT chk_stock_movements_reason
        CHECK (reason IN ('initial', 'sale', 'order_cancelled', 'restock', 'damage', 'adjustment')),
    -- Set for sale and order_cancelled, empty otherwise
    order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
    -- Who caused it (customer for a sale, admin otherwise); NULL for seed/migration data.
    -- RESTRICT: users are anonymized, never deleted
    created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- The sign must match the reason (adjustment can go both ways)
    CONSTRAINT chk_stock_movements_reason_sign CHECK (
        (reason IN ('initial', 'restock', 'order_cancelled') AND quantity > 0)
        OR (reason IN ('sale', 'damage') AND quantity < 0)
        OR reason = 'adjustment'
    ),
    -- Order-related movements must point to their order, all others must not
    CONSTRAINT chk_stock_movements_order_reference CHECK (
        (reason IN ('sale', 'order_cancelled')) = (order_id IS NOT NULL)
    )
);

-- History of one product, newest first
CREATE INDEX idx_stock_movements_product_id_created_at
    ON stock_movements(product_id, created_at DESC);
-- Movements of one order (cancellation) and FK lookups
CREATE INDEX idx_stock_movements_order_id
    ON stock_movements(order_id) WHERE order_id IS NOT NULL;

-- Append-only: mistakes are fixed with a counter-movement, never by editing history.
-- TRUNCATE (used by the test setup) does not fire row triggers.
CREATE FUNCTION prevent_stock_movement_changes()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'stock_movements is append-only; record a counter-movement instead'
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_movements_append_only
    BEFORE UPDATE OR DELETE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION prevent_stock_movement_changes();

-- Opening balance for existing products, so the ledger sum matches stock_quantity
INSERT INTO stock_movements (product_id, quantity, balance_after, reason, note, created_at)
SELECT id, stock_quantity, stock_quantity, 'initial', 'Opening balance (migration)', created_at
FROM products
WHERE stock_quantity > 0;

-- Down Migration

DROP TABLE stock_movements;
DROP FUNCTION prevent_stock_movement_changes();
