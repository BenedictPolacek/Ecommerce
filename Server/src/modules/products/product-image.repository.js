import pool from '../../config/db.js';

const COLUMNS = 'id, product_id, url, alt_text, sort_order, created_at, updated_at';

export const productImageRepository = {
  /**
   * All images of a product, primary image (lowest sort_order) first
   */
  async findByProductId(productId) {
    const query = `
      SELECT ${COLUMNS}
      FROM product_images
      WHERE product_id = $1
      ORDER BY sort_order
    `;
    const result = await pool.query(query, [productId]);
    return result.rows;
  },

  /**
   * Append an image at the end of the product's gallery
   */
  async create(productId, { url, alt_text }) {
    const query = `
      INSERT INTO product_images (product_id, url, alt_text, sort_order)
      VALUES (
        $1, $2, $3,
        (SELECT COALESCE(MAX(sort_order) + 1, 0) FROM product_images WHERE product_id = $1)
      )
      RETURNING ${COLUMNS}
    `;
    const result = await pool.query(query, [productId, url, alt_text ?? null]);
    return result.rows[0];
  },

  /**
   * Give each image the position of its ID in imageIds (0 = primary).
   * Swapping positions only works because the unique constraint is DEFERRABLE.
   */
  async reorder(productId, imageIds) {
    const query = `
      UPDATE product_images pi
      SET sort_order = positions.ord - 1
      FROM unnest($2::uuid[]) WITH ORDINALITY AS positions(id, ord)
      WHERE pi.id = positions.id AND pi.product_id = $1
    `;
    await pool.query(query, [productId, imageIds]);
  },

  async delete(productId, imageId) {
    const query = `
      DELETE FROM product_images
      WHERE id = $1 AND product_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [imageId, productId]);
    return result.rows[0] || null;
  },
};

export default productImageRepository;
