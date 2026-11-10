/**
 * Readable one-line reason for the database CLI scripts.
 * A failed connection often arrives as an AggregateError (one error per IP address tried)
 * with an empty message; the real reasons (ETIMEDOUT, ECONNREFUSED, ...) are inside.
 * @param {unknown} error
 * @returns {string}
 */
export function describeError(error) {
  if (!(error instanceof Error)) return String(error);

  const inner = error instanceof AggregateError ? error.errors.map(describeError) : [];
  const own = [error.code, error.message].filter(Boolean).join(' ');
  const parts = [own, ...new Set(inner)].filter(Boolean);
  return parts.join('; ') || error.name;
}
