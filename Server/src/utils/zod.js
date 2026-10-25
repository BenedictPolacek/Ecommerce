import { z } from 'zod';

// Zod 4 replaced `required_error` / `invalid_type_error` with a single `error` option.
// These helpers keep separate messages for "missing" and "wrong type".
// Returning undefined falls back to Zod's default message.

export const requiredString = (requiredMessage) =>
  z.string({ error: (issue) => (issue.input === undefined ? requiredMessage : undefined) });

export const requiredNumber = (requiredMessage, typeMessage) =>
  z.number({ error: (issue) => (issue.input === undefined ? requiredMessage : typeMessage) });
