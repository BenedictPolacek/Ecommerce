-- Up Migration

ALTER TABLE categories
    ADD COLUMN parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD CONSTRAINT chk_categories_not_own_parent CHECK (parent_id <> id);

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Names only need to be unique among siblings ("Shirts" under Men and Women).
-- NULLS NOT DISTINCT makes top-level categories (parent_id NULL) count as siblings too.
-- The leading parent_id column also serves lookups of a category's children.
ALTER TABLE categories DROP CONSTRAINT categories_name_key;
CREATE UNIQUE INDEX uq_categories_parent_name
    ON categories(parent_id, LOWER(name)) NULLS NOT DISTINCT;

-- Deleting a category that still has products is blocked instead of silently
-- leaving the products without a category.
ALTER TABLE products DROP CONSTRAINT products_category_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;

-- Down Migration

ALTER TABLE products DROP CONSTRAINT products_category_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Fails if sibling-only duplicates exist; rename them first.
DROP INDEX IF EXISTS uq_categories_parent_name;
ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
ALTER TABLE categories
    DROP CONSTRAINT IF EXISTS chk_categories_not_own_parent,
    DROP COLUMN updated_at,
    DROP COLUMN created_at,
    DROP COLUMN parent_id;
