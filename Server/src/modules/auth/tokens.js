import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const accessTokenTtlMs = () => config.jwt.accessTokenTtlMinutes * 60 * 1000;
export const refreshTokenTtlMs = () => config.jwt.refreshTokenTtlDays * DAY_MS;

/**
 * Short-lived JWT. sid (session id) lets authenticate() reject it as soon as the
 * session is revoked. Role is NOT stored: authorize() reads it live from the DB.
 */
export const signAccessToken = (user, sessionId) =>
  jwt.sign({ id: user.id, email: user.email, sid: sessionId }, config.jwt.secret, {
    expiresIn: config.jwt.accessTokenTtlMinutes * 60,
  });

/**
 * Opaque refresh token: 256 random bits, URL-safe. Not a JWT, because it is
 * looked up in the database anyway (that is what makes it revocable).
 */
export const generateRefreshToken = () => randomBytes(32).toString('base64url');

/**
 * Only this hash is stored. SHA-256 is enough (unlike passwords, which need bcrypt):
 * a random 256-bit value cannot be guessed or brute-forced from its hash.
 */
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');
