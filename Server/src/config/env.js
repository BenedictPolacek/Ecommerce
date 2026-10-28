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
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10),

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
      expiresIn: env.JWT_EXPIRES_IN,
    },
    bcrypt: {
      saltRounds: env.BCRYPT_SALT_ROUNDS,
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
