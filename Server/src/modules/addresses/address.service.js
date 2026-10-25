import pool from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { addressRepository } from './address.repository.js';

/**
 * Runs fn(client) in a transaction, so clearing the old default and
 * saving the new one either both happen or neither does.
 */
const inTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

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
    return await inTransaction(async (client) => {
      if (data.is_default) {
        await addressRepository.clearDefault(userId, client);
      }
      return await addressRepository.create(userId, data, client);
    });
  },

  async updateAddress(id, userId, data) {
    const existing = await addressRepository.findUserAddress(id, userId);
    if (!existing) {
      throw new AppError('Address not found', 404);
    }

    return await inTransaction(async (client) => {
      if (data.is_default) {
        await addressRepository.clearDefault(userId, client);
      }
      return await addressRepository.update(id, userId, data, client);
    });
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
