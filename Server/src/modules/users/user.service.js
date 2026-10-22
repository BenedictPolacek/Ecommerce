import { AppError } from '../../utils/AppError.js';
import { userRepository } from './user.repository.js';

export const userService = {
  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  },

  /**
   * Update user profile information
   */
  async updateProfile(userId, updateData) {
    const updatedUser = await userRepository.update(userId, updateData);
    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }
    return updatedUser;
  },
};

export default userService;
