import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api-client';

/** User-facing text for any error thrown by the API client */
export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Could not reach the server. Please try again.';
}

/**
 * Shows an API error in a react-hook-form form: field errors from the server's validation
 * go to the matching inputs, everything else becomes the form-level error ("root.server").
 */
export function setServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[]
) {
  const fieldErrors =
    error instanceof ApiError
      ? (error.errors ?? []).filter((e) => fields.includes(e.field as Path<T>))
      : [];

  if (fieldErrors.length > 0) {
    for (const { field, message } of fieldErrors) {
      setError(field as Path<T>, { type: 'server', message });
    }
    return;
  }

  setError('root.server', { type: 'server', message: getErrorMessage(error) });
}
