import { catchAsync } from '../../utils/catchAsync.js';
import { cartService } from './cart.service.js';

export const cartController = {
  /**
   * Get current user's shopping cart
   * GET /api/cart
   */
  getCart: catchAsync(async (req, res) => {
    const cart = await cartService.getCart(req.user.id);
    res.status(200).json({
      success: true,
      data: { cart },
    });
  }),

  /**
   * Add item to shopping cart
   * POST /api/cart/items
   */
  addItem: catchAsync(async (req, res) => {
    const cart = await cartService.addItem(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: { cart },
    });
  }),

  /**
   * Update quantity of an item in the cart
   * PUT /api/cart/items/:productId
   */
  updateItem: catchAsync(async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateItem(req.user.id, productId, quantity);
    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: { cart },
    });
  }),

  /**
   * Remove a single item from the cart
   * DELETE /api/cart/items/:productId
   */
  removeItem: catchAsync(async (req, res) => {
    const { productId } = req.params;
    const cart = await cartService.removeItem(req.user.id, productId);
    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: { cart },
    });
  }),

  /**
   * Clear all items from the cart
   * DELETE /api/cart
   */
  clearCart: catchAsync(async (req, res) => {
    const cart = await cartService.clearCart(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: { cart },
    });
  }),
};

export default cartController;
