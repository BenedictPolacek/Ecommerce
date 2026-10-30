import { parseEnv } from '../../src/config/env.js';

const validSecret = 'a'.repeat(32);

describe('parseEnv', () => {
  it('applies defaults when only JWT_SECRET is set', () => {
    const config = parseEnv({ JWT_SECRET: validSecret });
    expect(config.port).toBe(5000);
    expect(config.nodeEnv).toBe('development');
    expect(config.isProduction).toBe(false);
    expect(config.db.port).toBe(5432);
    expect(config.bcrypt.saltRounds).toBe(10);
    expect(config.jwt.accessTokenTtlMinutes).toBe(15);
    expect(config.jwt.refreshTokenTtlDays).toBe(30);
  });

  it('rejects an access token lifetime above one hour', () => {
    expect(() => parseEnv({ JWT_SECRET: validSecret, ACCESS_TOKEN_TTL_MINUTES: '120' })).toThrow(
      /ACCESS_TOKEN_TTL_MINUTES/
    );
  });

  it('coerces numeric strings to numbers', () => {
    const config = parseEnv({ JWT_SECRET: validSecret, PORT: '8080', PGPORT: '5433' });
    expect(config.port).toBe(8080);
    expect(config.db.port).toBe(5433);
  });

  it('throws when JWT_SECRET is missing', () => {
    expect(() => parseEnv({})).toThrow('JWT_SECRET: JWT_SECRET is required');
  });

  it('rejects an invalid DATABASE_URL', () => {
    expect(() => parseEnv({ JWT_SECRET: validSecret, DATABASE_URL: 'not a url' })).toThrow(
      /DATABASE_URL/
    );
  });

  it('throws when JWT_SECRET is too short', () => {
    expect(() => parseEnv({ JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('treats empty values as unset', () => {
    expect(() => parseEnv({ JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
    expect(parseEnv({ JWT_SECRET: validSecret, DATABASE_URL: '' }).db.connectionString).toBe(
      undefined
    );
  });

  it('throws on invalid values', () => {
    expect(() => parseEnv({ JWT_SECRET: validSecret, NODE_ENV: 'prod' })).toThrow(/NODE_ENV/);
    expect(() => parseEnv({ JWT_SECRET: validSecret, PORT: 'abc' })).toThrow(/PORT/);
  });
});

describe('parseEnv security settings', () => {
  it('allows only APP_URL as CORS origin by default', () => {
    const config = parseEnv({ JWT_SECRET: validSecret, APP_URL: 'https://shop.example.com/' });
    expect(config.corsOrigins).toEqual(['https://shop.example.com']);
  });

  it('reads a comma-separated CORS_ORIGINS list', () => {
    const config = parseEnv({
      JWT_SECRET: validSecret,
      CORS_ORIGINS: 'http://localhost:3000, https://shop.example.com/',
    });
    expect(config.corsOrigins).toEqual(['http://localhost:3000', 'https://shop.example.com']);
  });

  it('rejects an invalid CORS origin', () => {
    expect(() => parseEnv({ JWT_SECRET: validSecret, CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
  });

  it('trusts no proxy and enables rate limiting by default', () => {
    const config = parseEnv({ JWT_SECRET: validSecret });
    expect(config.trustProxy).toBe(0);
    expect(config.rateLimitEnabled).toBe(true);
  });

  it('reads TRUST_PROXY and RATE_LIMIT_ENABLED', () => {
    const config = parseEnv({
      JWT_SECRET: validSecret,
      TRUST_PROXY: '1',
      RATE_LIMIT_ENABLED: 'false',
    });
    expect(config.trustProxy).toBe(1);
    expect(config.rateLimitEnabled).toBe(false);
  });
});

describe('parseEnv mail settings', () => {
  it('defaults to Mailpit and strips a trailing slash from APP_URL', () => {
    const config = parseEnv({ JWT_SECRET: validSecret, APP_URL: 'https://shop.example.com/' });
    expect(config.appUrl).toBe('https://shop.example.com');
    expect(config.mail.smtp).toMatchObject({ host: 'localhost', port: 1025, secure: false });
  });

  it('reads SMTP_SECURE=false as false (not as a truthy string)', () => {
    expect(parseEnv({ JWT_SECRET: validSecret, SMTP_SECURE: 'false' }).mail.smtp.secure).toBe(
      false
    );
    expect(parseEnv({ JWT_SECRET: validSecret, SMTP_SECURE: 'true' }).mail.smtp.secure).toBe(true);
  });
});
