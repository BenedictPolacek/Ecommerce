import { describe, expect, it } from 'vitest';
import { parseShopParams, shopSearch } from './shop-params';

describe('parseShopParams', () => {
  it('reads search, category and page from the URL', () => {
    expect(parseShopParams(new URLSearchParams('q=+shirt+&category=clothing&page=3'))).toEqual({
      q: 'shirt',
      category: 'clothing',
      page: 3,
    });
  });

  it.each(['', 'page=0', 'page=-2', 'page=abc', 'page=1.5'])('uses page 1 for "%s"', (query) => {
    expect(parseShopParams(new URLSearchParams(query)).page).toBe(1);
  });
});

describe('shopSearch', () => {
  const current = { q: 'shirt', category: 'clothing', page: 3 };

  it('keeps the filters when changing the page', () => {
    expect(shopSearch(current, { page: 4 })).toBe('?q=shirt&category=clothing&page=4');
  });

  it('goes back to page 1 when the search or category changes', () => {
    expect(shopSearch(current, { q: 'shoes' })).toBe('?q=shoes&category=clothing');
    expect(shopSearch(current, { category: 'books' })).toBe('?q=shirt&category=books');
  });

  it('leaves out empty values and page 1', () => {
    expect(shopSearch(current, { q: '', category: '' })).toBe('');
  });

  it('encodes user input', () => {
    expect(shopSearch({ q: '', category: '', page: 1 }, { q: 'r&b vinyl' })).toBe('?q=r%26b+vinyl');
  });
});
