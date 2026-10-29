import { ORDER_TRANSITIONS, canTransition } from '../../src/modules/orders/order-status.js';
import { orderStatusEnum } from '../../src/modules/orders/orders.validation.js';

describe('order status transitions', () => {
  it('covers every status of the enum', () => {
    expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual([...orderStatusEnum.options].sort());
  });

  it.each([
    ['pending', 'paid'],
    ['pending', 'cancelled'],
    ['paid', 'processing'],
    ['paid', 'cancelled'],
    ['processing', 'shipped'],
    ['shipped', 'delivered'],
    ['delivered', 'refunded'],
  ])('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ['pending', 'shipped'], // skipping payment
    ['pending', 'refunded'], // nothing to refund
    ['delivered', 'pending'], // going back
    ['shipped', 'cancelled'], // already on its way: refund instead
    ['cancelled', 'pending'], // final
    ['refunded', 'paid'], // final
    ['pending', 'pending'], // not a change
  ])('rejects %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(canTransition('lost', 'paid')).toBe(false);
  });
});
