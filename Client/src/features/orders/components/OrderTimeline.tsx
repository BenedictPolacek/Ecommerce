import { formatDateTime } from '@/lib/format';
import { ORDER_STATUS } from '../status';
import type { OrderStatusChange } from '../types';

/** Status changes, newest first (the API sends them oldest first) */
export function OrderTimeline({ history }: { history: OrderStatusChange[] }) {
  return (
    <section aria-labelledby="timeline-title" className="flex flex-col gap-3">
      <h2 id="timeline-title" className="text-lg font-semibold">
        History
      </h2>
      <ol className="flex flex-col gap-3 border-l pl-4 text-sm">
        {[...history].reverse().map((entry) => (
          <li key={`${entry.to_status}-${entry.created_at}`} className="flex flex-col">
            <span className="font-medium">{ORDER_STATUS[entry.to_status].label}</span>
            <time dateTime={entry.created_at} className="text-muted-foreground">
              {formatDateTime(entry.created_at)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
