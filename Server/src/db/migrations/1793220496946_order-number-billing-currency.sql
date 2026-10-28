-- Up Migration

-- 1. Human-readable order number, e.g. ORD-2026-001001.
--    A SEQUENCE hands out numbers without locking, so concurrent checkouts never wait.
--    A rolled-back checkout leaves a gap; that is fine for order numbers
--    (only invoice numbers must be gapless).
CREATE SEQUENCE order_number_seq START 1001;

ALTER TABLE orders ADD COLUMN order_number VARCHAR(20);

-- Existing orders get numbers in the order they were placed
WITH numbered AS (
    SELECT id, created_at, 1000 + ROW_NUMBER() OVER (ORDER BY created_at, id) AS n
    FROM orders
)
UPDATE orders o
SET order_number = 'ORD-' || to_char(numbered.created_at, 'YYYY') || '-' || LPAD(numbered.n::text, 6, '0')
FROM numbered
WHERE o.id = numbered.id;

-- Continue after the backfilled numbers (no-op on an empty table)
SELECT setval('order_number_seq', 1000 + COUNT(*)) FROM orders HAVING COUNT(*) > 0;

-- The database assigns the number itself, so no code path can forget it
ALTER TABLE orders
    ALTER COLUMN order_number SET DEFAULT
        'ORD-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('order_number_seq')::text, 6, '0'),
    ALTER COLUMN order_number SET NOT NULL,
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);

-- Dropping the column on rollback also drops the sequence
ALTER SEQUENCE order_number_seq OWNED BY orders.order_number;

-- 2. Billing address, a snapshot like shipping_address. Existing orders: same as shipping.
ALTER TABLE orders ADD COLUMN billing_address JSONB;
UPDATE orders SET billing_address = shipping_address;
ALTER TABLE orders ALTER COLUMN billing_address SET NOT NULL;

-- 3. Currency (ISO 4217 code). Amounts are in the minor unit of this currency (cents for EUR).
ALTER TABLE orders ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'EUR'
    CONSTRAINT chk_orders_currency_format CHECK (currency ~ '^[A-Z]{3}$');

-- Down Migration

ALTER TABLE orders
    DROP COLUMN currency,
    DROP COLUMN billing_address,
    DROP COLUMN order_number;
