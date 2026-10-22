import { catchAsync } from '../../utils/catchAsync.js';
import { userService } from './user.service.js';

export const userController = {
  /**
   * Get current authenticated user profile
   * GET /api/users/me
   */
  getMe: catchAsync(async (req, res) => {
    const user = await userService.getProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: { user },
    });
  }),

  /**
   * Update current authenticated user profile
   * PATCH /api/users/me
   */
  updateMe: catchAsync(async (req, res) => {
    const updatedUser = await userService.updateProfile(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  }),
};

export default userController;
