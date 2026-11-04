import { ORDER_STATUS } from '@/features/orders/status';
import { formatDateTime } from '@/lib/format';
import type { AdminStatusChange } from '../types';

/** Status changes with internal notes, newest first (the API sends them oldest first) */
export function AdminOrderTimeline({ history }: { history: AdminStatusChange[] }) {
  return (
    <section aria-labelledby="timeline-title" className="flex flex-col gap-3">
      <h3 id="timeline-title" className="text-lg font-semibold">
        History
      </h3>
      <ol className="flex flex-col gap-3 border-l pl-4 text-sm">
        {[...history].reverse().map((entry) => (
          <li key={entry.id} className="flex flex-col">
            <span className="font-medium">{ORDER_STATUS[entry.to_status].label}</span>
            <time dateTime={entry.created_at} className="text-muted-foreground">
              {formatDateTime(entry.created_at)}
            </time>
            {entry.note && <p className="bg-muted mt-1 rounded-md px-2 py-1">{entry.note}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
