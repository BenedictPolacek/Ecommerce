import { ZodError, z } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Middleware generator for Zod request validation.
 * Parses and sanitizes req.body, attaching validated data back to req.body.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 */

const handleZodError = (error, next) => {
  if (error instanceof ZodError) {
    const details = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return next(new AppError('Validation failed', 400, details));
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
  id: z.string().uuid('Invalid identifier format (must be a valid UUID)'),
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
