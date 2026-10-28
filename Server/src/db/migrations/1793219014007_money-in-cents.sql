-- Up Migration

-- Money is stored as integer cents: integers are exact, decimals in JavaScript are not
-- (0.1 + 0.2 = 0.30000000000000004). The _cents suffix makes the unit obvious.
-- Existing CHECK constraints follow the columns through the type change and rename.

-- Products
ALTER TABLE products ALTER COLUMN price TYPE INTEGER USING ROUND(price * 100);
ALTER TABLE products RENAME COLUMN price TO price_cents;
ALTER TABLE products RENAME CONSTRAINT products_price_check TO products_price_cents_check;

-- Order items
ALTER TABLE order_items ALTER COLUMN unit_price TYPE INTEGER USING ROUND(unit_price * 100);
ALTER TABLE order_items RENAME COLUMN unit_price TO unit_price_cents;
ALTER TABLE order_items
    RENAME CONSTRAINT order_items_unit_price_check TO order_items_unit_price_cents_check;

-- Orders
ALTER TABLE orders
    ALTER COLUMN tax DROP DEFAULT,
    ALTER COLUMN shipping_fee DROP DEFAULT;

ALTER TABLE orders
    ALTER COLUMN subtotal TYPE INTEGER USING ROUND(subtotal * 100),
    ALTER COLUMN tax TYPE INTEGER USING ROUND(tax * 100),
    ALTER COLUMN shipping_fee TYPE INTEGER USING ROUND(shipping_fee * 100),
    ALTER COLUMN total TYPE INTEGER USING ROUND(total * 100);

ALTER TABLE orders RENAME COLUMN subtotal TO subtotal_cents;
ALTER TABLE orders RENAME COLUMN tax TO tax_cents;
ALTER TABLE orders RENAME COLUMN shipping_fee TO shipping_fee_cents;
ALTER TABLE orders RENAME COLUMN total TO total_cents;
ALTER TABLE orders RENAME CONSTRAINT orders_subtotal_check TO orders_subtotal_cents_check;
ALTER TABLE orders RENAME CONSTRAINT orders_tax_check TO orders_tax_cents_check;
ALTER TABLE orders RENAME CONSTRAINT orders_shipping_fee_check TO orders_shipping_fee_cents_check;
ALTER TABLE orders RENAME CONSTRAINT orders_total_check TO orders_total_cents_check;

ALTER TABLE orders
    ALTER COLUMN tax_cents SET DEFAULT 0,
    ALTER COLUMN shipping_fee_cents SET DEFAULT 0;

-- VAT rate used for this order (snapshot: rates change, old invoices must stay correct).
-- NULL for orders placed before this migration.
ALTER TABLE orders ADD COLUMN vat_rate_percent SMALLINT
    CHECK (vat_rate_percent BETWEEN 0 AND 100);

-- Prices now include VAT, so tax_cents is the VAT contained in the total, not added on top.
-- NOT VALID: enforced for new and updated rows only. Existing orders followed the old
-- formula and are business records, so they are not rewritten.
ALTER TABLE orders DROP CONSTRAINT chk_orders_total;
ALTER TABLE orders ADD CONSTRAINT chk_orders_total
    CHECK (total_cents = subtotal_cents + shipping_fee_cents) NOT VALID;

-- Down Migration

ALTER TABLE orders DROP CONSTRAINT chk_orders_total;
ALTER TABLE orders DROP COLUMN vat_rate_percent;

ALTER TABLE orders
    ALTER COLUMN tax_cents DROP DEFAULT,
    ALTER COLUMN shipping_fee_cents DROP DEFAULT;

ALTER TABLE orders RENAME CONSTRAINT orders_subtotal_cents_check TO orders_subtotal_check;
ALTER TABLE orders RENAME CONSTRAINT orders_tax_cents_check TO orders_tax_check;
ALTER TABLE orders RENAME CONSTRAINT orders_shipping_fee_cents_check TO orders_shipping_fee_check;
ALTER TABLE orders RENAME CONSTRAINT orders_total_cents_check TO orders_total_check;
ALTER TABLE orders RENAME COLUMN subtotal_cents TO subtotal;
ALTER TABLE orders RENAME COLUMN tax_cents TO tax;
ALTER TABLE orders RENAME COLUMN shipping_fee_cents TO shipping_fee;
ALTER TABLE orders RENAME COLUMN total_cents TO total;

ALTER TABLE orders
    ALTER COLUMN subtotal TYPE NUMERIC(10, 2) USING subtotal / 100.0,
    ALTER COLUMN tax TYPE NUMERIC(10, 2) USING tax / 100.0,
    ALTER COLUMN shipping_fee TYPE NUMERIC(10, 2) USING shipping_fee / 100.0,
    ALTER COLUMN total TYPE NUMERIC(10, 2) USING total / 100.0;

ALTER TABLE orders
    ALTER COLUMN tax SET DEFAULT 0.00,
    ALTER COLUMN shipping_fee SET DEFAULT 0.00;

-- Orders placed with included VAT do not satisfy the old formula, hence NOT VALID
ALTER TABLE orders ADD CONSTRAINT chk_orders_total
    CHECK (total = subtotal + tax + shipping_fee) NOT VALID;

ALTER TABLE order_items
    RENAME CONSTRAINT order_items_unit_price_cents_check TO order_items_unit_price_check;
ALTER TABLE order_items RENAME COLUMN unit_price_cents TO unit_price;
ALTER TABLE order_items ALTER COLUMN unit_price TYPE NUMERIC(10, 2) USING unit_price / 100.0;

ALTER TABLE products RENAME CONSTRAINT products_price_cents_check TO products_price_check;
ALTER TABLE products RENAME COLUMN price_cents TO price;
ALTER TABLE products ALTER COLUMN price TYPE NUMERIC(10, 2) USING price / 100.0;
