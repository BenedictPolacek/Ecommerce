import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { userRepository } from '../modules/users/user.repository.js';

/**
 * Middleware to authenticate requests via JWT Bearer token.
 * Populates `req.user` with `{ id, email }` from the token.
 * Role is NOT set here — it is fetched live from the DB inside `authorize()`.
 */
export const authenticate = (req, res, next) => {
  let token;

  // 1. Check for token in httpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fallback to Authorization: Bearer <token> header (for mobile/Postman)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication token missing. Please log in.', 401));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Authentication token has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid authentication token', 401));
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
    } catch (error) {
      return next(new AppError('Failed to verify user permissions.', 500));
    }
  };
};

export default { authenticate, authorize };
