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
    // No cookies, headers, bodies, query strings, IP addresses, user data, SQL parameters or
    // local variables (could hold passwords) in the reports. Must be set explicitly: since
    // v11, leaving dataCollection out collects all of them.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      genAI: { inputs: false, outputs: false },
      graphQL: { document: false, variables: false },
      stackFrameVariables: false,
    },
    // Error tracking only, no performance tracing (stays within the free plan)
    tracesSampleRate: 0,
  });
}
