import pino from 'pino';
import { config } from './env.js';

// pino-pretty is a dev dependency: the production image does not have it, but scripts there may
// still run with NODE_ENV=development (seeding). Without it the logs simply stay JSON.
const prettyAvailable = () => {
  try {
    import.meta.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
};

const usePretty = config.nodeEnv === 'development' && prettyAvailable();

/**
 * One JSON object per line in production: log platforms (Render, Datadog, Loki) can filter by
 * field (level, reqId, statusCode) instead of searching free text. Readable colors in development.
 */
export const logger = pino({
  level: config.logLevel,
  base: { service: 'ecommerce-api', version: config.version },
  // "level":"warn" and an ISO time instead of numbers: readable in Render's log view too
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Last line of defense if someone logs a whole object that contains secrets
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'headers.cookie',
      'headers.authorization',
      '*.headers.cookie',
      '*.headers.authorization',
    ],
    censor: '[redacted]',
  },
  ...(usePretty && {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service,version' },
    },
  }),
});

export default logger;
