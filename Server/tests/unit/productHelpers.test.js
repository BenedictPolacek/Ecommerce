import { slugify } from '../../src/utils/slug.js';
import { toPrefixTsQuery } from '../../src/modules/products/product.repository.js';
import { nextFreeSlug } from '../../src/modules/products/product.service.js';

describe('slugify', () => {
  it.each([
    ['Mechanical Keyboard', 'mechanical-keyboard'],
    ['Café Crème', 'cafe-creme'],
    ['  Home & Kitchen  ', 'home-kitchen'],
    ['snake_case name', 'snake-case-name'],
    ['!!!', ''],
  ])('%p → %p', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('nextFreeSlug', () => {
  it('keeps the base when it is free', () => {
    expect(nextFreeSlug('t-shirt', [])).toBe('t-shirt');
  });

  it('appends the first free number', () => {
    expect(nextFreeSlug('t-shirt', ['t-shirt', 't-shirt-2'])).toBe('t-shirt-3');
  });

  it('fills gaps', () => {
    expect(nextFreeSlug('t-shirt', ['t-shirt', 't-shirt-3'])).toBe('t-shirt-2');
  });
});

describe('toPrefixTsQuery', () => {
  it('turns every word into a prefix term', () => {
    expect(toPrefixTsQuery('Mech keyb')).toBe('mech:* & keyb:*');
  });

  it('strips tsquery operators so user input cannot break the query', () => {
    expect(toPrefixTsQuery("keyboard & !mouse | 'x' :*")).toBe('keyboard:* & mouse:* & x:*');
  });

  it('returns null when nothing searchable is left', () => {
    expect(toPrefixTsQuery('!!! ---')).toBeNull();
  });
});
