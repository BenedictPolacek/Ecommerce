import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger as defaultLogger } from '../config/logger.js';

// Accept an ID from a proxy or the client only if it is short and harmless (it ends up in logs)
const REQUEST_ID_PATTERN = /^[\w.:-]{1,128}$/;

// Path only: query strings can hold personal data (admin search by email) or one-time codes
// (OAuth callback)
const pathOf = (url = '') => url.split('?')[0];

const message = (req, res) => {
  // Set by the error handler for 4xx responses, so the reason is on the same line
  const reason = res.locals?.errorMessage;
  return `${req.method} ${pathOf(req.originalUrl)} ${res.statusCode}${reason ? ` - ${reason}` : ''}`;
};

/**
 * One log line per request with a request ID. The ID is sent back as X-Request-Id: a user or
 * the frontend can report it, and every log line of that request can be found with it.
 * Health checks are left out, the platform polls them every few seconds.
 */
export const createRequestLogger = (logger = defaultLogger) =>
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    autoLogging: { ignore: (req) => req.originalUrl.startsWith('/api/health') },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: message,
    customErrorMessage: message,
    // Raw objects in, small objects out: never headers (cookies, Authorization) or query strings.
    // req.ip respects TRUST_PROXY, so the log shows whether that setting is right.
    wrapSerializers: false,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        path: pathOf(req.originalUrl ?? req.url),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  });

export const requestLogger = createRequestLogger();

export default requestLogger;
