/**
 * Bank account for prepayment orders. Demo values: the IBAN is the well-known example IBAN from
 * banking documentation, not a real account. In a real shop this would come from configuration.
 */
export const BANK_ACCOUNT = {
  holder: 'Ecommerce Demo Shop',
  iban: 'DE89 3704 0044 0532 0130 00',
  bic: 'COBADEFFXXX',
  bank: 'Demo Bank',
} as const;

/** Days the customer has to pay before an unpaid order may be cancelled */
export const PAYMENT_DUE_DAYS = 7;
