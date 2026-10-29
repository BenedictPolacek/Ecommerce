import pool from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { paginationMeta, toOffset } from '../../utils/pagination.js';
import { productRepository } from '../products/product.repository.js';
import { stockRepository } from './stock.repository.js';

/**
 * Runs fn(client, product) inside a transaction with the product row locked
 */
const withLockedProduct = async (productId, fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const product = await stockRepository.lockProduct(client, productId);
    if (!product) throw new AppError('Product not found', 404);

    const result = await fn(client, product);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const stockService = {
  /**
   * Relative change chosen by an admin: restock (+), damage (-) or adjustment (+/-)
   */
  async recordMovement(productId, { reason, quantity, note }, userId) {
    return withLockedProduct(productId, async (client, product) => {
      if (product.stock_quantity + quantity < 0) {
        throw new AppError(
          `Stock cannot go below 0 (current stock: ${product.stock_quantity})`,
          409
        );
      }
      return stockRepository.applyMovement(client, {
        productId,
        quantity,
        reason,
        createdBy: userId,
        note,
      });
    });
  },

  /**
   * Sets the stock to an absolute value (inventory count) and logs the difference.
   * Returns null if nothing changed, since the ledger never stores 0-movements.
   */
  async setStock(productId, { stock_quantity, note }, userId) {
    return withLockedProduct(productId, async (client, product) => {
      const difference = stock_quantity - product.stock_quantity;
      if (difference === 0) return null;

      return stockRepository.applyMovement(client, {
        productId,
        quantity: difference,
        reason: 'adjustment',
        createdBy: userId,
        note,
      });
    });
  },

  async listMovements(productId, { page, limit }) {
    const product = await productRepository.findById(productId);
    if (!product) throw new AppError('Product not found', 404);

    const { movements, total } = await stockRepository.findByProductId({
      productId,
      limit,
      offset: toOffset({ page, limit }),
    });
    return { movements, pagination: paginationMeta({ page, limit }, total) };
  },
};

export default stockService;
