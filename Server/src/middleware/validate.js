import { ZodError, z } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Middleware generator for Zod request validation.
 * Parses and sanitizes req.body, attaching validated data back to req.body.
 *
 * @param {import('zod').ZodType} schema - Zod schema to validate against
 */

/**
 * Converts a ZodError into a 400 AppError with one entry per invalid field.
 */
export const toValidationError = (error) => {
  const details = error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  return new AppError('Validation failed', 400, details);
};

const handleZodError = (error, next) => {
  if (error instanceof ZodError) {
    return next(toValidationError(error));
  }
  next(error);
};

export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    handleZodError(error, next);
  }
};

export const validateParams = (schema) => (req, res, next) => {
  try {
    req.params = schema.parse(req.params);
    next();
  } catch (error) {
    handleZodError(error, next);
  }
};

const idParamSchema = z.object({
  id: z.uuid('Invalid identifier format (must be a valid UUID)'),
});

export const validateIdParam = (req, res, next) => {
  try {
    const parsed = idParamSchema.parse(req.params);
    req.idParam = parsed.id;
    next();
  } catch (error) {
    handleZodError(error, next);
  }
};

export default validate;
