import dotenv from 'dotenv';
import { z } from 'zod';
import { requiredString } from '../utils/zod.js';

// Under Jest (NODE_ENV=test) .env.test is loaded first, so its values win over .env.
// Real environment variables (e.g. in CI) always win over both files.
const envFiles = process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : ['.env'];

// quiet: dotenv 17+ logs a line on every start otherwise
dotenv.config({ path: envFiles, quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  DATABASE_URL: z.url().optional(),
  PGHOST: z.string().default('localhost'),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGDATABASE: z.string().default('ecommerce_db'),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string().default('postgres'),

  // No fallback on purpose: a guessable secret would let anyone forge tokens
  JWT_SECRET: requiredString('JWT_SECRET is required').min(32),
  // Short-lived access token (JWT); the long-lived refresh token renews it
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  // Sliding: a session ends after this many days without a refresh
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10),

  // Frontend base URL; links in emails point there (e.g. /verify-email?token=...)
  APP_URL: z.url().default('http://localhost:3000'),

  // Browser origins allowed to call the API with cookies, comma-separated. Defaults to APP_URL.
  // Never "any origin": with credentials, every website could act as the logged-in user.
  CORS_ORIGINS: z
    .string()
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url()))
    .optional(),

  // Number of reverse proxies in front of the app (Render, Nginx, load balancer: usually 1).
  // Needed so req.ip is the client's IP from X-Forwarded-For, not the proxy's.
  // 0 = no proxy: the header is ignored, otherwise clients could fake their IP with it.
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),

  // Off in .env.test only: the test suites log in far more often than any real user
  RATE_LIMIT_ENABLED: z.enum(['true', 'false']).default('true'),

  // Outgoing email. Defaults match Mailpit from docker-compose.yml (catches all mails locally)
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  // z.coerce.boolean() would turn the string "false" into true
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('Ecommerce <no-reply@example.com>'),

  // Pricing. Amounts in cents; product prices include VAT (EU gross prices)
  VAT_RATE_PERCENT: z.coerce.number().int().min(0).max(100).default(19),
  SHIPPING_FEE_CENTS: z.coerce.number().int().min(0).default(499),
  FREE_SHIPPING_THRESHOLD_CENTS: z.coerce.number().int().min(0).default(5000),

  // Only used by `npm run db:seed`, which refuses to run in production
  SEED_ADMIN_EMAIL: z.email().default('admin@example.com'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('admin12345'),
});

/**
 * Validates raw environment variables and maps them to the app config.
 * Throws on invalid input so the app fails fast at startup.
 */
export const parseEnv = (rawEnv) => {
  // Treat empty values (e.g. `DATABASE_URL=`) as unset so defaults apply
  const cleaned = Object.fromEntries(Object.entries(rawEnv).filter(([, value]) => value !== ''));

  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  const env = result.data;
  const stripTrailingSlash = (url) => url.replace(/\/+$/, '');
  const appUrl = stripTrailingSlash(env.APP_URL);

  return {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    db: {
      connectionString: env.DATABASE_URL,
      host: env.PGHOST,
      port: env.PGPORT,
      database: env.PGDATABASE,
      user: env.PGUSER,
      password: env.PGPASSWORD,
    },
    jwt: {
      secret: env.JWT_SECRET,
      accessTokenTtlMinutes: env.ACCESS_TOKEN_TTL_MINUTES,
      refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    },
    bcrypt: {
      saltRounds: env.BCRYPT_SALT_ROUNDS,
    },
    appUrl,
    // The browser sends the Origin header without a trailing slash
    corsOrigins: env.CORS_ORIGINS?.map(stripTrailingSlash) ?? [appUrl],
    trustProxy: env.TRUST_PROXY,
    rateLimitEnabled: env.RATE_LIMIT_ENABLED === 'true',
    mail: {
      from: env.MAIL_FROM,
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE === 'true',
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
      },
    },
    pricing: {
      vatRatePercent: env.VAT_RATE_PERCENT,
      shippingFeeCents: env.SHIPPING_FEE_CENTS,
      freeShippingThresholdCents: env.FREE_SHIPPING_THRESHOLD_CENTS,
    },
    seed: {
      adminEmail: env.SEED_ADMIN_EMAIL,
      adminPassword: env.SEED_ADMIN_PASSWORD,
    },
  };
};

export const config = parseEnv(process.env);
