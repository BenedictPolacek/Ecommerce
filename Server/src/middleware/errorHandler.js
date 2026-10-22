import { AppError } from '../utils/AppError.js';

/**
 * Maps PostgreSQL error codes to operational AppError instances.
 */
const handlePostgresError = (err) => {
  switch (err.code) {
    case '23505': {
      // Unique constraint violation (e.g. duplicate email or SKU)
      const match = err.detail?.match(/Key \((.*?)\)=\((.*?)\) already exists/);
      const field = match ? match[1] : 'value';
      return new AppError(`A record with this ${field} already exists`, 409);
    }
    case '22P02': // Invalid text representation (e.g. invalid UUID format)
      return new AppError('Invalid identifier format (must be a valid UUID)', 400);
    case '23503': // Foreign key violation (referenced record missing)
      return new AppError('Referenced resource does not exist', 400);
    case '23502': // Not null violation
      return new AppError(`Missing required database field: ${err.column || 'value'}`, 400);
    case '23514': // Check constraint violation
      return new AppError('Database constraint check failed', 400);
    default:
      return err;
  }
};

/**
 * Central error handling middleware.
 * Formats errors consistently, sanitizes internal errors in production,
 * and handles Postgres, JWT, and JSON syntax errors.
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // 1. Malformed JSON payload in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('Malformed JSON in request body', 400);
  }

  // 2. JWT token errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token', 401);
  } else if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token has expired. Please log in again.', 401);
  }

  // 3. PostgreSQL database errors
  if (err.code && typeof err.code === 'string') {
    error = handlePostgresError(err);
  }

  const statusCode = error.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    if (statusCode >= 500) {
      console.error(`[CRITICAL ERROR 500] ${error.message}`);
      console.error(error.stack || err.stack);
    } else {
      console.warn(`[Client Error ${statusCode}] ${error.message}`);
    }
  }

  // Final structured response
  res.status(statusCode).json({
    success: false,
    message: error.isOperational
      ? error.message
      : isDevelopment
      ? error.message || 'Internal Server Error'
      : 'Internal Server Error',
    ...(error.errors && { errors: error.errors }),
    ...(isDevelopment && { stack: error.stack || err.stack }),
  });
};

export default errorHandler;
