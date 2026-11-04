import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useStockMovements } from '../hooks';
import { formatStockChange, STOCK_REASON } from '../stock';

/** Every change of the stock, newest first; the balance works like a bank statement */
export function StockHistory({ productId }: { productId: string }) {
  // A section of the page, not the page itself: the page number is not kept in the URL
  const [page, setPage] = useState(1);
  const { data, isError, isPlaceholderData, refetch } = useStockMovements(productId, page);

  if (isError) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <p>The stock history could not be loaded.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!data) return <Skeleton className="h-32 w-full" />;

  if (data.movements.length === 0) {
    return <p className="text-muted-foreground text-sm">No stock movements yet.</p>;
  }

  const { totalPages } = data.pagination;

  return (
    <div className={cn('flex flex-col gap-3', isPlaceholderData && 'opacity-60')}>
      <Table aria-label="Stock history">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Change</TableHead>
            <TableHead className="text-right">Stock after</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell>{formatDateTime(movement.created_at)}</TableCell>
              <TableCell>
                {STOCK_REASON[movement.reason]}
                {movement.order_number && (
                  <>
                    {' '}
                    <Link
                      to={`/admin/orders/${movement.order_number}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {movement.order_number}
                    </Link>
                  </>
                )}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-medium',
                  movement.quantity > 0 ? 'text-green-700' : 'text-destructive'
                )}
              >
                {formatStockChange(movement.quantity)}
              </TableCell>
              <TableCell className="text-right">{movement.balance_after}</TableCell>
              <TableCell
                className="text-muted-foreground max-w-48 truncate"
                title={movement.note ?? undefined}
              >
                {movement.note ?? '–'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Newer
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Older
          </Button>
        </div>
      )}
    </div>
  );
}
