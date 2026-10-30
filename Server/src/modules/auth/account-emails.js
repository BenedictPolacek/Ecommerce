import { config } from '../../config/env.js';
import { passwordResetMail, verifyEmailMail } from '../../mail/templates.js';
import { userTokenRepository } from './user-token.repository.js';
import { generateToken, hashToken } from './tokens.js';

const HOUR_MS = 60 * 60 * 1000;

// A reset link can take over the account, so it lives much shorter than a verification link
const PURPOSES = {
  email_verification: { ttlMs: 24 * HOUR_MS, path: '/verify-email', template: verifyEmailMail },
  password_reset: { ttlMs: HOUR_MS, path: '/reset-password', template: passwordResetMail },
};

// At most one email per user and purpose per minute (no mailbox spamming)
export const RESEND_COOLDOWN_SECONDS = 60;

export const recentlySent = (userId, purpose) =>
  userTokenRepository.issuedWithin(userId, purpose, RESEND_COOLDOWN_SECONDS);

/**
 * Stores a new single-use token (only its hash) and returns the email carrying the link.
 * The caller sends it, after its transaction has committed.
 * The link points to the frontend, which posts the token to the API: a GET link that
 * changes data would be "clicked" by mail scanners and link previews.
 * @param {'email_verification' | 'password_reset'} purpose
 * @param {import('pg').PoolClient} [client] - Optional transaction client
 */
export const prepareTokenMail = async (user, purpose, client) => {
  const { ttlMs, path, template } = PURPOSES[purpose];
  const token = generateToken();

  await userTokenRepository.replace(
    {
      userId: user.id,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
    },
    client
  );

  return template({
    to: user.email,
    firstName: user.first_name,
    link: `${config.appUrl}${path}?token=${token}`,
  });
};
