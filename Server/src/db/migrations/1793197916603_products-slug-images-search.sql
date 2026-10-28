-- Up Migration

-- 1. Slug: added nullable, backfilled for existing rows, then made required.
--    Products with the same name get -2, -3, ... (oldest product keeps the plain slug).
ALTER TABLE products ADD COLUMN slug VARCHAR(255);

UPDATE products p
SET slug = numbered.slug
FROM (
    SELECT id, CASE WHEN rn = 1 THEN base ELSE base || '-' || rn END AS slug
    FROM (
        SELECT id, base, ROW_NUMBER() OVER (PARTITION BY base ORDER BY created_at, id) AS rn
        FROM (
            SELECT id, created_at,
                   COALESCE(
                       NULLIF(TRIM(BOTH '-' FROM regexp_replace(LOWER(name), '[^a-z0-9]+', '-', 'g')), ''),
                       'product'
                   ) AS base
            FROM products
        ) AS bases
    ) AS ranked
) AS numbered
WHERE p.id = numbered.id;

ALTER TABLE products
    ALTER COLUMN slug SET NOT NULL,
    ADD CONSTRAINT products_slug_key UNIQUE (slug);

-- 2. Full-text search. A generated column is recomputed by Postgres on every
--    insert/update, so it can never get out of sync with name/description.
--    Weights: A (name) ranks above B (description).
ALTER TABLE products ADD COLUMN search_vector TSVECTOR
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B')
    ) STORED;

-- GIN = inverted index (word → rows), the index type made for tsvector
CREATE INDEX idx_products_search_vector ON products USING GIN (search_vector);

-- 3. Images. Only the URL is stored; the file itself lives on a CDN/object storage.
--    The lowest sort_order is the primary image.
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- DEFERRABLE: checked at COMMIT, so a reorder can swap positions inside one transaction.
    -- Its leading product_id column also serves "all images of a product".
    CONSTRAINT uq_product_images_position UNIQUE (product_id, sort_order)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE TRIGGER trg_product_images_updated_at BEFORE UPDATE ON product_images
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TABLE IF EXISTS product_images;
DROP INDEX IF EXISTS idx_products_search_vector;
ALTER TABLE products
    DROP COLUMN IF EXISTS search_vector,
    DROP COLUMN IF EXISTS slug;
