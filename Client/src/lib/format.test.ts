import { describe, expect, it } from 'vitest';
import { centsToAmount, formatPrice, parseAmountToCents, plural } from './format';

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

describe('parseAmountToCents', () => {
  it.each([
    ['19.99', 1999],
    ['19,99', 1999],
    ['19.9', 1990],
    ['19', 1900],
    [' 0.01 ', 1],
    // Float traps: 1.1 * 100 = 110.00000000000001, 19.99 * 100 = 1998.9999999999998
    ['1.10', 110],
  ])('%s -> %i cents', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '19.999', '-5', '1e3', '19.'])('rejects %j', (input) => {
    expect(parseAmountToCents(input)).toBeNull();
  });
});

describe('centsToAmount', () => {
  it('formats cents for an amount input', () => {
    expect(centsToAmount(1999)).toBe('19.99');
    expect(centsToAmount(500)).toBe('5.00');
  });
});
