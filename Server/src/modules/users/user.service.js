import bcrypt from 'bcryptjs';
import { sendMailInBackground } from '../../mail/mailer.js';
import { accountDeletedMail } from '../../mail/templates.js';
import { AppError } from '../../utils/AppError.js';
import { paginationMeta, toOffset } from '../../utils/pagination.js';
import { withTransaction } from '../../utils/transaction.js';
import { OPEN_ORDER_STATUSES } from '../orders/order-status.js';
import { userRepository } from './user.repository.js';

export const noPasswordYet = () =>
  new AppError(
    'Your account has no password yet. Use "Forgot password" to get a link and set one.',
    400
  );

/**
 * Deletes a user (GDPR, Art. 17). With orders or audit entries the row is anonymized,
 * because invoices must be kept (§ 147 AO); otherwise it is really deleted.
 * Either way addresses, cart, sessions and email tokens are gone afterwards.
 * @param {{ allowAdmin: boolean }} options - false: only customers may be deleted
 */
const deleteUser = async (userId, { allowAdmin }) => {
  const user = await withTransaction(async (client) => {
    const target = await userRepository.lockActive(client, userId);
    if (!target) throw new AppError('User not found', 404);

    if (target.role === 'admin') {
      if (!allowAdmin) {
        throw new AppError('Admin accounts cannot be deleted here. Demote the admin first.', 403);
      }
      if ((await userRepository.lockOtherAdmins(client, userId)) === 0) {
        throw new AppError('The last admin account cannot be deleted.', 409);
      }
    }

    // Goods on the way or a refund pending: the customer must stay reachable
    if ((await userRepository.countOrdersWithStatus(client, userId, OPEN_ORDER_STATUSES)) > 0) {
      throw new AppError(
        'There are still open orders. The account can be deleted once they are completed.',
        409
      );
    }

    if (await userRepository.hasRetainedRecords(client, userId)) {
      await userRepository.deletePersonalData(client, userId);
      await userRepository.anonymize(client, userId);
    } else {
      // ON DELETE CASCADE removes addresses, cart, sessions and tokens
      await userRepository.hardDelete(client, userId);
    }
    return target;
  });

  // The old address is only known here, before it is gone from the database
  sendMailInBackground(accountDeletedMail({ to: user.email, firstName: user.first_name }));
};

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
   * Admin: one page of users (search by email or name, optionally one role)
   */
  async listUsers({ search, role, page, limit }) {
    const { users, total } = await userRepository.findPage({
      search,
      role,
      limit,
      offset: toOffset({ page, limit }),
    });
    return { users, pagination: paginationMeta({ page, limit }, total) };
  },

  /**
   * Admin: one user with their order figures (deleted users are not found)
   */
  async getUserForAdmin(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const stats = await userRepository.getOrderStats(userId);
    return { ...user, stats };
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

  /**
   * The user deletes their own account. The password is required, so a stolen
   * session alone cannot destroy the account. Admins may delete themselves,
   * unless they are the last one.
   */
  async deleteOwnAccount(userId, { password }) {
    const account = await userRepository.findPasswordHashById(userId);
    if (!account) throw new AppError('User not found', 404);
    // Google/GitHub-only accounts confirm with a password too: they set one via email first
    if (!account.password_hash) throw noPasswordYet();
    // 400, not 401: the user is logged in, only the entered password is wrong
    if (!(await bcrypt.compare(password, account.password_hash))) {
      throw new AppError('Password is incorrect', 400);
    }

    await deleteUser(userId, { allowAdmin: true });
  },

  /**
   * Admin deletes a customer (e.g. a deletion request by email or phone).
   * Admin accounts are refused, so a hijacked admin account cannot remove the others.
   */
  async deleteCustomer(userId) {
    await deleteUser(userId, { allowAdmin: false });
  },
};

export default userService;
