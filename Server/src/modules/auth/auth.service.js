import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../config/db.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { userRepository } from '../users/user.repository.js';

/**
 * Sign a JWT token containing the user's UUID and email.
 * Role is NOT stored in the token — it is always fetched live from the
 * database in `authorize()` to prevent stale permission issues.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export const authService = {
  /**
   * Register a new user, create their shopping cart, and return token
   */
  async register({ email, password, first_name, last_name }) {
    // 1. Check for existing user
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    // 2. Hash password
    const password_hash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    // 3. Create user and cart atomically in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const user = await userRepository.create(
        {
          email,
          password_hash,
          first_name,
          last_name,
          role: 'customer',
        },
        client
      );

      // Initialize empty shopping cart for the new user
      await client.query('INSERT INTO carts (user_id) VALUES ($1)', [user.id]);

      await client.query('COMMIT');

      const token = generateToken(user);
      return { user, token };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Authenticate user credentials and return token
   */
  async login({ email, password }) {
    // 1. Find user by email
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // 3. Prepare sanitized user response (no password_hash)
    const safeUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    const token = generateToken(safeUser);
    return { user: safeUser, token };
  },
};

export default authService;
