import { CopyButton } from '@/components/CopyButton';
import { formatPrice } from '@/lib/format';
import { BANK_ACCOUNT, PAYMENT_DUE_DAYS } from '@/lib/shop-config';

interface BankTransferDetailsProps {
  amountCents: number;
  orderNumber: string;
}

/** What the customer needs for the bank transfer; the order number lets us match the payment */
export function BankTransferDetails({ amountCents, orderNumber }: BankTransferDetailsProps) {
  const details = [
    { label: 'Account holder', value: BANK_ACCOUNT.holder },
    { label: 'IBAN', value: BANK_ACCOUNT.iban, copy: true },
    { label: 'BIC', value: BANK_ACCOUNT.bic },
    { label: 'Amount', value: formatPrice(amountCents) },
    { label: 'Reference', value: orderNumber, copy: true },
  ];

  return (
    <section aria-labelledby="payment-title" className="flex flex-col gap-4 rounded-lg border p-6">
      <h2 id="payment-title" className="text-lg font-semibold">
        Please transfer {formatPrice(amountCents)}
      </h2>
      <p className="text-muted-foreground text-sm">
        Please pay within {PAYMENT_DUE_DAYS} days. We ship your order as soon as the payment has
        arrived.
      </p>
      <dl className="flex flex-col gap-1 text-sm">
        {details.map(({ label, value, copy }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="flex items-center gap-1 font-medium">
              {value}
              {copy && <CopyButton value={value.replaceAll(' ', '')} label={label} />}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-xs">
        Demo shop: these are example bank details, do not send real money.
      </p>
    </section>
  );
}
