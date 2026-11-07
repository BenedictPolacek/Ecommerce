import { categories, products } from '../../src/db/seeders/data.js';
import { slugify } from '../../src/utils/slug.js';

// Catches typos in the hand-written sample data before they reach a database
describe('seed data', () => {
  const categorySlugs = categories.map((category) => category.slug);

  it('has unique SKUs, product slugs, category slugs and photos', () => {
    const unique = (values) => new Set(values).size === values.length;

    expect(unique(products.map((product) => product.sku))).toBe(true);
    expect(unique(products.map((product) => slugify(product.name)))).toBe(true);
    expect(unique(categorySlugs)).toBe(true);
    expect(unique(products.map((product) => product.photo.id))).toBe(true);
  });

  it('lists every parent category before its subcategories', () => {
    categories.forEach((category, index) => {
      if (!category.parent) return;
      expect(categorySlugs.slice(0, index)).toContain(category.parent);
    });
  });

  it('puts every product into a category without subcategories', () => {
    const parents = new Set(categories.map((category) => category.parent).filter(Boolean));

    for (const product of products) {
      expect(categorySlugs).toContain(product.category);
      expect(parents.has(product.category)).toBe(false);
    }
  });

  it('has sensible prices, stock and photo credits', () => {
    for (const product of products) {
      expect(Number.isInteger(product.price_cents) && product.price_cents > 0).toBe(true);
      expect(Number.isInteger(product.stock_quantity) && product.stock_quantity >= 0).toBe(true);
      expect(product.photo.id).toMatch(/^\d{10,13}-[0-9a-f]{12}$/);
      expect(product.photo.by).toBeTruthy();
    }
  });
});
