/** The fields of a postal address, as stored in the address book and copied into orders */
export interface AddressFields {
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  /** ISO 3166-1 alpha-2, e.g. "DE" */
  country: string;
}

/** Saved address of the logged-in user (GET /addresses) */
export interface Address extends AddressFields {
  id: string;
  user_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
