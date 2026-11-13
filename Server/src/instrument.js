// Imported first in server.js, before anything else is loaded. Tests import app.js directly,
// so Sentry never runs under Jest.
import * as Sentry from '@sentry/node';
import { config } from './config/env.js';

// Without a DSN (local development, CI) nothing is sent
if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.nodeEnv,
    // The commit of the image: Sentry shows in which release an error first appeared
    release: config.version,
    // No cookies, headers, IP addresses or user data in the reports
    sendDefaultPii: false,
    // Error tracking only, no performance tracing (stays within the free plan)
    tracesSampleRate: 0,
  });
}
