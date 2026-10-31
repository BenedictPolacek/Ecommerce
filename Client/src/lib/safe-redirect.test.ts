import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it.each(['/account', '/account?tab=orders', '/products/abc#reviews'])('allows %s', (path) => {
    expect(safeRedirect(path)).toBe(path);
  });

  it.each([
    null,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'account',
  ])('falls back for %s', (target) => {
    expect(safeRedirect(target)).toBe('/');
  });
});
