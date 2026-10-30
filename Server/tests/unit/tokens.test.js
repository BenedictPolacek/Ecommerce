import jwt from 'jsonwebtoken';
import { config } from '../../src/config/env.js';
import { generateRefreshToken, hashToken, signAccessToken } from '../../src/modules/auth/tokens.js';

describe('auth tokens', () => {
  it('generates unique, URL-safe refresh tokens with 256 bits', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes in base64url
  });

  it('hashes deterministically to 64 hex characters without containing the token', () => {
    const token = generateRefreshToken();

    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });

  it('puts user id, email and session id into the access token, but not the role', () => {
    const token = signAccessToken({ id: 'u1', email: 'a@b.de', role: 'admin' }, 's1');
    const decoded = jwt.verify(token, config.jwt.secret);

    expect(decoded).toMatchObject({ id: 'u1', email: 'a@b.de', sid: 's1' });
    expect(decoded).not.toHaveProperty('role');
    expect(decoded.exp - decoded.iat).toBe(config.jwt.accessTokenTtlMinutes * 60);
  });
});
