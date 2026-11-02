import { countryName } from '../schemas';
import type { AddressFields } from '../types';

/** A postal address as it would appear on a letter */
export function AddressBlock({ address }: { address: AddressFields }) {
  return (
    <address className="text-sm not-italic">
      {address.address_line1}
      {address.address_line2 && (
        <>
          <br />
          {address.address_line2}
        </>
      )}
      <br />
      {address.postal_code} {address.city}
      {address.state && `, ${address.state}`}
      <br />
      {countryName(address.country)}
    </address>
  );
}
