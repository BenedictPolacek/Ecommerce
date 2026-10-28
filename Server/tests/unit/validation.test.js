import { registerSchema } from '../../src/modules/auth/auth.validation.js';
import { createAddressSchema } from '../../src/modules/addresses/address.validation.js';
import { createCategorySchema } from '../../src/modules/categories/category.validation.js';
import {
  createProductSchema,
  productQuerySchema,
  updateStockSchema,
} from '../../src/modules/products/product.validation.js';

const messagesFor = (schema, input) => schema.safeParse(input).error.issues.map((i) => i.message);

describe('custom error messages', () => {
  it('reports each missing registration field by name', () => {
    expect(messagesFor(registerSchema, {})).toEqual([
      'Email is required',
      'Password is required',
      'First name is required',
      'Last name is required',
    ]);
  });

  it('distinguishes a missing price from a price with the wrong type', () => {
    expect(messagesFor(createProductSchema, { name: 'Mouse' })).toEqual([
      'price_cents is required',
    ]);
    expect(messagesFor(createProductSchema, { name: 'Mouse', price_cents: '999' })).toEqual([
      'price_cents must be a number',
    ]);
    expect(
      messagesFor(createProductSchema, { name: 'Mouse', price_cents: 100, stock_quantity: '3' })
    ).toEqual(['Stock quantity must be a number']);
  });

  it('distinguishes a missing stock quantity from one with the wrong type', () => {
    expect(messagesFor(updateStockSchema, {})).toEqual(['stock_quantity is required']);
    expect(messagesFor(updateStockSchema, { stock_quantity: '5' })).toEqual([
      'Stock quantity must be a number',
    ]);
  });

  it('reports missing address and category fields', () => {
    expect(messagesFor(createAddressSchema, {})).toEqual([
      'address_line1 is required',
      'city is required',
      'postal_code is required',
      'country is required',
    ]);
    expect(messagesFor(createCategorySchema, {})).toEqual(['Category name is required']);
  });

  it('uses the custom message for invalid formats', () => {
    expect(messagesFor(registerSchema.pick({ email: true }), { email: 'nope' })).toEqual([
      'Please provide a valid email address',
    ]);
    expect(messagesFor(productQuerySchema, { category_id: 'nope' })).toEqual([
      'category_id must be a valid UUID',
    ]);
    expect(messagesFor(productQuerySchema, { is_active: 'yes' })).toEqual([
      'is_active must be "true" or "false"',
    ]);
  });
});

describe('transforms and defaults', () => {
  it('trims and lowercases the email before validating it', () => {
    const data = registerSchema.parse({
      email: '  Jane@Example.COM ',
      password: 'password123',
      first_name: 'Jane',
      last_name: 'Doe',
    });
    expect(data.email).toBe('jane@example.com');
  });

  it('defaults pagination to numbers, not strings', () => {
    expect(productQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20 });
    expect(productQuerySchema.parse({ page: '2', limit: '5' })).toMatchObject({
      page: 2,
      limit: 5,
    });
  });

  it('applies product defaults and only accepts whole cents', () => {
    expect(createProductSchema.parse({ name: 'Mouse', price_cents: 1999 })).toMatchObject({
      price_cents: 1999,
      stock_quantity: 0,
      is_active: true,
    });
    expect(messagesFor(createProductSchema, { name: 'Mouse', price_cents: 19.99 })).toEqual([
      'price_cents must be a whole number of cents',
    ]);
  });
});
