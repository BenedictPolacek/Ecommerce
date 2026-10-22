import { AppError } from '../../utils/AppError.js';
import { cartRepository } from './cart.repository.js';
import { productRepository } from '../products/product.repository.js';

export const cartService = {
  /**
   * Retrieve full cart details and calculated totals for a user
   */
  async getCart(userId) {
    const cart = await cartRepository.findOrCreateCart(userId);
    const items = await cartRepository.getCartItems(cart.id);

    const totalAmount = items.reduce((acc, item) => acc + Number(item.line_total || 0), 0);
    const totalItems = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);

    return {
      id: cart.id,
      userId: cart.user_id,
      items,
      totalItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      createdAt: cart.created_at,
      updatedAt: cart.updated_at,
    };
  },

  /**
   * Add a product to the user's cart
   */
  async addItem(userId, { productId, quantity }) {
    const product = await productRepository.findById(productId);
    if (!product || !product.is_active) {
      throw new AppError('Product not found or is currently unavailable', 404);
    }

    const cart = await cartRepository.findOrCreateCart(userId);
    const existingItem = await cartRepository.findCartItem(cart.id, productId);
    const desiredQuantity = (existingItem ? existingItem.quantity : 0) + quantity;

    if (desiredQuantity > product.stock_quantity) {
      throw new AppError(
        `Cannot add ${quantity} more. Current stock is ${product.stock_quantity} (you have ${existingItem?.quantity || 0} in cart)`,
        400
      );
    }

    await cartRepository.addItem(cart.id, productId, quantity);
    return await this.getCart(userId);
  },

  /**
   * Update the quantity of a product in the cart
   */
  async updateItem(userId, productId, quantity) {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (quantity > product.stock_quantity) {
      throw new AppError(
        `Requested quantity (${quantity}) exceeds available stock (${product.stock_quantity})`,
        400
      );
    }

    const cart = await cartRepository.findOrCreateCart(userId);
    const updated = await cartRepository.updateItemQuantity(cart.id, productId, quantity);

    if (!updated) {
      throw new AppError('Product is not in your cart', 404);
    }

    return await this.getCart(userId);
  },

  /**
   * Remove a product from the cart
   */
  async removeItem(userId, productId) {
    const cart = await cartRepository.findOrCreateCart(userId);
    const removed = await cartRepository.removeItem(cart.id, productId);

    if (!removed) {
      throw new AppError('Product is not in your cart', 404);
    }

    return await this.getCart(userId);
  },

  /**
   * Clear all items from user's cart
   */
  async clearCart(userId) {
    const cart = await cartRepository.findOrCreateCart(userId);
    await cartRepository.clearCart(cart.id);
    return await this.getCart(userId);
  },
};

export default cartService;
