import dotenv from 'dotenv';
import { z } from 'zod';

// quiet: dotenv 17+ logs a line on every start otherwise
dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  DATABASE_URL: z.string().url().optional(),
  PGHOST: z.string().default('localhost'),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGDATABASE: z.string().default('ecommerce_db'),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string().default('postgres'),

  // No fallback on purpose: a guessable secret would let anyone forge tokens
  JWT_SECRET: z.string({ required_error: 'JWT_SECRET is required' }).min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10),
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
  };
};

export const config = parseEnv(process.env);
