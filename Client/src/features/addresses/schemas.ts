import { z } from 'zod';

/** Value of an address radio group for "enter a new address" (otherwise it is an address id) */
export const NEW_ADDRESS = 'new';

/** Countries the shop delivers to (ISO 3166-1 alpha-2) */
export const COUNTRIES = [
  { code: 'DE', name: 'Germany' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'PL', name: 'Poland' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
] as const;

export const countryName = (code: string) =>
  COUNTRIES.find((country) => country.code === code)?.name ?? code;

// Mirrors Server/src/modules/addresses/address.validation.js (UX only, the server decides)
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

export const addressSchema = z.object({
  address_line1: z.string().trim().min(1, 'Street and number are required').max(255),
  address_line2: optionalText(255),
  postal_code: z.string().trim().min(1, 'Postal code is required').max(20),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: optionalText(100),
  country: z.string().length(2, 'Please choose a country'),
});

/** What the form holds (strings) and what is sent (empty optional fields become null) */
export type AddressFormValues = z.input<typeof addressSchema>;
export type AddressInput = z.output<typeof addressSchema>;

export const emptyAddress: AddressFormValues = {
  address_line1: '',
  address_line2: '',
  postal_code: '',
  city: '',
  state: '',
  country: 'DE',
};
