// One place for number formatting, so the whole shop shows prices the same way
const LOCALE = 'en-IE';
const CURRENCY = 'EUR';

const priceFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });

/** Prices are stored as integer cents (no rounding errors); 1999 -> "€19.99" */
export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

/** "1 item", "3 items" (English plural with -s) */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
