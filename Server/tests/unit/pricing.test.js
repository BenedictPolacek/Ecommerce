import {
  calculateIncludedVatCents,
  calculateOrderTotals,
  calculateShippingCents,
} from '../../src/modules/orders/pricing.js';

// Explicit values, so the tests do not depend on .env
const pricing = { vatRatePercent: 19, shippingFeeCents: 499, freeShippingThresholdCents: 5000 };

describe('calculateShippingCents', () => {
  it('charges the flat fee below the threshold', () => {
    expect(calculateShippingCents(4999, pricing)).toBe(499);
  });

  it('is free exactly at the threshold', () => {
    expect(calculateShippingCents(5000, pricing)).toBe(0);
  });
});

describe('calculateIncludedVatCents', () => {
  it('extracts the VAT contained in a gross amount', () => {
    expect(calculateIncludedVatCents(11900, 19)).toBe(1900);
  });

  it('rounds to whole cents', () => {
    expect(calculateIncludedVatCents(2599, 19)).toBe(415); // 414.97
    expect(calculateIncludedVatCents(1999, 7)).toBe(131); // 130.78
  });

  it('is zero for a 0 % rate', () => {
    expect(calculateIncludedVatCents(1999, 0)).toBe(0);
  });
});

describe('calculateOrderTotals', () => {
  it('adds shipping to the total and calculates VAT on goods and shipping', () => {
    expect(calculateOrderTotals(2100, pricing)).toEqual({
      subtotalCents: 2100,
      shippingFeeCents: 499,
      totalCents: 2599,
      taxCents: 415,
      vatRatePercent: 19,
    });
  });

  it('only returns integers, so no float errors can occur', () => {
    const totals = calculateOrderTotals(333, pricing);
    expect(Object.values(totals).every(Number.isInteger)).toBe(true);
  });
});
