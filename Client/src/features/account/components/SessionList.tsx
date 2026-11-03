import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDateTime } from '@/lib/format';
import { getErrorMessage } from '@/lib/form-errors';
import { describeUserAgent } from '@/lib/user-agent';
import { useRevokeSession, useSessions } from '../hooks';
import type { Session } from '../types';

function SessionRow({ session }: { session: Session }) {
  const revoke = useRevokeSession();
  const device = describeUserAgent(session.user_agent);
  const lastActive = formatDateTime(session.last_used_at);

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {device}
          {session.current && <Badge variant="secondary">This device</Badge>}
        </p>
        <p className="text-muted-foreground text-xs">
          Last active {lastActive} · Signed in {formatDate(session.created_at)}
        </p>
      </div>
      {/* This device logs out via the header (or "Log out everywhere") */}
      {!session.current && (
        <Button
          variant="outline"
          size="sm"
          disabled={revoke.isPending}
          // Two devices can have the same name: the time tells them apart
          aria-label={`Log out ${device}, last active ${lastActive}`}
          onClick={() =>
            revoke.mutate(session.id, {
              onSuccess: () => toast.success(`${device} has been logged out`),
              onError: (error) => toast.error(getErrorMessage(error)),
            })
          }
        >
          Log out
        </Button>
      )}
    </li>
  );
}

/** Devices that are logged in to this account */
export function SessionList() {
  const { data: sessions, isPending, isError, refetch } = useSessions();

  if (isPending) {
    return (
      <div className="flex flex-col gap-2" aria-label="Loading devices">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <p>Your devices could not be loaded.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y" aria-label="Logged-in devices">
      {sessions.map((session) => (
        <SessionRow key={session.id} session={session} />
      ))}
    </ul>
  );
}
