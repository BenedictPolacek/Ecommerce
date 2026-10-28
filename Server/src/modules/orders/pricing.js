import { config } from '../../config/env.js';

/**
 * Shipping is a flat fee, free from the threshold on (compared to the goods subtotal)
 */
export const calculateShippingCents = (
  subtotalCents,
  { shippingFeeCents, freeShippingThresholdCents } = config.pricing
) => (subtotalCents >= freeShippingThresholdCents ? 0 : shippingFeeCents);

/**
 * VAT contained in a gross amount: 119.00 € at 19 % contains 19.00 €.
 * gross × rate / (100 + rate), rounded half up to whole cents.
 */
export const calculateIncludedVatCents = (grossCents, vatRatePercent) =>
  Math.round((grossCents * vatRatePercent) / (100 + vatRatePercent));

/**
 * Order totals from the goods subtotal. All amounts are integer cents.
 * Prices include VAT (EU), so tax is the share contained in the total, not added on top.
 * Shipping also contains VAT, so tax is calculated on the whole total.
 */
export const calculateOrderTotals = (subtotalCents, pricing = config.pricing) => {
  const shippingFeeCents = calculateShippingCents(subtotalCents, pricing);
  const totalCents = subtotalCents + shippingFeeCents;

  return {
    subtotalCents,
    shippingFeeCents,
    totalCents,
    taxCents: calculateIncludedVatCents(totalCents, pricing.vatRatePercent),
    vatRatePercent: pricing.vatRatePercent,
  };
};
