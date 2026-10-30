import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { sendMailInBackground } from '../../mail/mailer.js';
import { passwordChangedMail } from '../../mail/templates.js';
import { AppError } from '../../utils/AppError.js';
import { withTransaction } from '../../utils/transaction.js';
import { userRepository } from '../users/user.repository.js';
import { prepareTokenMail, recentlySent } from './account-emails.js';
import { sessionRepository } from './session.repository.js';
import { userTokenRepository } from './user-token.repository.js';
import { generateToken, hashToken, refreshTokenTtlMs, signAccessToken } from './tokens.js';

const newExpiry = () => new Date(Date.now() + refreshTokenTtlMs());

/**
 * Issues a new refresh token for a session and stores its hash
 * @param {import('pg').PoolClient} client - Transaction client
 */
const issueRefreshToken = async (client, sessionId) => {
  const refreshToken = generateToken();
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

    // 3. Create user, cart, session and verification token atomically in a transaction
    const { verificationMail, ...result } = await withTransaction(async (client) => {
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
      const verificationMail = await prepareTokenMail(user, 'email_verification', client);
      return { user, ...tokens, verificationMail };
    });

    // Only after COMMIT: a rolled-back registration must not send a link
    sendMailInBackground(verificationMail);
    return result;
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
      email_verified_at: user.email_verified_at,
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

  /**
   * Confirms the email address with the token from the verification link
   */
  async verifyEmail(token) {
    await withTransaction(async (client) => {
      const userId = await userTokenRepository.consume(client, {
        tokenHash: hashToken(token),
        purpose: 'email_verification',
      });
      if (!userId) {
        throw new AppError('Invalid or expired verification link. Please request a new one.', 400);
      }
      await userRepository.markEmailVerified(userId, client);
    });
  },

  /**
   * Sends a new verification link; older links stop working
   */
  async resendVerification(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.email_verified_at) throw new AppError('Email address is already verified', 400);
    if (await recentlySent(user.id, 'email_verification')) {
      throw new AppError('Please wait a minute before requesting another email.', 429);
    }

    sendMailInBackground(await prepareTokenMail(user, 'email_verification'));
  },

  /**
   * Sends a reset link if the account exists. The caller always gets the same answer,
   * so nobody can find out which email addresses are registered (account enumeration).
   */
  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) return;
    // Silently skipped as well: an error here would reveal that the account exists
    if (await recentlySent(user.id, 'password_reset')) return;

    sendMailInBackground(await prepareTokenMail(user, 'password_reset'));
  },

  /**
   * Sets a new password with the token from the reset link and logs out every device
   */
  async resetPassword({ token, password }) {
    // Hash before the transaction: bcrypt is slow on purpose and must not hold it open
    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    const user = await withTransaction(async (client) => {
      const userId = await userTokenRepository.consume(client, {
        tokenHash: hashToken(token),
        purpose: 'password_reset',
      });
      if (!userId) {
        throw new AppError(
          'Invalid or expired password reset link. Please request a new one.',
          400
        );
      }

      const updated = await userRepository.updatePassword(userId, passwordHash, client);
      // Opening the link proved access to the mailbox
      await userRepository.markEmailVerified(userId, client);
      // Whoever knew the old password (maybe an attacker) is logged out everywhere
      await sessionRepository.revokeAllForUser(userId, 'password_reset', { client });
      return updated;
    });

    sendMailInBackground(passwordChangedMail({ to: user.email, firstName: user.first_name }));
  },

  /**
   * Logged-in password change. Requires the current password, so a stolen session
   * alone cannot lock the owner out. Other devices are logged out, this one stays.
   */
  async changePassword({ userId, sessionId }, { currentPassword, newPassword }) {
    const currentHash = await userRepository.findPasswordHashById(userId);
    if (!currentHash) throw new AppError('User not found', 404);
    // 400, not 401: the user is logged in, only the entered password is wrong
    if (!(await bcrypt.compare(currentPassword, currentHash))) {
      throw new AppError('Current password is incorrect', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
    const user = await withTransaction(async (client) => {
      const updated = await userRepository.updatePassword(userId, passwordHash, client);
      await sessionRepository.revokeAllForUser(userId, 'password_changed', {
        exceptSessionId: sessionId,
        client,
      });
      return updated;
    });

    sendMailInBackground(passwordChangedMail({ to: user.email, firstName: user.first_name }));
  },
};

export default authService;
