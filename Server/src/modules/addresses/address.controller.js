import { catchAsync } from '../../utils/catchAsync.js';
import { addressService } from './address.service.js';

export const addressController = {
  /**
   * Get all addresses for current user
   * GET /api/addresses
   */
  getAll: catchAsync(async (req, res) => {
    const addresses = await addressService.getMyAddresses(req.user.id);
    res.status(200).json({
      success: true,
      count: addresses.length,
      data: { addresses },
    });
  }),

  /**
   * Get single address by ID
   * GET /api/addresses/:id
   */
  getOne: catchAsync(async (req, res) => {
    const id = req.idParam || req.params.id;
    const address = await addressService.getAddressById(id, req.user.id);
    res.status(200).json({
      success: true,
      data: { address },
    });
  }),

  /**
   * Add a new address
   * POST /api/addresses
   */
  create: catchAsync(async (req, res) => {
    const address = await addressService.createAddress(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: { address },
    });
  }),

  /**
   * Update an address
   * PUT /api/addresses/:id
   */
  update: catchAsync(async (req, res) => {
    const id = req.idParam || req.params.id;
    const address = await addressService.updateAddress(id, req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: { address },
    });
  }),

  /**
   * Delete an address
   * DELETE /api/addresses/:id
   */
  delete: catchAsync(async (req, res) => {
    const id = req.idParam || req.params.id;
    await addressService.deleteAddress(id, req.user.id);
    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  }),
};

export default addressController;
