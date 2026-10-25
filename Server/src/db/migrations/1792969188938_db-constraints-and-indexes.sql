-- Up Migration

-- Emails are stored lowercase so the existing UNIQUE(email) is effectively case-insensitive
-- and lookups by "email = $1" keep using its index.
UPDATE users SET email = LOWER(email) WHERE email <> LOWER(email);
ALTER TABLE users ADD CONSTRAINT chk_users_email_lowercase CHECK (email = LOWER(email));

-- At most one default address per user, also under concurrent requests.
CREATE UNIQUE INDEX uq_addresses_one_default_per_user ON addresses(user_id) WHERE is_default;

-- The stored total must always match its parts.
ALTER TABLE orders ADD CONSTRAINT chk_orders_total
    CHECK (total = subtotal + tax + shipping_fee);

-- Covered by the leading column of uq_order_product (order_id, product_id).
DROP INDEX idx_order_items_order_id;

-- "My orders, newest first". Replaces idx_orders_user_id, which is its leading column.
CREATE INDEX idx_orders_user_id_created_at ON orders(user_id, created_at DESC);
DROP INDEX idx_orders_user_id;

-- Public catalog only lists active products, newest first, optionally by category.
CREATE INDEX idx_products_active_created_at ON products(created_at DESC) WHERE is_active;
CREATE INDEX idx_products_active_category_created_at
    ON products(category_id, created_at DESC) WHERE is_active;

-- Down Migration

DROP INDEX IF EXISTS idx_products_active_category_created_at;
DROP INDEX IF EXISTS idx_products_active_created_at;

CREATE INDEX idx_orders_user_id ON orders(user_id);
DROP INDEX IF EXISTS idx_orders_user_id_created_at;

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_total;
DROP INDEX IF EXISTS uq_addresses_one_default_per_user;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_email_lowercase;
