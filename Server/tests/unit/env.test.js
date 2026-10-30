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
