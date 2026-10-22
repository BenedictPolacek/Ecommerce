/**
 * Custom application error class for operational errors with HTTP status codes.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    if (errors) {
      this.errors = errors;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
