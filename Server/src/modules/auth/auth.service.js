import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../config/db.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { userRepository } from '../users/user.repository.js';
import { sessionRepository } from './session.repository.js';
import { generateRefreshToken, hashToken, refreshTokenTtlMs, signAccessToken } from './tokens.js';

const newExpiry = () => new Date(Date.now() + refreshTokenTtlMs());

/**
 * Issues a new refresh token for a session and stores its hash
 * @param {import('pg').PoolClient} client - Transaction client
 */
const issueRefreshToken = async (client, sessionId) => {
  const refreshToken = generateRefreshToken();
  await sessionRepository.insertRefreshToken(client, {
    sessionId,
    tokenHash: hashToken(refreshToken),
  });
  return refreshToken;
};

/**
 * Starts a session (one per login/device) and returns its first token pair
 * @param {import('pg').PoolClient} client - Transaction client
 */
const startSession = async (client, user, userAgent) => {
  const session = await sessionRepository.create(client, {
    userId: user.id,
    userAgent: userAgent?.slice(0, 500) || null,
    expiresAt: newExpiry(),
  });
  const refreshToken = await issueRefreshToken(client, session.id);
  return { token: signAccessToken(user, session.id), refreshToken };
};

const withTransaction = async (fn) => {
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

const invalidRefreshToken = () =>
  new AppError('Invalid or expired refresh token. Please log in again.', 401);

export const authService = {
  /**
   * Register a new user, create their shopping cart and first session
   */
  async register({ email, password, first_name, last_name }, { userAgent } = {}) {
    // 1. Check for existing user
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    // 2. Hash password
    const password_hash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    // 3. Create user, cart and session atomically in a transaction
    return withTransaction(async (client) => {
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

      const tokens = await startSession(client, user, userAgent);
      return { user, ...tokens };
    });
  },

  /**
   * Authenticate user credentials and start a new session
   */
  async login({ email, password }, { userAgent } = {}) {
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

    // 4. Housekeeping instead of a cron job: drop this user's dead sessions
    await sessionRepository.deleteInactiveForUser(user.id);

    const tokens = await withTransaction((client) => startSession(client, safeUser, userAgent));
    return { user: safeUser, ...tokens };
  },

  /**
   * Rotation: uses up the refresh token and returns a new token pair.
   * A token that was already used means it was copied (stolen): the whole
   * session is revoked, so neither the thief nor the victim can continue with it.
   */
  async refresh(refreshToken) {
    if (!refreshToken) throw invalidRefreshToken();

    let reuseDetected = false;
    const tokens = await withTransaction(async (client) => {
      const stored = await sessionRepository.lockRefreshToken(client, hashToken(refreshToken));
      if (!stored || stored.revoked_at || stored.is_expired) return null;

      if (stored.used_at) {
        // Committed (not rolled back), so the revocation sticks although the request fails
        await sessionRepository.revoke(
          { sessionId: stored.session_id, reason: 'reuse_detected' },
          client
        );
        reuseDetected = true;
        return null;
      }

      const user = await userRepository.findById(stored.user_id);
      if (!user) return null;

      await sessionRepository.markRefreshTokenUsed(client, stored.id);
      await sessionRepository.extend(client, stored.session_id, newExpiry());
      const nextRefreshToken = await issueRefreshToken(client, stored.session_id);
      return { token: signAccessToken(user, stored.session_id), refreshToken: nextRefreshToken };
    });

    if (!tokens) {
      throw reuseDetected
        ? new AppError('Refresh token was already used. The session has been ended.', 401)
        : invalidRefreshToken();
    }
    return tokens;
  },

  /**
   * Ends the current session. Works with the refresh token or with an access token,
   * even an expired one (the signature is still checked), so logout never fails.
   */
  async logout({ refreshToken, accessToken }) {
    let sessionId = refreshToken
      ? await sessionRepository.findSessionIdByTokenHash(hashToken(refreshToken))
      : null;

    if (!sessionId && accessToken) {
      try {
        const decoded = jwt.verify(accessToken, config.jwt.secret, { ignoreExpiration: true });
        sessionId = decoded.sid ?? null;
      } catch {
        // Forged or malformed token: nothing to revoke
      }
    }

    if (sessionId) {
      await sessionRepository.revoke({ sessionId, reason: 'logout' });
    }
  },

  async logoutAll(userId) {
    return sessionRepository.revokeAllForUser(userId, 'logout_all');
  },

  /**
   * Active sessions of the user; current marks the one this request comes from
   */
  async listSessions(userId, currentSessionId) {
    const sessions = await sessionRepository.findActiveByUser(userId);
    return sessions.map((session) => ({ ...session, current: session.id === currentSessionId }));
  },

  /**
   * Ends one of the user's own sessions (e.g. a lost phone).
   * Someone else's session gets the same 404 as a missing one.
   */
  async endSession(userId, sessionId) {
    const revoked = await sessionRepository.revoke({
      sessionId,
      userId,
      reason: 'session_ended',
    });
    if (!revoked) throw new AppError('Session not found', 404);
  },
};

export default authService;
