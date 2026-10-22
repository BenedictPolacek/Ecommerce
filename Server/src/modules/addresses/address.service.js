import { AppError } from '../../utils/AppError.js';
import { addressRepository } from './address.repository.js';

export const addressService = {
  async getMyAddresses(userId) {
    return await addressRepository.findByUserId(userId);
  },

  async getAddressById(id, userId) {
    const address = await addressRepository.findUserAddress(id, userId);
    if (!address) {
      throw new AppError('Address not found', 404);
    }
    return address;
  },

  async createAddress(userId, data) {
    if (data.is_default) {
      await addressRepository.clearDefault(userId);
    }
    return await addressRepository.create(userId, data);
  },

  async updateAddress(id, userId, data) {
    const existing = await addressRepository.findUserAddress(id, userId);
    if (!existing) {
      throw new AppError('Address not found', 404);
    }

    if (data.is_default) {
      await addressRepository.clearDefault(userId);
    }

    return await addressRepository.update(id, userId, data);
  },

  async deleteAddress(id, userId) {
    const deleted = await addressRepository.delete(id, userId);
    if (!deleted) {
      throw new AppError('Address not found', 404);
    }
    return deleted;
  },
};

export default addressService;
