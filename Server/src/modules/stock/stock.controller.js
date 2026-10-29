import { catchAsync } from '../../utils/catchAsync.js';
import { stockService } from './stock.service.js';
import { movementListQuerySchema } from './stock.validation.js';

export const stockController = {
  /**
   * One page of a product's stock movements (Admin only)
   * GET /api/products/:id/stock-movements?page=&limit=
   */
  list: catchAsync(async (req, res) => {
    const query = movementListQuerySchema.parse(req.query);
    const result = await stockService.listMovements(req.idParam, query);
    res.status(200).json({
      success: true,
      data: result,
    });
  }),

  /**
   * Record a restock, damage or adjustment (Admin only)
   * POST /api/products/:id/stock-movements
   */
  record: catchAsync(async (req, res) => {
    const movement = await stockService.recordMovement(req.idParam, req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: 'Stock movement recorded successfully',
      data: { movement },
    });
  }),
};

export default stockController;
