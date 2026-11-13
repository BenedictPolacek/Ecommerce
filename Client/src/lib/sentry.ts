import * as Sentry from '@sentry/react';

/**
 * Error tracking for the browser. The DSN is baked in at build time (VITE_SENTRY_DSN, set by
 * CI for the production image). Without it (dev server, tests, local images) nothing is sent.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Same release name as the API: the commit the image was built from
    release: import.meta.env.VITE_GIT_SHA,
    // No cookies, IP addresses or user data in the reports
    sendDefaultPii: false,
    // Errors only, no performance tracing or session replays
    tracesSampleRate: 0,
  });
}

/** Reports an unexpected error (no-op when Sentry is not set up) */
export const reportError = (error: unknown) => Sentry.captureException(error);

/** For createRoot: errors that no error boundary caught */
export const reactErrorHandler = Sentry.reactErrorHandler;
