import { catchAsync } from '../../utils/catchAsync.js';
import { paymentService } from './payment.service.js';

export const paymentController = {
  /**
   * Record a manual payment for an order (Admin only)
   * POST /api/orders/:id/payments
   */
  record: catchAsync(async (req, res) => {
    const result = await paymentService.recordManualPayment(req.idParam, req.body);
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: result,
    });
  }),
};

export default paymentController;
