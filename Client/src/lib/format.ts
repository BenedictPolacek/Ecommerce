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

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** ISO timestamp from the API -> "2 Nov 2026" (in the browser's time zone) */
export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));

/** ISO timestamp from the API -> "2 Nov 2026, 14:05" */
export const formatDateTime = (iso: string) => dateTimeFormatter.format(new Date(iso));

/**
 * Amount typed by a person -> integer cents, or null if it is not a valid amount.
 * "19.99", "19,99", "19.9" and "19" are accepted. Computed from the digits, not with
 * floats: 19.99 * 100 is 1998.9999999999998 in JavaScript.
 */
export function parseAmountToCents(input: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const [, euros, cents = ''] = match;
  return Number(euros) * 100 + Number(cents.padEnd(2, '0'));
}

/** 1999 -> "19.99" (for prefilling amount inputs, without currency sign) */
export const centsToAmount = (cents: number) => (cents / 100).toFixed(2);
