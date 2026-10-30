import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { userRepository } from '../modules/users/user.repository.js';
import { sessionRepository } from '../modules/auth/session.repository.js';

const getToken = (req) => {
  // 1. Check for token in httpOnly cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  // 2. Fallback to Authorization: Bearer <token> header (for mobile/Postman)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

/**
 * Valid signature, not expired, and its session still active. Throws otherwise.
 * The session check makes logout take effect immediately instead of when the token runs out.
 * Tokens from before sessions existed (no sid) are rejected.
 */
const verifyAccessToken = async (token) => {
  const decoded = jwt.verify(token, config.jwt.secret);
  if (!decoded.sid || !(await sessionRepository.isActive(decoded.sid, decoded.id))) {
    throw new AppError('Your session has ended. Please log in again.', 401);
  }
  return decoded;
};

/**
 * Middleware to authenticate requests via JWT (cookie or Bearer header).
 * Populates `req.user` with `{ id, email, sessionId }` from the token.
 * Role is NOT set here — it is fetched live from the DB inside `authorize()`.
 */
export const authenticate = async (req, res, next) => {
  const token = getToken(req);

  if (!token) {
    return next(new AppError('Authentication token missing. Please log in.', 401));
  }

  try {
    const decoded = await verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      sessionId: decoded.sid,
    };
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error.name === 'TokenExpiredError') {
      return next(
        new AppError(
          'Authentication token has expired. Refresh it via POST /api/auth/refresh.',
          401
        )
      );
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid authentication token', 401));
    }
    return next(error);
  }
};

/**
 * For public routes that show more to admins (e.g. inactive products).
 * With a valid token, sets req.user incl. the live role from the DB; otherwise continues anonymously.
 * An invalid or expired token is treated as anonymous, so a stale cookie never blocks
 * browsing the catalog, and it can only ever grant fewer rights, never more.
 */
export const optionalAuthenticate = async (req, res, next) => {
  const token = getToken(req);
  if (!token) return next();

  try {
    let decoded;
    try {
      decoded = await verifyAccessToken(token);
    } catch (error) {
      // Invalid, expired or ended session: browse anonymously. DB errors still surface.
      if (error instanceof AppError || error instanceof jwt.JsonWebTokenError) return next();
      throw error;
    }

    const user = await userRepository.findById(decoded.id);
    if (user) {
      req.user = { id: user.id, email: user.email, role: user.role };
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based access control middleware.
 * Queries the DB for the user's current role (overwriting the token role),
 * then checks if that role is in the allowed list.
 *
 * This ensures role changes or account deletions take effect immediately,
 * without needing a separate `verifyLiveUser` middleware.
 *
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'customer')
 */
export const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      const user = await userRepository.findById(req.user.id);

      if (!user) {
        return next(new AppError('User no longer exists. Please log in again.', 401));
      }

      // Overwrite token role with the live role from the database
      req.user.role = user.role;
      req.user.email = user.email;

      if (!roles.includes(req.user.role)) {
        return next(new AppError('You do not have permission to perform this action.', 403));
      }

      next();
    } catch {
      return next(new AppError('Failed to verify user permissions.', 500));
    }
  };
};

export default { authenticate, optionalAuthenticate, authorize };
