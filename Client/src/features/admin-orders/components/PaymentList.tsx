import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Payment } from '@/features/orders/types';
import { formatDateTime, formatPrice } from '@/lib/format';

export function PaymentList({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <p className="text-muted-foreground text-sm">No payments yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell>{formatDateTime(payment.created_at)}</TableCell>
            {/* bank_transfer -> "bank transfer" */}
            <TableCell>{payment.provider.replaceAll('_', ' ')}</TableCell>
            <TableCell>{payment.provider_payment_id ?? '–'}</TableCell>
            <TableCell>{payment.status}</TableCell>
            <TableCell className="text-right">{formatPrice(payment.amount_cents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
