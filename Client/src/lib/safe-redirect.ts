/**
 * Returns the redirect target only if it is a path inside this app, otherwise the fallback.
 * Prevents open redirects like /login?redirect=https://evil.example after a real login.
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target || !target.startsWith('/')) return fallback;
  // "//evil.example" and "/\evil.example" are protocol-relative URLs to another host
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback;
  return target;
}
