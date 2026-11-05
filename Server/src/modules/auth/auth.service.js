import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { sendMailInBackground } from '../../mail/mailer.js';
import { passwordChangedMail } from '../../mail/templates.js';
import { AppError } from '../../utils/AppError.js';
import { withTransaction } from '../../utils/transaction.js';
import { userRepository } from '../users/user.repository.js';
import { noPasswordYet } from '../users/user.service.js';
import { prepareTokenMail, recentlySent } from './account-emails.js';
import { identityRepository } from './identity.repository.js';
import { OAuthSignInError } from './oauth/oauth-error.js';
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
      return { user: { ...user, has_password: true }, ...tokens, verificationMail };
    });

    // Only after COMMIT: a rolled-back registration must not send a link
    sendMailInBackground(verificationMail);
    return result;
  },

  /**
   * Authenticate user credentials and start a new session
   */
  async login({ email, password }, { userAgent } = {}) {
    // 1. Find user by email. Accounts without a password (Google/GitHub only) get the same
    // answer as a wrong password, so the error does not reveal how someone signs in.
    const user = await userRepository.findByEmail(email);
    if (!user?.password_hash) {
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
      has_password: true,
    };

    // 4. Housekeeping instead of a cron job: drop this user's dead sessions
    await sessionRepository.deleteInactiveForUser(user.id);

    const tokens = await withTransaction((client) => startSession(client, safeUser, userAgent));
    return { user: safeUser, ...tokens };
  },

  /**
   * Sign in with Google/GitHub after the provider confirmed who the user is.
   * 1. Known provider account: log in.
   * 2. Same email as an existing account: link it (only with a verified email, so nobody
   *    takes over an account with an address they do not own).
   * 3. Otherwise: create an account without a password (email already verified).
   */
  async oauthSignIn(provider, profile, { userAgent } = {}) {
    if (!profile.providerUserId || !profile.email || !profile.emailVerified) {
      throw new OAuthSignInError('email_unverified');
    }
    const email = profile.email.toLowerCase().trim();

    try {
      return await withTransaction(async (client) => {
        let user = await identityRepository.findUser(client, provider, profile.providerUserId);

        if (user) {
          await identityRepository.touch(client, provider, profile.providerUserId);
        } else {
          user = await userRepository.findByEmail(email);
          if (user && !user.email_verified_at) {
            // Pre-account takeover: someone may have registered this email without owning
            // it and still know the password. The provider proved who owns the mailbox,
            // so the unproven password and its sessions are removed.
            await userRepository.clearPassword(client, user.id);
            await sessionRepository.revokeAllForUser(user.id, 'account_linked', { client });
          }
          if (!user) {
            const fallbackName = email.split('@')[0];
            user = await userRepository.create(
              {
                email,
                password_hash: null,
                first_name: (profile.firstName?.trim() || fallbackName).slice(0, 100),
                last_name: (profile.lastName?.trim() ?? '').slice(0, 100),
              },
              client
            );
            await client.query('INSERT INTO carts (user_id) VALUES ($1)', [user.id]);
          }
          // The provider verified the address
          await userRepository.markEmailVerified(user.id, client);
          await identityRepository.create(client, {
            userId: user.id,
            provider,
            providerUserId: profile.providerUserId,
            email,
          });
        }

        // Fresh row: email_verified_at and has_password may have just changed
        const fresh = await userRepository.findById(user.id, client);
        const tokens = await startSession(client, fresh, userAgent);
        return { user: fresh, ...tokens };
      });
    } catch (error) {
      // 23505: the account already has another account of this provider linked
      if (error.code === '23505') throw new OAuthSignInError('already_linked');
      throw error;
    }
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
    const account = await userRepository.findPasswordHashById(userId);
    if (!account) throw new AppError('User not found', 404);
    if (!account.password_hash) throw noPasswordYet();
    // 400, not 401: the user is logged in, only the entered password is wrong
    if (!(await bcrypt.compare(currentPassword, account.password_hash))) {
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
