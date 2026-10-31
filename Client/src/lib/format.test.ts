import { describe, expect, it } from 'vitest';
import { formatPrice, plural } from './format';

describe('formatPrice', () => {
  it.each([
    [0, '€0.00'],
    [1999, '€19.99'],
    [123456, '€1,234.56'],
  ])('%i cents -> %s', (cents, expected) => {
    expect(formatPrice(cents)).toBe(expected);
  });
});

describe('plural', () => {
  it.each([
    [0, '0 items'],
    [1, '1 item'],
    [2, '2 items'],
  ])('%i -> %s', (count, expected) => {
    expect(plural(count, 'item')).toBe(expected);
  });
});
