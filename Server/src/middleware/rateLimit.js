import { rateLimit } from 'express-rate-limit';
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const MINUTE_MS = 60 * 1000;

/**
 * Limits requests per client IP within a time window. Over the limit: 429 in the
 * usual error format, plus RateLimit headers that tell the client when to retry.
 *
 * Counters live in memory: fine for one server process. With several instances
 * each one counts on its own, then a shared store (e.g. Redis) is needed.
 */
export const createRateLimiter = ({
  windowMinutes,
  limit,
  message,
  enabled = config.rateLimitEnabled,
}) =>
  rateLimit({
    windowMs: windowMinutes * MINUTE_MS,
    limit,
    // RateLimit + RateLimit-Policy headers (IETF draft), not the old X-RateLimit-* ones
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !enabled,
    handler: (req, res, next) => next(new AppError(message, 429)),
  });

/**
 * Whole API: generous, only stops scripts hammering the server
 */
export const apiLimiter = createRateLimiter({
  windowMinutes: 15,
  limit: 300,
  message: 'Too many requests. Please try again later.',
});

/**
 * Login, registration and email-link endpoints: strict against password guessing,
 * credential stuffing (leaked password lists) and sending masses of emails.
 * One counter per IP shared by all of them, so switching endpoints does not help.
 */
export const authLimiter = createRateLimiter({
  windowMinutes: 15,
  limit: 10,
  message: 'Too many attempts. Please try again in 15 minutes.',
});

export default { createRateLimiter, apiLimiter, authLimiter };
